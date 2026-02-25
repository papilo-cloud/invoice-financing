import { Contract } from 'ethers';
import { CONTRACTS } from '@/constants/addresses';
import {
  INVOICE_NFT_ABI,
  VERIFIER_ABI,
  FRACTIONALIZATION_ABI,
  DISTRIBUTOR_ABI,
} from '@/constants/abis';

/**
 * Get contract instance with signer
 * @param {string} contractName - Name of the contract (INVOICE_NFT, VERIFIER, etc.)
 * @param {Signer} signer - Ethers signer instance
 * @returns {Contract} Contract instance
 */
export const getContract = (contractName, signer) => {
  const contracts = {
    INVOICE_NFT: {
      address: CONTRACTS.INVOICE_NFT,
      abi: INVOICE_NFT_ABI,
    },
    VERIFIER: {
      address: CONTRACTS.INVOICE_VERIFIER,
      abi: VERIFIER_ABI,
    },
    FRACTIONALIZATION: {
      address: CONTRACTS.FRACTIONALIZATION_POOL,
      abi: FRACTIONALIZATION_ABI,
    },
    DISTRIBUTOR: {
      address: CONTRACTS.PAYMENT_DISTRIBUTOR,
      abi: DISTRIBUTOR_ABI,
    },
  };

  const config = contracts[contractName];
  if (!config) {
    throw new Error(`Unknown contract: ${contractName}`);
  }

  return new Contract(config.address, config.abi, signer);
};

/**
 * Get contract instance for read-only operations
 * @param {string} contractName - Name of the contract
 * @param {Provider} provider - Ethers provider instance
 * @returns {Contract} Contract instance
 */
export const getReadOnlyContract = (contractName, provider) => {
  const contracts = {
    INVOICE_NFT: {
      address: CONTRACTS.INVOICE_NFT,
      abi: INVOICE_NFT_ABI,
    },
    VERIFIER: {
      address: CONTRACTS.INVOICE_VERIFIER,
      abi: VERIFIER_ABI,
    },
    FRACTIONALIZATION: {
      address: CONTRACTS.FRACTIONALIZATION_POOL,
      abi: FRACTIONALIZATION_ABI,
    },
    DISTRIBUTOR: {
      address: CONTRACTS.PAYMENT_DISTRIBUTOR,
      abi: DISTRIBUTOR_ABI,
    },
  };

  const config = contracts[contractName];
  if (!config) {
    throw new Error(`Unknown contract: ${contractName}`);
  }

  return new Contract(config.address, config.abi, provider);
};

/**
 * Parse contract error message
 * @param {Error} error - Error from contract call
 * @returns {string} Human-readable error message
 */
export const parseContractError = (error) => {
  if (error?.reason) return error.reason;
  
  if (error?.data?.message) {
    return error.data.message.replace('execution reverted: ', '');
  }

  if (error?.message) {
    // Extract custom error name
    const customErrorMatch = error.message.match(/Error: ([A-Za-z]+)\(/);
    if (customErrorMatch) {
      return formatCustomError(customErrorMatch[1]);
    }

    // Extract revert reason
    const revertMatch = error.message.match(/reason="(.+?)"/);
    if (revertMatch) {
      return revertMatch[1];
    }

    return error.message;
  }

  return 'Transaction failed';
};

/**
 * Format custom error names to human-readable messages
 * @param {string} errorName - Custom error name
 * @returns {string} Formatted error message
 */
const formatCustomError = (errorName) => {
  const errorMap = {
    InvoiceNotVerified: 'Invoice has not been verified yet',
    InvoiceAlreadyPaid: 'Invoice has already been paid',
    InvoiceExpired: 'Invoice has expired',
    NotInvoiceOwner: 'You are not the owner of this invoice',
    InvoiceNotApproved: 'Invoice NFT has not been approved',
    InsufficientFractionsAvailable: 'Not enough fractions available',
    CooldownPeriodActive: 'Cooldown period is still active',
    InsufficientPayment: 'Insufficient payment amount',
    AlreadyClaimed: 'You have already claimed for this invoice',
    NothingToClaim: 'You have no fractions to claim',
    InvalidAmount: 'Invalid amount specified',
  };

  return errorMap[errorName] || errorName;
};

/**
 * Wait for transaction confirmation with retries
 * @param {Transaction} tx - Transaction object
 * @param {number} confirmations - Number of confirmations to wait for
 * @returns {Promise<TransactionReceipt>}
 */
export const waitForTransaction = async (tx, confirmations = 1) => {
  try {
    const receipt = await tx.wait(confirmations);
    return receipt;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw parseContractError(error);
  }
};

/**
 * Estimate gas for a contract function call
 * @param {Contract} contract - Contract instance
 * @param {string} method - Method name
 * @param {Array} args - Method arguments
 * @returns {Promise<bigint>} Estimated gas
 */
export const estimateGas = async (contract, method, args = []) => {
  try {
    const gasEstimate = await contract[method].estimateGas(...args);
    // Add 20% buffer
    return (gasEstimate * 120n) / 100n;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    throw parseContractError(error);
  }
};

/**
 * Check if contract is deployed at address
 * @param {Provider} provider - Ethers provider
 * @param {string} address - Contract address
 * @returns {Promise<boolean>}
 */
export const isContractDeployed = async (provider, address) => {
  try {
    const code = await provider.getCode(address);
    return code !== '0x';
  } catch {
    return false;
  }
};

/**
 * Get all contract addresses
 * @returns {Object} Object with all contract addresses
 */
export const getAllContracts = () => {
  return { ...CONTRACTS };
};

/**
 * Validate contract addresses
 * @param {Provider} provider - Ethers provider
 * @returns {Promise<Object>} Validation results
 */
export const validateContracts = async (provider) => {
  const results = {};
  
  for (const [name, address] of Object.entries(CONTRACTS)) {
    results[name] = {
      address,
      deployed: await isContractDeployed(provider, address),
    };
  }
  
  return results;
};

export default {
  getContract,
  getReadOnlyContract,
  parseContractError,
  waitForTransaction,
  estimateGas,
  isContractDeployed,
  getAllContracts,
  validateContracts,
};