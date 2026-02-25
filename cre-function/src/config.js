import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Network
  rpcUrl: process.env.RPC_URL,
  chainId: parseInt(process.env.CHAIN_ID || '11155111'),
  privateKey: process.env.PRIVATE_KEY,

  // Contracts
  invoiceNFTAddress: process.env.INVOICE_NFT_ADDRESS,
  verifierAddress: process.env.VERIFIER_ADDRESS,

  // Chainlink Functions
  functionsRouter: process.env.FUNCTIONS_ROUTER || '0xb83E47C2bC239B3bf370bc41e1459A34b41238D0',
  donId: process.env.DON_ID || 'fun-ethereum-sepolia-1',
  subscriptionId: process.env.SUBSCRIPTION_ID,
};

// Validation
if (!config.privateKey) {
  console.error('Error: PRIVATE_KEY not set in .env');
  process.exit(1);
}

if (!config.rpcUrl) {
  console.error('Error: RPC_URL not set in .env');
  process.exit(1);
}

console.log('Configuration loaded');
console.log('Chain ID:', config.chainId);
console.log('DON ID:', config.donId);