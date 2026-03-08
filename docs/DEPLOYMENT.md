# InvoiceFlow Deployment Guide

Complete guide for deploying the Invoice Financing Platform to Sepolia testnet.

## Prerequisites

### Required Tools
```bash
# 1. Foundry (for smart contracts)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 2. Bun (for CRE workflow)
curl -fsSL https://bun.sh/install | bash

# 3. Node.js 18+ (for frontend)
# Download from https://nodejs.org/

# 4. MetaMask or compatible Web3 wallet
```

### Required Accounts
- Ethereum wallet with Sepolia ETH
- [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/) API key
- [Etherscan](https://etherscan.io/apis) API key (for verification)

### Get Testnet ETH
```bash
# Sepolia faucets:
# https://sepoliafaucet.com/
# https://www.alchemy.com/faucets/ethereum-sepolia
# https://cloud.google.com/application/web3/faucet/ethereum/sepolia
```
---

## Step 1: Setup Development Environment

### Clone Repository
```bash
git clone https://github.com/papilo-cloud/invoice-financing
cd invoice-financing
```

### Install Dependencies
```bash
# Install Foundry dependencies
forge install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install CRE dependencies
cd invoice-verifications-cre
bun install
cd ..
```

---

## Step 2: Configure Environment

### Create `.env` File
```bash
# In project root
cp .env.example .env
```

### Edit `.env`:
```bash
# Your wallet private key (KEEP SECRET!)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Sepolia RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Etherscan API key (for contract verification)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

**SECURITY WARNING:** Never commit `.env` to Git!

---
## Step 3: Deploy Smart Contracts

### 3.1 Review Deployment Script

```bash
# Check script/Deploy.s.sol
# Verify forwarder addresses are correct
```

**For Testing:**
```solidity
bool constant USE_PRODUCTION_FORWARDER = false; // MockForwarder
```

**For Production:**
```solidity
bool constant USE_PRODUCTION_FORWARDER = true; // KeystoneForwarder
```

### 3.2 Deploy Contracts

```bash
# Dry run (simulation)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia

# Deploy with verification
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Wait for deployment...
```

### 3.3 Save Contract Addresses

The script automatically creates `deployments/sepolia.env`:

```bash
# deployments/sepolia.env
VITE_INVOICE_NFT_ADDRESS=0x...
VITE_INVOICE_VERIFIER_ADDRESS=0x...
VITE_FRACTIONALIZATION_POOL_ADDRESS=0x...
VITE_PAYMENT_DISTRIBUTOR_ADDRESS=0x...
```

### 3.4 Verify Deployment

```bash
# Check InvoiceNFT
cast call $INVOICE_NFT "owner()" --rpc-url sepolia

# Check InvoiceVerifier forwarder
cast call $VERIFIER "getForwarderAddress()" --rpc-url sepolia

# Expected (MockForwarder):
# 0x15fC6ae953E024d975e77382eEeC56A9101f9F88

# Or (KeystoneForwarder for production):
# 0xF8344CFd5c43616a4366C34E3EEE75af79a74482
```

## Step 4: Configure CRE Workflow

### 4.1 Update CRE Config

```bash
cd invoice-verifications-cre

# Edit config.staging.json
nano config.staging.json
```

```json
{
  "chainSelectorName": "ethereum-testnet-sepolia",
  "invoiceNFTAddress": "0xYourDeployedInvoiceNFT",
  "invoiceVerifierAddress": "0xYourDeployedInvoiceVerifier",
  "coinGeckoApiUrl": "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true",
  "gasLimit": "500000"
}
```

### 4.2 Test Workflow Locally

```bash
# Simulate without blockchain
cre workflow simulate my-workflow --target staging-settings

# If successful, you should see:
# Workflow compiled
# Risk calculation working
# Report generation successful
```


## Step 5: Configure Frontend

### 5.1 Copy Environment Variables

```bash
cd frontend

# Copy from deployment
cp ../deployments/sepolia.env .env
```

### 5.2 Verify .env

```bash
# frontend/.env
VITE_INVOICE_NFT_ADDRESS=0x...
VITE_INVOICE_VERIFIER_ADDRESS=0x...
VITE_FRACTIONALIZATION_POOL_ADDRESS=0x...
VITE_PAYMENT_DISTRIBUTOR_ADDRESS=0x...
VITE_CHAIN_ID=11155111
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### 5.3 Update Contract ABIs

The frontend uses the ABIs from `frontend/src/constants/abis.js`. These should already be updated, but verify:

```bash
# Check ABI file exists and has all functions
cat frontend/src/constants/abis.js
```

## Step 6: Deploy Frontend

### 6.1 Build Frontend

```bash
cd frontend

# Build for production
npm run build

# Test build locally
npm run preview
```

### 6.2 Deploy to Vercel or Netlify

## Step 7: Testing End-to-End

### 7.1 Test Invoice Creation

```bash
# Connect MetaMask to frontend
# Create a test invoice

# Or via CLI:
INVOICE_NFT=0x...

cast send $INVOICE_NFT \
  "createInvoice(string,uint256,uint256)" \
  "Apple Inc" \
  1000000000000000000 \
  $(($(date +%s) + 2592000)) \
  --private-key $PRIVATE_KEY \
  --rpc-url sepolia
```

### 7.2 Test CRE Verification

```bash
# Get the transaction hash from step 7.1
TX_HASH=0x...

# Simulate CRE workflow with broadcast
cd invoice-verification-cre

cre workflow simulate . \
  --target staging-settings \
  --broadcast \
  --trigger-index 0 \
  --evm-tx-hash $TX_HASH \
  --evm-event-index 1

# Check if verified:
cast call $VERIFIER "isVerified(uint256)" 1 --rpc-url sepolia
# Should return: true
```

## Step 8: Production Deployment

### 8.1 Switch to Production Forwarder

```bash
# Redeploy contracts with production forwarder
# In script/Deploy.s.sol:
bool constant USE_PRODUCTION_FORWARDER = true;

# Redeploy
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia \
  --broadcast \
  --verify
```

### 8.2 Add Security Validations

```bash
# Add workflow ID validation
cast send $VERIFIER \
  "setExpectedWorkflowId(bytes32)" \
  $WORKFLOW_ID \
  --private-key $PRIVATE_KEY \
  --rpc-url sepolia

# Add author validation
cast send $VERIFIER \
  "setExpectedAuthor(address)" \
  $YOUR_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url sepolia
```

## Step 9: Monitoring & Maintenance

### 9.1 Monitor Transactions

```bash
# Watch events
cast logs --from-block latest \
  --address $INVOICE_NFT \
  --rpc-url sepolia

# Check contract state
cast call $POOL "getNextFractionId()" --rpc-url sepolia
```