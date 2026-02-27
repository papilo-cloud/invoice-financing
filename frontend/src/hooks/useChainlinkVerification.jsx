import { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/constants/addresses';
import { VERIFIER_ABI } from '@/constants/abis';
import { motion } from 'framer-motion';
import { VerificationToast } from '@/components/common/VerificationToast';
import toast from 'react-hot-toast';

export const useChainlinkVerification = () => {
  const { signer, provider, account } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(new Map());

  const getContract = (withSigner = true) => {
    if (withSigner && !signer) throw new Error('No signer available');

    if (!withSigner && provider) {
      return new Contract(
        CONTRACTS.INVOICE_VERIFIER,
        VERIFIER_ABI,
        provider
      );
    }

    if (!provider) throw new Error('No provider available');

    return new Contract(
      CONTRACTS.INVOICE_VERIFIER,
      VERIFIER_ABI,
      withSigner ? signer : provider
    );
  };

  // Request Chainlink verification for an invoice
  const requestVerification = async (invoiceId) => {
    try {
      setLoading(true);
      const contract = getContract(true);

      toast.loading('Requesting Chainlink verification...', { id: 'verify' });

      const tx = await contract.requestVerification(invoiceId);
      const receipt = await tx.wait();

      // Extract request ID from event
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

      toast.success('Verification requested! Waiting for Chainlink...', { id: 'verify' });

      // Store pending request
      setPendingRequests(prev => new Map(prev).set(invoiceId, {
        requestId,
        timestamp: Date.now(),
        status: 'pending'
      }));

      return { requestId, receipt };
    } catch (error) {
      console.error('Error requesting verification:', error);
      toast.error(error.reason || 'Failed to request verification', { id: 'verify' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Manual verification (for testing/demo)
  const manualVerify = async (invoiceId, riskScore = 85) => {
    try {
      setLoading(true);
      const contract = getContract(true);

      toast.loading('Verifying invoice manually...', { id: 'verify' });

      const tx = await contract.manualVerify(invoiceId, riskScore);
      await tx.wait();

      toast.success(`Invoice verified with risk score ${riskScore}!`, { id: 'verify' });
    } catch (error) {
      console.error('Error with manual verification:', error);
      toast.error(error.reason || 'Failed to verify invoice', { id: 'verify' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isVerificationPending = (invoiceId) => {
    return pendingRequests.has(invoiceId);
  };

  // Get pending request info
  const getPendingRequest = (invoiceId) => {
    return pendingRequests.get(invoiceId);
  };

  return {
    requestVerification,
    manualVerify,
    isVerificationPending,
    getPendingRequest,
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

    const filter = contract.filters.VerificationFulfilled(invoiceId);

    const listener = (invoiceIdEvent, riskScore, success) => {
      if (onFulfilled) {
        onFulfilled({
          invoiceId: Number(invoiceIdEvent),
          riskScore: Number(riskScore),
          success,
        });
      }
    };

    contract.on(filter, listener);

    return () => {
      contract.off(filter, listener);
    };
  }, [invoiceId, provider, onFulfilled]);
}