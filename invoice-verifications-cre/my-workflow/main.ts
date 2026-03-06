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

  // 1. Time factor (0-30 days: +20 risk, 30-60: +10, 60+: +0)
  const now = BigInt(Math.floor(Date.now() / 1000))
  const daysUntilDue = Number((invoice.dueDate - now) / 86400n)
  
  if (daysUntilDue < 30) {
    score += 20
  } else if (daysUntilDue < 60) {
    score += 10
  }

  // 2. Invoice size factor (larger invoices = higher risk)
  // Convert faceValue from wei to ETH (divide by 10^18)
  const invoiceInEth = Number(invoice.faceValue) / 1e18
  
  if (invoiceInEth > 100) {
    score += 15
  } else if (invoiceInEth > 50) {
    score += 10
  } else if (invoiceInEth > 10) {
    score += 5
  }

  // 3. Market sentiment adjustment
  const priceChange = marketData.priceChange24h
  
  if (priceChange < -10) {
    // Major price drop = higher risk
    score += 15
  } else if (priceChange < -5) {
    // Moderate drop
    score += 10
  } else if (priceChange > 10) {
    // Major pump = also risky (bubble territory)
    score += 5
  } else if (priceChange > 5 && marketData.ethPrice > 4000) {
    // Healthy growth with high price = lower risk
    score -= 5
  }

  // 4. Price stability bonus
  if (marketData.ethPrice > 4000 && Math.abs(priceChange) < 3) {
    // High price + low volatility = bonus
    score -= 10
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score))

  runtime.log(`Risk calculation: Base=50, Days=${daysUntilDue}, Size=${invoiceInEth.toFixed(2)} ETH, Market=${priceChange.toFixed(2)}%, Final=${score}`)

  return BigInt(score)
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

  const callData = encodeFunctionData({
    abi: InvoiceNFT,
    functionName: "invoices",
    args: [tokenId],
  })

  const contractCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: runtime.config.invoiceNFTAddress as Address,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  const invoiceResult = decodeFunctionResult({
    abi: InvoiceNFT,
    functionName: "invoices",
    data: bytesToHex(contractCall.data),
  }) as [Address, string, bigint, bigint, bigint, boolean, boolean, bigint]

  const invoice: InvoiceData = {
    tokenId,
    issuer: invoiceResult[0],
    debtorName: invoiceResult[1],
    faceValue: invoiceResult[2],
    dueDate: invoiceResult[3],
    createdAt: invoiceResult[7],
  }

  runtime.log(`Invoice loaded - Debtor: ${invoice.debtorName}, Value: ${invoice.faceValue.toString()} wei, Due: ${invoice.dueDate.toString()}`)

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

  runtime.log(`Market consensus - ETH: $${marketData.ethPrice}, Change: ${marketData.priceChange24h.toFixed(2)}%`)

  const riskScore = calculateRiskScore(invoice, marketData, runtime)
  
  // Determine success based on risk score (score < 80 = success)
  const success = riskScore < 80n

  runtime.log(`Risk score calculated: ${riskScore}/100, Success: ${success}`)

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
