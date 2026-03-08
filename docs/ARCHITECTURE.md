# InvoiceFlow Architecture

## System Overview

InvoiceFlow is a decentralized invoice financing platform built on Ethereum with Chainlink CRE for automated verification. The system enables invoice owners to fractionalize their invoices and receive immediate liquidity from multiple investors.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        User Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Issuers    │  │  Investors   │  │   Debtors    │      │
│  │ (Businesses) │  │  (Lenders)   │  │  (Payers)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
│         React + Ethers.js + TailwindCSS                     │
│                                                              │
│  Components:                                                 │
│  • Invoice Management (Create, View, Manage)                │
│  • Fractionalization Interface                              │
│  • Investment Dashboard                                      │
│  • Payment Tracking                                          │
└──────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                   Smart Contract Layer                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              InvoiceNFT (ERC-721)                      │ │
│  │  • Stores invoice metadata                             │ │
│  │  • Tracks verification status                          │ │
│  │  • Manages payment status                              │ │
│  │  • Emits InvoiceCreated events                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           InvoiceVerifier (CRE Consumer)               │ │
│  │  • Receives verification from Chainlink CRE            │ │
│  │  • Validates risk scores                               │ │
│  │  • Updates InvoiceNFT verification status              │ │
│  │  • Inherits ReceiverTemplate                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │    InvoiceFractionalizationPool (ERC-1155)             │ │
│  │  • Creates fractional tokens                           │ │
│  │  • Manages fraction sales                              │ │
│  │  • Handles buyout mechanism                            │ │
│  │  • Escrows invoice NFTs                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            PaymentDistributor                           │ │
│  │  • Receives debtor payments                            │ │
│  │  • Distributes to fraction holders                     │ │
│  │  • Handles issuer unsold fractions                     │ │
│  │  • Burns fractions on claim                            │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                  Chainlink CRE Layer                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Invoice Verification Workflow                  │ │
│  │                                                         │ │
│  │  Trigger: InvoiceCreated event                         │ │
│  │  ↓                                                      │ │
│  │  1. Detect event via EVM Log Trigger                   │ │
│  │  2. Read invoice data from InvoiceNFT                  │ │
│  │  3. Fetch market data from CoinGecko (consensus)       │ │
│  │  4. Calculate risk score (0-100)                       │ │
│  │  5. Generate signed DON report                         │ │
│  │  6. Write to InvoiceVerifier contract                  │ │
│  │                                                         │ │
│  │  Result: Invoice verified automatically in ~30s        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                  External Data Sources                       │
│                                                              │
│  • CoinGecko API (ETH price, 24h volatility)                │
│  • Ethereum Blockchain (Invoice data, events)               │
│  • Chainlink Price Feeds (Future: USD conversion)           │
└──────────────────────────────────────────────────────────────┘
```

## Core Contracts

### 1. InvoiceNFT

**Purpose:** Represents invoices as non-fungible tokens

**Key Functions:**
```solidity
createInvoice(string debtorName, uint256 faceValue, uint256 dueDate)
setVerificationResult(uint256 tokenId, uint256 riskScore, bool success)
markAsPaid(uint256 tokenId)
getInvoice(uint256 tokenId)
```

### 2. InvoiceVerifier

**Purpose:** Receives and processes verification results from Chainlink CRE

**Inheritance:** `ReceiverTemplate` (Chainlink standard)

**Key Functions:**
```solidity
_processReport(bytes report) // Called by CRE forwarder
manualVerify(uint256 tokenId, uint256 riskScore) // Owner only
getVerification(uint256 tokenId)
```


### 3. InvoiceFractionalizationPool

**Purpose:** Manages fractionalization and trading of invoice portions

**Token Standard:** ERC-1155 (multi-token)

**Key Functions:**
```solidity
fractionalizeInvoice(uint256 invoiceTokenId, uint256 totalFractions, uint256 pricePerFraction)
buyFractions(uint256 fractionId, uint256 amount)
initiateBuyout(uint256 fractionId)
claimBuyoutPayment(uint256 fractionId)
finalizeBuyout(uint256 fractionId)
withdrawProceeds()
```

**Economics:**
- Platform fee: 2.5% on fraction sales
- Buyout premium: 10% above market price
- Cooldown period: 5 minutes (anti-flash-loan)

### 4. PaymentDistributor

**Purpose:** Handles debtor payments and distributes to stakeholders

**Key Functions:**
```solidity
receivePayment(uint256 invoiceTokenId)
claim(uint256 invoiceTokenId) // For fraction holders
claimIssuerReturns(uint256 invoiceTokenId) // For issuer's unsold fractions
```

**Payment Logic:**
```
Total Payment = Face Value
Payment per Fraction = Total Payment / Total Fractions

Investor Share = (Fractions Owned / Total Fractions) × Total Payment
Issuer Share = (Unsold Fractions / Total Fractions) × Total Payment
```

## Data Flow

### Invoice Creation Flow
```yaml
1. User → Frontend: Create Invoice
2. Frontend → InvoiceNFT: createInvoice()
3. InvoiceNFT → Event: InvoiceCreated
4. CRE Workflow: Detect event
5. CRE Workflow: Fetch market data (CoinGecko)
6. CRE Workflow: Calculate risk score
7. CRE Workflow → InvoiceVerifier: onReport()
8. InvoiceVerifier → InvoiceNFT: setVerificationResult()
9. Frontend: Update UI (event listener)
```

### Fractionalization Flow
```yaml
1. Issuer: Approve InvoiceNFT for transfer
2. Issuer → Pool: fractionalizeInvoice()
3. Pool: Transfer NFT to escrow
4. Pool: Create ERC-1155 tokens
5. Pool: Emit InvoiceFractionalized event
6. Frontend: Show fractions available for purchase
```

### Investment Flow
```yaml
1. Investor → Pool: buyFractions() + ETH
2. Pool: Mint ERC-1155 tokens to investor
3. Pool: Deduct platform fee (2.5%)
4. Pool: Add proceeds to issuer's withdrawable balance
5. Issuer: Can call withdrawProceeds() anytime
```

### Payment Flow
```yaml
1. Debtor → PaymentDistributor: receivePayment() + ETH
2. Distributor: Mark invoice as paid
3. Distributor: Calculate payment per fraction
4. Investors: Call claim() to receive their share
5. Distributor: Burn fractions, send ETH
6. Issuer: Call claimIssuerReturns() for unsold fractions
```


## Dependencies

### Smart Contracts
- OpenZeppelin Contracts v5.0
- Chainlink CRE SDK
- Foundry (development)

### Frontend
- Ethers.js v6
- React 18
- Vite 5

### Infrastructure
- Chainlink CRE (verification)
- CoinGecko API (market data)
- Ethereum Sepolia (testnet)
- IPFS (future: document storage)

---

**Last Updated:** 2026-03-07
**Version:** 1.0.0
```