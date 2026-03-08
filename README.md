# InvoiceFlow

> Decentralized invoice financing platform powered by Chainlink and Ethereum

Transform unpaid invoices into liquid assets. Small businesses can fractionalize their invoices and get immediate cash flow, while investors earn predictable returns on short-term investments.


## Features

### For Business Owners
- **Instant Verification** - Chainlink CRE verifies invoices in ~30 seconds
- **Immediate Liquidity** - Get cash in hours, not weeks
- **Flexible Selling** - Choose how much of your invoice to sell (25%, 50%, 75%, etc.)
- **Transparent Pricing** - See exactly what you'll receive
- **Secure** - Smart contracts ensure automatic payment distribution

### For Investors
- **Predictable Returns** - Know exact payment dates (30-90 days)
- **Risk Assessment** - Chainlink-verified risk scores (0-100)
- **Fractional Investment** - Invest as little as 0.1 ETH
- **Diversification** - Spread investments across multiple invoices
- **Verified Debtors** - Invoices from trusted companies (Apple, Microsoft, etc.)

### For Platform
- **Automated Verification** - Chainlink CRE workflow handles all verification
- **Smart Contract Distribution** - No manual payment processing
- **Decentralized Oracle** - Market data from CoinGecko via Chainlink
- **Non-Custodial** - Platform never holds user funds

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                    (React + Vite + Ethers)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Smart Contracts                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ InvoiceNFT   │  │Verification  │  │Fractionalization│  │
│  │              │←→│  Pool        │←→│     Pool        │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│         ↑                  ↑                    ↓          │
│         │                  │          ┌─────────────────┐  │
│         │                  │          │    Payment      │  │
│         │                  │          │  Distributor    │  │
│         │                  │          └─────────────────┘  │
└─────────┼──────────────────┼─────────────────────────────┘
          │                  │
          │                  ↓
          │      ┌──────────────────────┐
          │      │  Chainlink CRE       │
          │      │  Verification        │
          │      │  Workflow            │
          │      └──────────────────────┘
          │                  │
          │                  ↓
          │      ┌──────────────────────┐
          └─────→│  Event: InvoiceCreated│
                 └──────────────────────┘
```

## Quick Start

### Prerequisites
```bash
# Required
- Node.js 18+
- Bun (for CRE workflow)
- Foundry (for smart contracts)
- MetaMask wallet
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/invoice-financing.git
cd invoice-financing

# 2. Install contract dependencies
forge install

# 3. Install frontend dependencies
cd frontend
npm install

# 4. Install CRE workflow dependencies
cd ../invoice-verification-cre
bun install
```

### Deploy Contracts

```bash
# Set environment variables
cp .env.example .env
# Edit .env with your keys

# Deploy to Sepolia
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia \
  --broadcast \
  --verify
```

### Deploy CRE Workflow

```bash
cd invoice-verification-cre

# Update config with deployed addresses
# Edit config.staging.json

# Deploy workflow
bun run deploy:staging
```

### Run Frontend

```bash
cd frontend

# Update .env with contract addresses

# Start dev server
npm run dev
```

##  Documentation

- [Architecture](./docs/ARCHITECTURE.md) - Technical design and contract specifications
- [Deployment](./docs/DEPLOYMENT.md) - Complete deployment guide


## Testing

```bash
# Smart contract tests
forge test

# CRE workflow simulation
cd invoice-verification-cre
cre workflow simulate my-workflow --target staging-settings
```

## Acknowledgments

- **Chainlink** - Decentralized oracle network
- **OpenZeppelin** - Smart contract libraries
- **Ethereum Foundation** - Blockchain infrastructure
- **CoinGecko** - Market data API