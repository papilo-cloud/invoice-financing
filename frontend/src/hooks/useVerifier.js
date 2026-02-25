import { useState } from 'react';
import { Contract } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/constants/addresses';
import { VERIFIER_ABI } from '@/constants/abis';
import toast from 'react-hot-toast';

export const useVerifier = () => {
  const { signer, account } = useWeb3();
  const [loading, setLoading] = useState(false);

  const getContract = () => {
    if (!signer) throw new Error('No signer available');
    return new Contract(CONTRACTS.INVOICE_VERIFIER, VERIFIER_ABI, signer);
  };

  /**
   * Request Chainlink Functions verification for an invoice
   * @param {number} invoiceId - The invoice token ID to verify
   * @returns {Promise<{requestId: string, receipt: object}>}
   */
  const requestVerification = async (invoiceId) => {
    try {
      setLoading(true);
      const contract = getContract();
      
      const tx = await contract.requestVerification(invoiceId);
      const receipt = await tx.wait();

      // Extract requestId from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'VerificationRequested';
        } catch {
          return false;
        }
      });

      let requestId = null;
      if (event) {
        const parsedEvent = contract.interface.parseLog(event);
        requestId = parsedEvent.args.requestId;
      }

      toast.success('Verification requested! This may take a few minutes.');
      return { requestId, receipt };
    } catch (error) {
      console.error('Error requesting verification:', error);
      toast.error(error.reason || 'Failed to request verification');
      throw error;
    } finally {
      setLoading(false);
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
      const contract = getContract();

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
   * Listen for verification fulfillment events
   * @param {number} invoiceId - The invoice token ID to listen for
   * @param {function} callback - Callback function when verified
   */
  const onVerificationFulfilled = (invoiceId, callback) => {
    const contract = getContract();
    
    const filter = contract.filters.VerificationFulfilled(invoiceId);
    
    contract.on(filter, (invoiceIdEvent, riskScore, success) => {
      if (success) {
        callback({
          invoiceId: Number(invoiceIdEvent),
          riskScore: Number(riskScore),
          success,
        });
      }
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
    const contract = getContract();
    
    const filter = contract.filters.VerificationFailed(invoiceId);
    
    contract.on(filter, (invoiceIdEvent, requestId, reason) => {
      callback({
        invoiceId: Number(invoiceIdEvent),
        requestId,
        reason,
      });
    });

    return () => {
      contract.removeAllListeners(filter);
    };
  };

  return {
    requestVerification,
    manualVerify,
    onVerificationFulfilled,
    onVerificationFailed,
    loading,
  };
};