import { useState } from 'react';
import { Contract } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/constants/addresses';
import { VERIFIER_ABI } from '@/constants/abis';
import toast from 'react-hot-toast';

export const useVerifier = () => {
  const { signer, account, provider } = useWeb3();
  const [loading, setLoading] = useState(false);

  const getContract = (withSigner = true) => {
    if (withSigner) {
      if (!signer) throw new Error('No signer available');
      return new Contract(CONTRACTS.INVOICE_VERIFIER, VERIFIER_ABI, signer);
    } else {
      if (!provider) throw new Error('No provider available');
      return new Contract(CONTRACTS.INVOICE_VERIFIER, VERIFIER_ABI, provider);
    }
  };

  /**
   * Get full verification details for an invoice
   * @param {number} invoiceId - The invoice token ID
   * @returns {Promise<{riskScore: number, isVerified: boolean, verifiedAt: number}>}
   */
  const getVerification = async (invoiceId) => {
    try {
      const contract = getContract(false);
      const [riskScore, isVerified, verifiedAt] = await contract.getVerification(invoiceId);
      
      return {
        riskScore: Number(riskScore),
        isVerified,
        verifiedAt: Number(verifiedAt),
      };
    } catch (error) {
      console.error('Error getting verification:', error);
      throw error;
    }
  };

  /**
   * Check if an invoice is verified
   * @param {number} invoiceId - The invoice token ID
   * @returns {Promise<boolean>}
   */
  const isVerified = async (invoiceId) => {
    try {
      const contract = getContract(false);
      return await contract.isVerified(invoiceId);
    } catch (error) {
      console.error('Error checking verification:', error);
      return false;
    }
  };

  /**
   * Get verification status
   * @param {number} invoiceId - The invoice token ID
   * @returns {Promise<{status: number, riskScore: number}>}
   * Status: 0 = not verified, 1 = verified
   */
  const getVerificationStatus = async (invoiceId) => {
    try {
      const contract = getContract(false);
      const [status, riskScore] = await contract.getVerificationStatus(invoiceId);
      
      return {
        status: Number(status),
        riskScore: Number(riskScore),
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return { status: 0, riskScore: 0 };
    }
  };

  /**
   * Manual verification (for demo/testing purposes)
   * @param {number} invoiceId - The invoice token ID to verify
   * @param {number} riskScore - Risk score (0-100)
   * @returns {Promise<object>} Transaction receipt
   */
  const manualVerify = async (invoiceId, riskScore) => {
    try {
      setLoading(true);
      const contract = getContract(true);

      if (riskScore < 0 || riskScore > 100) {
        throw new Error('Risk score must be between 0 and 100');
      }

      const tx = await contract.manualVerify(invoiceId, riskScore);
      const receipt = await tx.wait();

      toast.success(`Invoice #${invoiceId} verified with risk score ${riskScore}`);
      return receipt;
    } catch (error) {
      console.error('Error manually verifying:', error);
      toast.error(error.reason || 'Failed to verify invoice');
      throw error;
    } finally {
      setLoading(false);
    }
  };

    /**
   * Batch manual verification (admin only)
   * @param {number[]} invoiceIds - Array of invoice token IDs
   * @param {number[]} riskScores - Array of risk scores (must match length)
   * @returns {Promise<object>} Transaction receipt
   */
  const batchManualVerify = async (invoiceIds, riskScores) => {
    try {
      setLoading(true);
      const contract = getContract(true);

      if (invoiceIds.length !== riskScores.length) {
        throw new Error('Invoice IDs and risk scores arrays must have the same length');
      }

      const tx = await contract.batchManualVerify(invoiceIds, riskScores);
      const receipt = await tx.wait();

      toast.success(`Verified ${invoiceIds.length} invoices`);
      return receipt;
    } catch (error) {
      console.error('Error batch verifying:', error);
      toast.error(error.reason || 'Failed to batch verify invoices');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Listen for verification fulfillment events
   * @param {number} invoiceId - The invoice token ID to listen for
   * @param {function} callback - Callback function when verified
   */
  const onVerificationReceived = (invoiceId, callback) => {
    const contract = getContract(false);
    
    const filter = invoiceId !== null 
      ? contract.filters.VerificationReceived(invoiceId)
      : contract.filters.VerificationReceived();

    contract.on(filter, (tokenId, riskScore, success, timestamp) => {
      if (success) {
        callback({
          invoiceId: Number(tokenId),
          riskScore: Number(riskScore),
          success,
          timestamp: Number(timestamp),
        });

        toast.success(
          `Invoice #${tokenId} verified automatically! Risk score: ${riskScore}`,
          { duration: 5000 }
        );
      }
    });

    return () => {
      contract.removeAllListeners(filter);
    };
  };

  /**
   * Listen for manual verification events
   * @param {number|null} invoiceId - Specific invoice ID to listen for, or null for all
   * @param {function} callback - Callback function when manually verified
   * @returns {function} Cleanup function to remove listener
   */
  const onManualVerification = (invoiceId, callback) => {
    const contract = getContract(false);
    
    const filter = invoiceId !== null
      ? contract.filters.ManualVerification(invoiceId)
      : contract.filters.ManualVerification();
    
    contract.on(filter, (tokenId, riskScore, verifier) => {
      callback({
        invoiceId: Number(tokenId),
        riskScore: Number(riskScore),
        verifier,
      });
    });

    return () => {
      contract.removeAllListeners(filter);
    };
  };

  /**
   * Listen for verification failure events
   * @param {number} invoiceId - The invoice token ID to listen for
   * @param {function} callback - Callback function when verification fails
   */
  const onVerificationFailed = (invoiceId, callback) => {
    const contract = getContract(false);
    
    const filter = invoiceId !== null
      ? contract.filters.VerificationFailed(invoiceId)
      : contract.filters.VerificationFailed();

    contract.on(filter, (tokenId, reason) => {
      callback({
        invoiceId: Number(tokenId),
        reason,
      });

      toast.error(`Verification failed for invoice #${tokenId}: ${reason}`);
    });

    return () => {
      contract.removeAllListeners(filter);
    };
  };

  return {
    getVerification,
    isVerified,
    getVerificationStatus,
    batchManualVerify,
    onVerificationReceived,
    onManualVerification,
    manualVerify,
    onVerificationFailed,
    loading,
  };
};


export const useVerificationEvents = (invoiceId, onFulfilled) => {
  const { provider } = useWeb3();

  useEffect(() => {
    if (!invoiceId || !provider) return;

    const contract = new Contract(
      CONTRACTS.INVOICE_VERIFIER,
      VERIFIER_ABI,
      provider
    );

    const filter = invoiceId !== null 
      ? contract.filters.VerificationReceived(invoiceId)
      : contract.filters.VerificationReceived();

    const listener = (tokenId, riskScore, success, timestamp) => {
      if (onFulfilled) {
        onFulfilled({
          invoiceId: Number(tokenId),
          riskScore: Number(riskScore),
          success,
          timestamp: Number(timestamp),
        });
      }
    };

    contract.on(filter, listener);

    return () => {
      contract.off(filter, listener);
    };
  }, [invoiceId, provider, onFulfilled]);
}