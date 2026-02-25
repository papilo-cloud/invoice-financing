export const CONTRACTS = {
  INVOICE_NFT: import.meta.env.VITE_INVOICE_NFT_ADDRESS,
  INVOICE_VERIFIER: import.meta.env.VITE_INVOICE_VERIFIER_ADDRESS,
  FRACTIONALIZATION_POOL: import.meta.env.VITE_FRACTIONALIZATION_ADDRESS,
  PAYMENT_DISTRIBUTOR: import.meta.env.VITE_PAYMENT_DISTRIBUTOR_ADDRESS,
};

export const NETWORK_CONFIG = {
  chainId: 11155111, // Sepolia
  chainName: 'Sepolia',
  rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL,
  blockExplorer: 'https://sepolia.etherscan.io',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'ETH',
    decimals: 18,
  },
};