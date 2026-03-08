# InvoiceFlow Frontend

Decentralized invoice financing platform built with React, ethers.js, and Tailwind CSS.

## Prerequisites

- Node.js 18+ 
- MetaMask or compatible Web3 wallet
- Deployed smart contracts on Sepolia testnet

## Installation
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Update contract addresses in .env.local
```

## Environment Variables

Update `.env.local` with your deployed contract addresses:
```bash
VITE_INVOICE_NFT_ADDRESS=0x...
VITE_INVOICE_VERIFIER_ADDRESS=0x...
VITE_FRACTIONALIZATION_ADDRESS=0x...
VITE_PAYMENT_DISTRIBUTOR_ADDRESS=0x...
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

## Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

### For Businesses
- Create invoice NFTs
- Chainlink-verified invoices
- Fractionalize invoices for instant liquidity
- Withdraw proceeds
- Dynamic on-chain NFT images

### For Investors
- Browse verified invoice marketplace
- Buy fractional ownership
- Track portfolio
- Claim payouts when invoices are paid
- Transfer fractions (ERC1155)

## Architecture
```
src/
├── components/       # Reusable UI components
├── pages/           # Route pages
├── hooks/           # Custom React hooks for contracts
├── contexts/        # React contexts (Web3)
├── utils/           # Helper functions
└── constants/       # Contract addresses & ABIs
```

## Smart Contract Integration

The frontend interacts with 4 main contracts:

1. **InvoiceNFT** - Mint & manage invoice NFTs
2. **InvoiceVerifier** - Chainlink Functions verification
3. **InvoiceFractionalizationPool** - Fractionalize & trade
4. **PaymentDistributor** - Handle payments & claims

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **ethers.js v6** - Ethereum library
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Hot Toast** - Notifications
- **React Router** - Routing

## Deployment
```bash
# Build
npm run build

# Deploy to Vercel
vercel deploy
```