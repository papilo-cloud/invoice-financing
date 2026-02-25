import { useState } from 'react';
import { Contract, parseEther, formatEther } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/constants/addresses';
import { DISTRIBUTOR_ABI } from '@/constants/abis';
import toast from 'react-hot-toast';

export const useDistributor = () => {
  const { signer, account } = useWeb3();
  const [loading, setLoading] = useState(false);

  const getContract = () => {
    if (!signer) throw new Error('No signer available');
    return new Contract(CONTRACTS.PAYMENT_DISTRIBUTOR, DISTRIBUTOR_ABI, signer);
  };

  const receivePayment = async (invoiceTokenId, amount) => {
    try {
      setLoading(true);
      const contract = getContract();
      
      const tx = await contract.receivePayment(invoiceTokenId, {
        value: parseEther(amount.toString()),
      });
      
      await tx.wait();
      toast.success('Payment received successfully!');
    } catch (error) {
      console.error('Error receiving payment:', error);
      toast.error(error.reason || 'Failed to process payment');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const claimPayout = async (invoiceTokenId) => {
    try {
      setLoading(true);
      const contract = getContract();
      const tx = await contract.claim(invoiceTokenId);
      await tx.wait();
      toast.success('Payout claimed successfully!');
    } catch (error) {
      console.error('Error claiming payout:', error);
      toast.error(error.reason || 'Failed to claim payout');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getClaimable = async (invoiceTokenId, userAddress) => {
    try {
      const contract = getContract();
      const amount = await contract.claimable(userAddress || account, invoiceTokenId);
      return formatEther(amount);
    } catch (error) {
      console.error('Error getting claimable amount:', error);
      throw error;
    }
  };

  return {
    receivePayment,
    claimPayout,
    getClaimable,
    loading,
  };
};