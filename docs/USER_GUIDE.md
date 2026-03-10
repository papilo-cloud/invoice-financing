# InvoiceFlow User Guide

Complete guide to using the InvoiceFlow platform - from creating invoices to claiming returns.

---

## Table of Contents

- [Getting Started](#getting-started)
- [For Businesses (Issuers)](#for-businesses-issuers)
- [For Investors](#for-investors)
- [For Debtors](#for-debtors)
- [Testing & Simulation](#testing--simulation)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites
```bash
# Required
- MetaMask wallet
- Sepolia testnet ETH (get from faucet)
- Web browser (Chrome/Firefox/Brave)

# Optional (for simulation)
- Node.js 18+
- Bun runtime
- Git
```

### Get Testnet ETH
```bash
# Sepolia Faucets:
https://sepoliafaucet.com/
https://www.alchemy.com/faucets/ethereum-sepolia
https://cloud.google.com/application/web3/faucet/ethereum/sepolia
```

### Connect Wallet

1. Open InvoiceFlow: `https://invoice-financing-sdy1.vercel.app/`
2. Click "Connect Wallet"
3. Select MetaMask
4. Approve connection
5. Switch to Sepolia network if prompted

---

## For Businesses (Issuers)

### 1. Create an Invoice

**Step 1: Navigate to Create Invoice**
```
Dashboard → "Create Invoice" button
```

**Step 2: Fill Invoice Details**
```
Debtor Name: "Apple Inc" (or any company)
Face Value: 2.5 ETH (amount owed to you)
Due Date: Select date 30-90 days from now
```

**Step 3: Submit Transaction**
```
1. Click "Create Invoice"
2. MetaMask popup appears
3. Review gas fees (~$0.30)
4. Click "Confirm"
5. Wait for confirmation (~15 seconds)
```

**Step 4: Automatic Verification**
```
Your invoice is now being verified by Chainlink CRE!

What's happening:
✓ CRE detects your InvoiceCreated event
✓ Fetches ETH market data from CoinGecko
✓ Checks if debtor is a trusted company
✓ Calculates risk score (0-100)
✓ Writes verification on-chain

Time: ~30-60 seconds
```

**Step 5: Check Verification Status**
```
The UI will auto-update when verified:
- Green checkmark appears
- Risk score displays (e.g., "45/100 - AA Good")
- "Fractionalize" button becomes active
```

---

### 2. Fractionalize Invoice

**Prerequisites:**
- Invoice must be verified
- You must own the invoice NFT

**Step 1: Start Fractionalization**
```
Invoice Details → "Fractionalize Invoice" button
```

**Step 2: Configure Fractions**
```
Total Fractions: 100 (how many pieces to split into)
Price Per Fraction: 0.01 ETH (price investors pay per piece)

Example:
- 100 fractions × 0.01 ETH = 1 ETH total if all sell
- You keep unsold fractions
```

**Step 3: Approve NFT Transfer**
```
1. First transaction: Approve InvoiceNFT → Pool
2. MetaMask popup: Click "Confirm"
3. Wait for confirmation
```

**Step 4: Fractionalize**
```
1. Second transaction: Create fractions
2. MetaMask popup: Click "Confirm"
3. Wait for confirmation
4. Success! Invoice is now listed in marketplace
```

---

### 3. Withdraw Proceeds

**When investors buy your fractions, their payment is held for you.**

**Step 1: Check Pending Proceeds**
```
Dashboard → "Pending Proceeds" card
Shows: X.XX ETH available to withdraw
```

**Step 2: Withdraw**
```
1. Click "Withdraw Proceeds"
2. MetaMask popup
3. Confirm transaction
4. ETH sent to your wallet
```

---

### 4. Claim Returns (After Payment)

**When debtor pays the invoice, you can claim your share from unsold fractions.**

**Step 1: Check Claimable Returns**
```
Portfolio → Find your paid invoice
Status: "Paid" 
Claimable: X.XX ETH (your share of unsold fractions)
```

**Step 2: Claim**
```
1. Click "Claim Returns"
2. MetaMask popup
3. Confirm transaction
4. ETH received
```

**Example:**
```
Invoice: 10 ETH
Total Fractions: 100
Sold: 70 fractions
You kept: 30 fractions

Debtor pays: 10 ETH
Your share: 30/100 × 10 ETH = 3 ETH
```

---

## For Investors

### 1. Browse Marketplace

**Step 1: Navigate to Marketplace**
```
Navigation → "Marketplace"
```

**Step 2: View Available Listings**
```
Each listing shows:
- Debtor name
- Face value
- Risk score (0-100, lower = safer)
- Price per fraction
- Fractions available
- Due date
```

**Step 3: Filter/Search**
```
Search bar: Type debtor name (e.g., "Apple")
View only verified invoices with active fractions
```

---

### 2. Buy Fractions

**Step 1: Select Invoice**
```
Click on invoice card → "Invest" button
```

**Step 2: Choose Amount**
```
Fractions to Buy: 10 (or any amount)
Total Cost: Shown automatically (e.g., 0.1 ETH)

Calculate returns:
- If invoice is 5 ETH
- Total fractions: 100
- You buy: 10
- When paid: 10/100 × 5 ETH = 0.5 ETH return
```

**Step 3: Confirm Purchase**
```
1. Click "Buy Fractions"
2. MetaMask popup
3. Review total cost + gas
4. Confirm
5. Success! You own fractions
```

---

### 3. Track Investments

**View Portfolio**
```
Dashboard → "My Investments" tab

Shows:
- All invoices you've invested in
- Amount invested
- Expected returns
- Due dates
- Claim status
```

---

### 4. Claim Returns

**When Invoice is Paid:**

**Step 1: Check Claimable**
```
Portfolio → Paid invoices
Status: "Paid - Claimable"
Amount: X.XX ETH
```

**Step 2: Claim**
```
1. Click "Claim Payment"
2. MetaMask popup
3. Confirm transaction
4. Fractions burned, ETH received
```

**Example Return:**
```
Invested: 0.1 ETH (10 fractions)
Invoice paid: 5 ETH
Your return: 10/100 × 5 = 0.5 ETH
Profit: 0.5 - 0.1 = 0.4 ETH (400% return!)
```

---

## For Debtors

### Pay an Invoice

**When it's time to pay the invoice you owe:**

**Step 1: Find Invoice**
```
Get invoice ID from the business
Or search on platform
```

**Step 2: Pay Invoice**
```
Invoice Details → "Pay Invoice" button
Amount: Face value shown (e.g., 5 ETH)

1. Click "Pay Invoice"
2. MetaMask popup
3. Confirm payment
4. Done!
```

**What Happens Next:**
```
✓ Payment distributed automatically
✓ Investors can claim their shares
✓ Issuer can claim unsold fraction returns
✓ Invoice marked as "Paid"
```

---

## Testing & Simulation

### Local Simulation with --broadcast (For Judges/Developers)

**This demonstrates the CRE workflow execution with actual blockchain writes.**

#### Step 1: Setup
```bash
# Clone repository
git clone https://github.com/papilo-cloud/invoice-financing.git
cd invoice-financing

# Install dependencies
forge install
cd invoice-verifications-cre
bun install
```

#### Step 2: Configure Environment
```bash
# Set your private key
export PRIVATE_KEY=0xyour_private_key_here

# Set Sepolia RPC
export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

#### Step 3: Create Test Invoice
```bash
# Set contract addresses (from deployment)
export INVOICE_NFT=0xYourInvoiceNFTAddress

# Create an invoice
cast send $INVOICE_NFT \
  "createInvoice(string,uint256,uint256)" \
  "Apple Inc" \
  2000000000000000000 \
  $(($(date +%s) + 2592000)) \
  --private-key $PRIVATE_KEY \
  --rpc-url sepolia

# Note the transaction hash!
# Example: 0xabc123...
```

#### Step 4: Run CRE Simulation with Broadcast
```bash
cd invoice-verification-cre

# Simulate with actual blockchain write
cre workflow simulate . \
  --target staging-settings \
  --broadcast \
  --trigger-index 0 \
  --evm-tx-hash 0xYourTransactionHashFromStep3 \
  --evm-event-index 1

# This will:
# 1. Detect the InvoiceCreated event
# 2. Fetch market data from CoinGecko
# 3. Calculate risk score
# 4. ACTUALLY write verification to blockchain
# 5. Return real transaction hash
```

#### Step 5: Verify Results

**Expected Output:**
```bash
✓ Workflow compiled
✓ Found log event at index 1
✓ Event decoded successfully
  Token ID: 0
  Debtor: Apple Inc
  Face Value: 2.0 ETH
  
✓ Market data consensus reached
  ETH Price: $1,985.15
  24h Change: -3.77%
  
✓ Trusted company detected: Apple Inc
  Risk calculation breakdown:
  Base score: 50
  Trusted company: -20
  Due in 30d: +10
  Size 2.00 ETH: +0
  Market stable -3.8%: +0
  Final score: 40/100
  
✓ Risk assessment complete
  Risk Score: 40/100
  Rating: AAA (Excellent)
  Verification: APPROVED ✓
  
✓ Verification written to blockchain
  TX Hash: 0xdef456... (REAL TRANSACTION!)
  Etherscan: https://sepolia.etherscan.io/tx/0xdef456...
```

#### Step 6: Verify On-Chain
```bash
# Check if invoice is verified
VERIFIER=0xYourVerifierAddress
INVOICE_ID=1

cast call $VERIFIER "isVerified(uint256)" $INVOICE_ID --rpc-url sepolia
# Returns: true

# Get verification details
cast call $VERIFIER "getVerification(uint256)" $INVOICE_ID --rpc-url sepolia
# Returns: (riskScore: 40, isVerified: true, timestamp: ...)
```

#### Step 7: View on Frontend
```bash
# Start frontend
cd frontend
npm run dev

# Navigate to invoice details
# You should see:
# ✓ Verified by Chainlink
# Risk Score: 40/100
# Rating: AAA (Excellent)
```

---

## Understanding Risk Scores

### Score Ranges

| Score | Rating | Meaning |
|-------|--------|---------|
| 0-39 | AAA | Excellent - Very low risk |
| 40-59 | AA | Good - Low risk |
| 60-79 | A | Acceptable - Medium risk |
| 80-100 | High Risk | Rejected - Not eligible |

### Risk Factors

**Trusted Company (-20 points)**
```
Companies: Apple, Microsoft, Google, Amazon, etc.
Example: "Apple Inc" → -20 risk
```

**Time Until Due**
```
< 7 days: +20 (very urgent)
7-30 days: +15 (short-term)
30-60 days: +10 (medium-term)
60-90 days: +5 (long-term)
90+ days: +0 (very long-term)
```

**Invoice Size**
```
> 100 ETH: +15 (large)
50-100 ETH: +10 (medium-large)
10-50 ETH: +5 (medium)
< 10 ETH: +0 (small)
```

**Market Volatility**
```
< -10%: +15 (crash)
-5% to -10%: +10 (drop)
> +10%: +5 (bubble)
+5% to +10%: -5 (healthy growth)
Stable (±3%): -10 (bonus)
```

**Combined Bonus**
```
Trusted + Long-term + Small size: -10 extra
```

### Example Calculations

**Example 1: Apple, 5 ETH, 90 days**
```
Base: 50
Trusted (Apple): -20
Time (90 days): +0
Size (5 ETH): +0
Market (stable): -10
Bonus: -10
Final: 10/100 (AAA - Excellent)
```

**Example 2: Unknown, 100 ETH, 7 days**
```
Base: 50
Unknown company: +0
Time (7 days): +20
Size (100 ETH): +15
Market (volatile): +15
Final: 100/100 (High Risk - Rejected)
```

---

## Troubleshooting

### Invoice Not Verifying

**Problem:** Invoice stays "pending" for > 2 minutes

**Solutions:**
1. Check CRE workflow is deployed
2. Refresh page to check verification status

---

### Can't Buy Fractions

**Problem:** Transaction reverts when buying

**Check:**
1. Sufficient ETH in wallet?
2. Correct amount entered?
3. Fractions still available?
4. Invoice not paid yet?

**Solution:**
```javascript
// Check available fractions first
const info = await pool.getFractionInfo(fractionId);
console.log('Available:', info.totalFractions - info.fractionsSold);
```

---

### Can't Claim Payment

**Problem:** "Claim" button disabled

**Check:**
1. Invoice paid? (Status: "Paid")
2. You own fractions?
3. Haven't already claimed?

**Verify:**
```bash
# Check if paid
cast call $INVOICE_NFT "invoices(uint256)" 0 --rpc-url sepolia

# Check if you claimed
cast call $DISTRIBUTOR "hasClaimed(uint256,address)" 0 $YOUR_ADDRESS --rpc-url sepolia
```

---

## Support

- **Documentation:** [README.md](../README.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues:** [GitHub Issues](https://github.com/papilo-cloud/invoice-financing/issues)

---

**Happy invoicing!**