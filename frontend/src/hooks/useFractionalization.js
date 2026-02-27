import { useState } from 'react';
import { Contract, parseEther, formatEther, JsonRpcProvider } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/constants/addresses';
import { FRACTIONALIZATION_ABI } from '@/constants/abis';
import toast from 'react-hot-toast';

export const useFractionalization = () => {
  const { signer, provider } = useWeb3();
  const [loading, setLoading] = useState(false);

  const getProvider = () => {
    if (provider) return provider;

    return new JsonRpcProvider(
      import.meta.env.VITE_SEPOLIA_RPC_URL
    );
  }

  const getContract = (withSigner = true) => {
    if (!withSigner) {
      const readProvider = getProvider();
      return new Contract(
        CONTRACTS.FRACTIONALIZATION_POOL, FRACTIONALIZATION_ABI, readProvider
      );
    }

    if (!signer) throw new Error('No signer available');

    return new Contract(CONTRACTS.FRACTIONALIZATION_POOL, FRACTIONALIZATION_ABI, withSigner ? signer : provider);
  };

  const fractionalizeInvoice = async (invoiceTokenId, totalFractions, pricePerFraction) => {
    try {
      setLoading(true);
      const contract = getContract(true);
      
      const tx = await contract.fractionalizeInvoice(
        invoiceTokenId,
        totalFractions,
        parseEther(pricePerFraction.toString())
      );

      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'InvoiceFractionalized';
        } catch {
          return false;
        }
      });

      const parsedEvent = contract.interface.parseLog(event);
      const fractionId = parsedEvent.args.fractionId;

      toast.success(`Invoice fractionalized! Fraction ID: ${fractionId}`);
      return { fractionId: Number(fractionId), receipt };
    } catch (error) {
      console.error('Error fractionalizing:', error);
      toast.error(error.reason || 'Failed to fractionalize invoice');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const buyFractions = async (fractionId, amount, pricePerFraction) => {
    try {
      setLoading(true);
      const contract = getContract(true);
      
      const cost = parseEther((amount * pricePerFraction).toString());
      
      const tx = await contract.buyFractions(fractionId, amount, { value: cost });
      await tx.wait();

      toast.success(`Purchased ${amount} fractions!`);
    } catch (error) {
      console.error('Error buying fractions:', error);
      toast.error(error.reason || 'Failed to buy fractions');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const withdrawProceeds = async () => {
    try {
      setLoading(true);
      const contract = getContract(true);

      toast.loading('Withdrawing proceeds...', { id: 'withdraw' });
      const tx = await contract.withdrawProceeds();
      await tx.wait();
      toast.success('Proceeds withdrawn successfully!', { id: 'withdraw' });
      
    } catch (error) {
      console.error('Error withdrawing proceeds:', error);
      toast.error(error.reason || 'Failed to withdraw proceeds');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getFractionInfo = async (fractionId) => {
    try {
      const contract = getContract(false);
      const info = await contract.getFractionInfo(fractionId);
      
      return {
        invoiceTokenId: Number(info[0]),
        totalFractions: Number(info[1]),
        fractionsSold: Number(info[2]),
        pricePerFraction: info[3],
        issuer: info[4],
        isActive: info[5],
      };
    } catch (error) {
      console.error('Error getting fraction info:', error);
      throw error;
    }
  };

  const getPendingWithdrawals = async (address) => {
    try {
      const contract = getContract(false);
      const amount = await contract.pendingWithdrawals(address);
      return formatEther(amount);
    } catch (error) {
      console.error('Error getting pending withdrawals:', error);
      throw error;
    }
  };

  return {
    fractionalizeInvoice,
    buyFractions,
    withdrawProceeds,
    getFractionInfo,
    getPendingWithdrawals,
    loading,
  };
};