import {
  EVMClient,
  HTTPClient,
  handler,
  getNetwork,
  encodeCallMsg,
  bytesToHex,
  hexToBase64,
  LAST_FINALIZED_BLOCK_NUMBER,
  consensusMedianAggregation,
  type Runtime,
  type EVMLog,
  type NodeRuntime,
  Runner,
} from "@chainlink/cre-sdk"

import {
  encodeFunctionData,
  decodeFunctionResult,
  decodeEventLog,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toBytes,
  zeroAddress,
  type Address,
} from "viem"
import { z } from "zod"
import { InvoiceNFT, InvoiceVerifier } from "../contracts/abi"

// ============================================================================
// CONSTANTS
// ============================================================================

const TRUSTED_COMPANIES = [
  'APPLE',
  'MICROSOFT',
  'GOOGLE',
  'ALPHABET',
  'AMAZON',
  'META',
  'FACEBOOK',
  'TESLA',
  'NVIDIA',
  'JPMORGAN',
  'VISA',
  'MASTERCARD',
  'WALMART',
  'COCA-COLA',
  'PEPSI',
  'NETFLIX',
  'ADOBE',
  'ORACLE',
  'SALESFORCE',
  'IBM',
  'CISCO',
  'INTEL',
  'BERKSHIRE',
  'JOHNSON',
  'EXXON',
  'CHEVRON',
  'PFIZER',
  'MERCK',
  'ABBVIE',
  'BOEING',
  'CATERPILLAR',
  'GOLDMAN',
  'MORGAN STANLEY',
  'BANK OF AMERICA',
  'WELLS FARGO',
  'CITIGROUP',
] as const

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

const configSchema = z.object({
  schedule: z.string(),
  chainSelectorName: z.string(),
  invoiceNFTAddress: z.string(),
  invoiceVerifierAddress: z.string(),
  coinGeckoApiUrl: z.string(),
  gasLimit: z.string(),
})

type Config = z.infer<typeof configSchema>

type InvoiceData = {
  tokenId: bigint
  issuer: string
  debtorName: string
  faceValue: bigint
  dueDate: bigint
  createdAt: bigint
}

type MarketData = {
  ethPrice: number
  priceChange24h: number
}

type VerificationResult = {
  tokenId: bigint
  riskScore: bigint
  success: boolean
  txHash: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if debtor name matches a trusted company
 * Returns true if the debtor name contains any trusted company name
 */
function isTrustedCompany(debtorName: string): boolean {
  const upperDebtorName = debtorName.toUpperCase()
  
  return TRUSTED_COMPANIES.some(company => 
    upperDebtorName.includes(company)
  )
}

// ============================================================================
// MARKET DATA FETCHING (Node-level, with consensus)
// ============================================================================

/**
 * Fetches ETH market data from CoinGecko API
 * Runs on each node, results aggregated via median consensus
 */
const fetchMarketData = (nodeRuntime: NodeRuntime<Config>): MarketData => {
  const httpClient = new HTTPClient()

  const req = {
    url: nodeRuntime.config.coinGeckoApiUrl,
    method: "GET" as const,
    headers: {
      "Accept": "application/json",
    },
  }

  nodeRuntime.log("Fetching CoinGecko market data...")
  
  const resp = httpClient.sendRequest(nodeRuntime, req).result()

  if (resp.statusCode !== 200) {
    throw new Error(`CoinGecko API returned status ${resp.statusCode}`)
  }

  const bodyText = new TextDecoder().decode(resp.body)
  const data = JSON.parse(bodyText)

  // CoinGecko response format: { ethereum: { usd: 2500, usd_24h_change: 5.2 } }
  const ethPrice = data.ethereum?.usd || 0
  const priceChange24h = data.ethereum?.usd_24h_change || 0

  nodeRuntime.log(`Market data fetched - Price: $${ethPrice}, 24h change: ${priceChange24h.toFixed(2)}%`)

  return {
    ethPrice,
    priceChange24h,
  }
}

// ============================================================================
// RISK CALCULATION
// ============================================================================

/**
 * Calculates risk score based on invoice data and market conditions
 * Base score: 50
 * Adjustments:
 * - Time until due date (more time = lower risk)
 * - Invoice size (larger = higher risk)
 * - Market volatility (high volatility = higher risk)
 */
function calculateRiskScore(
  invoice: InvoiceData,
  marketData: MarketData,
  runtime: Runtime<Config>
): bigint {
  let score = 50 // Base score
    const adjustments: string[] = []

  // 1. TRUSTED COMPANY CHECK (Major reduction)

  const isTrusted = isTrustedCompany(invoice.debtorName)
  
  if (isTrusted) {
    score -= 20
    adjustments.push(`Trusted company: -20`)
    runtime.log(` Trusted company detected: ${invoice.debtorName}`)
  } else {
    adjustments.push(`Unknown company: +0`)
  }

  // 2. Time factor (0-30 days: +20 risk, 30-60: +10, 60+: +0)
  const now = BigInt(Math.floor(Date.now() / 1000))
  const daysUntilDue = Number((invoice.dueDate - now) / 86400n)
  
  if (daysUntilDue < 0) {
    // Already overdue - maximum risk
    score += 30
    adjustments.push(`Overdue: +30`)
  } else if (daysUntilDue < 7) {
    // Less than a week - high risk
    score += 20
    adjustments.push(`Due in ${daysUntilDue}d: +20`)
  } else if (daysUntilDue < 30) {
    // Less than a month - medium risk
    score += 15
    adjustments.push(`Due in ${daysUntilDue}d: +15`)
  } else if (daysUntilDue < 60) {
    score += 10
    adjustments.push(`Due in ${daysUntilDue}d: +10`)
  } else if (daysUntilDue < 90) {
    // 60-90 days - low risk
    score += 5
    adjustments.push(`Due in ${daysUntilDue}d: +5`)
  } else {
    // 90+ days - very low risk
    adjustments.push(`Due in ${daysUntilDue}d: +0`)
  }

  // 3. Invoice size factor (larger invoices = higher risk)
  // Convert faceValue from wei to ETH (divide by 10^18)
  const invoiceInEth = Number(invoice.faceValue) / 1e18
  
  if (invoiceInEth > 100) {
    score += 15
    adjustments.push(`Size ${invoiceInEth.toFixed(2)} ETH: +15`)
  } else if (invoiceInEth > 50) {
    score += 10
    adjustments.push(`Size ${invoiceInEth.toFixed(2)} ETH: +10`)
  } else if (invoiceInEth > 10) {
    score += 5
    adjustments.push(`Size ${invoiceInEth.toFixed(2)} ETH: +5`)
  } else {
    adjustments.push(`Size ${invoiceInEth.toFixed(2)} ETH: +0`)
  }

  // 4. Market sentiment adjustment
  const priceChange = marketData.priceChange24h
  
  if (priceChange < -10) {
    // Major price drop = higher risk
    score += 15
    adjustments.push(`Market crash ${priceChange.toFixed(1)}%: +15`)
  } else if (priceChange < -5) {
    // Moderate drop
    score += 10
    adjustments.push(`Market down ${priceChange.toFixed(1)}%: +10`)
  } else if (priceChange > 10) {
    // Major pump = also risky (bubble territory)
    score += 5
    adjustments.push(`Market surge ${priceChange.toFixed(1)}%: +5`)
  } else if (priceChange > 5 && marketData.ethPrice > 3000) {
    // Healthy growth with high price = lower risk
    score -= 5
    adjustments.push(`Market growth ${priceChange.toFixed(1)}%: -5`)
  } else {
    adjustments.push(`Market stable ${priceChange.toFixed(1)}%: +0`)
  }

  // 5. Price stability bonus
  if (marketData.ethPrice > 4000 && Math.abs(priceChange) < 3) {
    // High price + low volatility = bonus
    score -= 10
    adjustments.push(`Stable market: -10`)
  }

  // 6. COMBINED TRUSTED + STABLE BONUS

  if (isTrusted && daysUntilDue > 60 && invoiceInEth < 50) {
    // Trusted company + long term + reasonable size = extra bonus
    score -= 10
    adjustments.push(`Premium conditions: -10`)
  }

  // Ensure score is between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score))

  runtime.log(`Risk calculation breakdown:`)
  runtime.log(`  Base score: 50`)
  adjustments.forEach(adj => runtime.log(`  ${adj}`))
  runtime.log(`  Final score: ${finalScore}/100`)

  return BigInt(finalScore)
}

// ============================================================================
// MAIN TRIGGER HANDLER
// ============================================================================

/**
 * Main handler triggered when InvoiceCreated event is emitted
 */
const onInvoiceCreated = (runtime: Runtime<Config>, log: EVMLog): VerificationResult => {
  runtime.log("=== Invoice Verification Workflow Started ===")

  // Get network configuration
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const topics = log.topics.map((topic) => bytesToHex(topic)) as [`0x${string}`, ...`0x${string}`[]]
  const data = bytesToHex(log.data)

  const decodedEvent = decodeEventLog({
    abi: InvoiceNFT,
    data,
    topics,
  })

  if (decodedEvent.eventName !== "InvoiceCreated") {
    throw new Error(`Unexpected event: ${decodedEvent.eventName}`)
  }

  const { tokenId, issuer, debtorName, faceValue, dueDate } = decodedEvent.args

  runtime.log(`Decoded event - TokenId: ${tokenId}, Debtor: ${debtorName}, Amount: ${faceValue.toString()} wei`)

  const invoice: InvoiceData = {
    tokenId,
    issuer: issuer as Address,
    debtorName,
    faceValue,
    dueDate,
    createdAt: BigInt(Math.floor(Date.now() / 1000))
  }

  const dueDate_readable = new Date(Number(invoice.dueDate) * 1000).toISOString();
  const daysUntilDue = Math.floor(Number((invoice.dueDate - BigInt(Math.floor(Date.now() / 1000))) / 86400n))

  // const callData = encodeFunctionData({
  //   abi: InvoiceNFT,
  //   functionName: "invoices",
  //   args: [tokenId],
  // })

  // const contractCall = evmClient
  //   .callContract(runtime, {
  //     call: encodeCallMsg({
  //       from: zeroAddress,
  //       to: runtime.config.invoiceNFTAddress as Address,
  //       data: callData,
  //     }),
  //     blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  //   })
  //   .result()

  // const invoiceResult = decodeFunctionResult({
  //   abi: InvoiceNFT,
  //   functionName: "invoices",
  //   data: bytesToHex(contractCall.data),
  // }) as [Address, string, bigint, bigint, bigint, boolean, boolean, bigint]

  // const invoice: InvoiceData = {
  //   tokenId,
  //   issuer: invoiceResult[0],
  //   debtorName: invoiceResult[1],
  //   faceValue: invoiceResult[2],
  //   dueDate: invoiceResult[3],
  //   createdAt: invoiceResult[7],
  // }

  runtime.log(`Invoice data prepared`)
  runtime.log(`Invoice loaded - Debtor: ${invoice.debtorName}, Value: ${invoice.faceValue.toString()} wei, Due: ${dueDate_readable}`)
  runtime.log(`  Days until due: ${daysUntilDue}`)

  runtime.log("\nSTEP 2: Fetching market data with node consensus...")

  const ethPriceConsensus = runtime
    .runInNodeMode(
      (nr) => fetchMarketData(nr).ethPrice,
      consensusMedianAggregation<number>()
    )()
    .result()

  const priceChange24hConsensus = runtime
    .runInNodeMode(
      (nr) => fetchMarketData(nr).priceChange24h,
      consensusMedianAggregation<number>()
    )()
    .result()

  const marketData: MarketData = {
    ethPrice: ethPriceConsensus,
    priceChange24h: priceChange24hConsensus,
  }

  runtime.log(`  Market data consensus reached`)
  runtime.log(`  ETH Price: $${marketData.ethPrice.toFixed(2)}`)
  runtime.log(`  24h Change: ${marketData.priceChange24h > 0 ? '+' : ''}${marketData.priceChange24h.toFixed(2)}%`)

  const riskScore = calculateRiskScore(invoice, marketData, runtime)
  
  // Determine success based on risk score (score < 80 = success)
  const success = riskScore < 80n

    const riskRating = 
    riskScore < 40n ? "AAA (Excellent)" :
    riskScore < 60n ? "AA (Good)" :
    riskScore < 80n ? "A (Acceptable)" :
    "High Risk (Rejected)"

  runtime.log(`  Risk assessment complete`)
  runtime.log(`  Risk Score: ${riskScore}/100`)
  runtime.log(`  Rating: ${riskRating}`)
  runtime.log(`  Verification: ${success ? 'APPROVED' : 'REJECTED'}`)


  // Encode the verification result for the consumer contract
  const reportData = encodeAbiParameters(
    parseAbiParameters("uint256 tokenId, uint256 riskScore, bool success"),
    [tokenId, riskScore, success]
  )

  runtime.log(`Writing verification to contract - TokenId: ${tokenId}, RiskScore: ${riskScore}, Success: ${success}`)

  // Generate signed report
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  // Submit report to verifier contract
  const writeReportResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.invoiceVerifierAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: runtime.config.gasLimit,
      },
    })
    .result()

  const txHash = bytesToHex(writeReportResult.txHash || new Uint8Array(32))

  runtime.log(`Verification complete! TxHash: ${txHash}`)
  runtime.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`)

  runtime.log("\n" + "=".repeat(60))
  runtime.log("WORKFLOW COMPLETE")
  runtime.log("=".repeat(60))
  
  return {
    tokenId,
    riskScore,
    success,
    txHash,
  }
}

// ============================================================================
// WORKFLOW INITIALIZATION
// ============================================================================

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // Calculate InvoiceCreated event signature
  const invoiceCreatedEventHash = keccak256(
    toBytes("InvoiceCreated(uint256,address,string,uint256,uint256)")
  )

  // Create EVM Log trigger for InvoiceCreated events
  const logTrigger = evmClient.logTrigger({
    addresses: [hexToBase64(config.invoiceNFTAddress)],
    topics: [
      { values: [hexToBase64(invoiceCreatedEventHash)] },
    ],
    confidence: "CONFIDENCE_LEVEL_FINALIZED",
  })

  return [handler(logTrigger, onInvoiceCreated)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configSchema,
  });
  await runner.run(initWorkflow);
}
