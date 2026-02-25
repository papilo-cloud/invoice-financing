export const APP_CONFIG = {
  name: 'InvoiceFlow',
  description: 'Decentralized invoice financing powered by Chainlink',
  version: '1.0.0',
  
  // Feature flags
  features: {
    enableBuyout: true,
    enableEmergencyRelease: false, // Owner only
    enableChainlinkVerification: true,
    enableManualVerification: true, // For demo/testing
  },

  // Business rules
  fractionalization: {
    minFractions: 10,
    maxFractions: 1000,
    defaultFractions: 100,
    cooldownPeriod: 300, // 5 minutes in seconds
  },

  fees: {
    platformFeePercent: 2.5,
    buyoutPremiumPercent: 10,
  },

  // Payment rules
  payment: {
    minPaymentThreshold: '0.001', // ETH
    minAcceptablePercent: 90, // Accept 90% of face value
  },

  // UI Settings
  ui: {
    itemsPerPage: 12,
    maxSearchResults: 50,
    debounceDelay: 300, // ms
    toastDuration: 4000, // ms
  },

  // Time constants
  time: {
    secondsPerDay: 86400,
    secondsPerHour: 3600,
    secondsPerMinute: 60,
  },

  // Risk score thresholds
  riskScore: {
    excellent: 80,
    good: 60,
    moderate: 40,
    poor: 0,
  },

  // Supported networks
  supportedNetworks: [11155111], // Sepolia

  // External links
  links: {
    docs: 'https://',
    github: 'https://github.com/papilo-cloud/invoice-financing',
    twitter: '',
    discord: '',
    chainlinkDocs: 'https://docs.chain.link',
  },

  // Contract deployment info
  deployment: {
    network: 'Sepolia Testnet',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
};

export const RISK_SCORE_CONFIG = {
  colors: {
    excellent: '#22c55e', 
    good: '#3b82f6',   
    moderate: '#fbbf24', 
    poor: '#ef4444',     
  },
  labels: {
    excellent: 'Excellent',
    good: 'Good',
    moderate: 'Moderate',
    poor: 'Poor',
  },
};

export const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'yellow',
    icon: 'Clock',
  },
  verified: {
    label: 'Verified',
    color: 'blue',
    icon: 'Shield',
  },
  paid: {
    label: 'Paid',
    color: 'green',
    icon: 'CheckCircle',
  },
  expired: {
    label: 'Expired',
    color: 'red',
    icon: 'AlertCircle',
  },
};

// Validation rules
export const VALIDATION = {
  invoice: {
    debtorName: {
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s.,'-]+$/,
    },
    faceValue: {
      min: 0.01,
      max: 1000000,
    },
    dueDate: {
      minDaysFromNow: 1,
      maxDaysFromNow: 365,
    },
  },
  fractionalization: {
    totalFractions: {
      min: 10,
      max: 1000,
    },
    pricePerFraction: {
      min: 0.0001,
      max: 100000,
    },
  },
};

// Error messages
export const ERROR_MESSAGES = {
  wallet: {
    notInstalled: 'Please install MetaMask to use this application',
    notConnected: 'Please connect your wallet',
    wrongNetwork: 'Please switch to Sepolia network',
    connectionFailed: 'Failed to connect wallet',
  },
  transaction: {
    rejected: 'Transaction was rejected',
    failed: 'Transaction failed',
    insufficientFunds: 'Insufficient funds',
  },
  validation: {
    invalidAddress: 'Invalid Ethereum address',
    invalidAmount: 'Invalid amount',
    invalidDate: 'Invalid date',
  },
};

// Success messages
export const SUCCESS_MESSAGES = {
  wallet: {
    connected: 'Wallet connected successfully',
    disconnected: 'Wallet disconnected',
  },
  invoice: {
    created: 'Invoice created successfully',
    verified: 'Invoice verified',
    fractionalized: 'Invoice fractionalized successfully',
  },
  transaction: {
    success: 'Transaction successful',
    confirmed: 'Transaction confirmed',
  },
};