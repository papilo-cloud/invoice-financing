/**
 * Invoice Verification Function for Chainlink CRE
 * 
 * This code runs in the Chainlink Decentralized Oracle Network
 * and calculates a risk score for invoices.
 * 
 * EXTERNAL INTEGRATION: CoinGecko API for ETH market sentiment
 * 
 * 
 * @param {string[]} args - [invoiceId, debtorName, faceValue, dueDate]
 * @returns {Uint8Array} - Encoded risk score
 */

// ============================================
// Configuration
// ============================================

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
];

// ============================================
// External API Integration - CoinGecko
// ============================================

/**
 * EXTERNAL INTEGRATION: Fetch ETH market sentiment from CoinGecko
 */
async function getMarketSentiment() {
  try {
    console.log('Fetching market data from CoinGecko API...');
    
    const response = await Functions.makeHttpRequest({
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
      timeout: 9000,
    });

    if (response.error) {
      console.log('CoinGecko API error:', response.error);
      return { adjustment: 0, reason: 'API unavailable' };
    }

    const data = response.data;
    const ethPrice = data.ethereum?.usd || 0;
    const ethChange24h = data.ethereum?.usd_24h_change || 0;
    const marketCap = data.ethereum?.usd_market_cap || 0;

    console.log('Market data received:');
    console.log('  - ETH Price: $', ethPrice.toFixed(2));
    console.log('  - 24h Change:', ethChange24h.toFixed(2), '%');
    console.log('  - Market Cap: $', (marketCap / 1e9).toFixed(2), 'B');

    // Calculate market sentiment adjustment
    let adjustment = 0;
    let reason = '';

    // Bull market = lower risk for crypto-based invoices
    if (ethChange24h > 10) {
      adjustment = 15;
      reason = 'Strong bull market (+15)';
    } else if (ethChange24h > 5) {
      adjustment = 10;
      reason = 'Bull market (+10)';
    } else if (ethChange24h > 2) {
      adjustment = 5;
      reason = 'Positive sentiment (+5)';
    }
    // Bear market = higher risk
    else if (ethChange24h < -10) {
      adjustment = -15;
      reason = 'Strong bear market (-15)';
    } else if (ethChange24h < -5) {
      adjustment = -10;
      reason = 'Bear market (-10)';
    } else if (ethChange24h < -2) {
      adjustment = -5;
      reason = 'Negative sentiment (-5)';
    } else {
      reason = 'Neutral market (0)';
    }

    // Additional: High ETH price = more stable market
    if (ethPrice > 4000) {
      adjustment += 5;
      reason += ', High price stability (+5)';
    }

    console.log('Market sentiment adjustment:', adjustment);
    console.log('Reason:', reason);

    return { adjustment, reason, ethPrice, ethChange24h };
  } catch (error) {
    console.error('Error fetching market data:', error);
    return { adjustment: 0, reason: 'API call failed' };
  }
}

// ============================================
// Main Handler
// ============================================

// Extract arguments
const invoiceId = args[0];
const debtorName = args[1];
const faceValue = args[2];
const dueDate = args[3];

console.log('=== Invoice Verification Started ===');
console.log('Invoice ID:', invoiceId);
console.log('Debtor:', debtorName);
console.log('Face Value:', faceValue, 'wei');
console.log('Due Date:', dueDate);

// ============================================
// Risk Score Calculation
// ============================================

let riskScore = 50; // Start with neutral score
const scoringDetails = [];

// Factor 1: Debtor Reputation
const normalizedName = debtorName.toUpperCase().trim();
const isTrusted = TRUSTED_COMPANIES.some(company =>
  normalizedName.includes(company)
);

if (isTrusted) {
  riskScore += 30;
  scoringDetails.push('Trusted company: +30');
  console.log('Trusted company detected: +30 points');
} else {
  scoringDetails.push('Unknown company: 0');
  console.log('Unknown company: no bonus');
}

// Factor 2: Invoice Value Analysis
const valueInWei = BigInt(faceValue);
const valueInEth = Number(valueInWei) / 1e18;

console.log('Invoice amount:', valueInEth.toFixed(4), 'ETH');

if (valueInEth < 0.1) {
  riskScore -= 10;
  scoringDetails.push('Very small amount: -10');
  console.log('Suspiciously small amount: -10 points');
} else if (valueInEth >= 100 && valueInEth <= 100000) {
  riskScore += 10;
  scoringDetails.push('Reasonable amount: +10');
  console.log('Reasonable invoice amount: +10 points');
} else if (valueInEth > 1000000) {
  riskScore -= 10;
  scoringDetails.push('Extremely large: -10');
  console.log('Extremely large amount: -10 points');
} else {
  scoringDetails.push('Standard amount: 0');
}

// Factor 3: Due Date Analysis
const now = Math.floor(Date.now() / 1000);
const dueDateTimestamp = parseInt(dueDate);
const daysUntilDue = Math.floor((dueDateTimestamp - now) / 86400);

console.log('Days until due:', daysUntilDue);

if (daysUntilDue < 0) {
  riskScore -= 50;
  scoringDetails.push('Already overdue: -50');
  console.log('Invoice is overdue: -50 points');
} else if (daysUntilDue < 7) {
  riskScore -= 20;
  scoringDetails.push('Due very soon (<7 days): -20');
  console.log('Due in less than 7 days: -20 points');
} else if (daysUntilDue >= 30 && daysUntilDue <= 90) {
  riskScore += 15;
  scoringDetails.push('Optimal timeframe (30-90 days): +15');
  console.log('Optimal payment timeframe: +15 points');
} else if (daysUntilDue > 365) {
  riskScore -= 10;
  scoringDetails.push('Too far in future (>1 year): -10');
  console.log('Due date more than 1 year away: -10 points');
} else {
  scoringDetails.push('Standard timeframe: 0');
}

// Factor 4: Value-to-Time Ratio (velocity check)
if (daysUntilDue > 0) {
  const annualizedValue = valueInEth * (365 / daysUntilDue);
  if (annualizedValue > 10000000) {
    riskScore -= 5;
    scoringDetails.push('High velocity transaction: -5');
    console.log('High velocity transaction: -5 points');
  }
}

// ============================================
// Factor 5: EXTERNAL INTEGRATION - Market Sentiment
// ============================================

console.log('');
console.log('=== External API Integration ===');
const marketData = await getMarketSentiment();
riskScore += marketData.adjustment;
scoringDetails.push(`Market sentiment adjustment: ${marketData.adjustment > 0 ? '+' : ''}${marketData.adjustment} (${marketData.reason})`);

if (marketData.ethPrice) {
  console.log('External data successfully integrated into risk calculation');
}

// ============================================
// Final Score Calculation
// ============================================

// Cap score between 0 and 100
riskScore = Math.max(0, Math.min(100, riskScore));

console.log('=== Scoring Breakdown ===');
scoringDetails.forEach(detail => console.log('-', detail));
console.log('=== Final Risk Score:', riskScore, '===');


// ============================================
// Response Encoding - ABI encode (bool, uint256)
// ============================================

/**
 * ABI encode (bool, uint256) for Solidity
 * Solidity expects: abi.decode(response, (bool, uint256))
 */
function encodeResponse(success, riskScore) {
  const buffer = new Uint8Array(64);
  
  // First 32 bytes: bool (true = 1, false = 0)
  buffer[31] = success ? 1 : 0;
  
  // Next 32 bytes: uint256 (risk score)
  const score = BigInt(riskScore);
  for (let i = 0; i < 32; i++) {
    buffer[63 - i] = Number((score >> BigInt(i * 8)) & BigInt(0xff));
  }
  
  return buffer;
}
console.log('Encoding response: success=true, riskScore=', riskScore);
return encodeResponse(true, riskScore);