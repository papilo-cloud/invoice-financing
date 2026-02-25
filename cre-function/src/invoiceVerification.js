/**
 * Invoice Verification Function for Chainlink CRE
 * 
 * This code runs in the Chainlink Decentralized Oracle Network
 * and calculates a risk score for invoices.
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

// Cap score between 0 and 100
riskScore = Math.max(0, Math.min(100, riskScore));

console.log('=== Scoring Breakdown ===');
scoringDetails.forEach(detail => console.log('-', detail));
console.log('=== Final Risk Score:', riskScore, '===');

// ============================================
// Response Encoding
// ============================================

// Encode as uint256 for Solidity
// The CRE runtime provides Functions.encodeUint256()
// return Functions.encodeUint256(riskScore);


return Functions.encodeAbiParameters(
  ["bool", "uint256"],
  [true, riskScore]
);