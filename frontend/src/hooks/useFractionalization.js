import { useState } from 'react';
import { Contract, parseEther, formatEther, JsonRpcProvider } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/constants/addresses';
import { FRACTIONALIZATION_ABI } from '@/constants/abis';
import toast from 'react-hot-toast';

export const useFractionalization = () => {
  const { signer, provider } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [buyoutTimeStamp, setBuyoutTimeStamp] = useState(null);

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

  const initiateBuyout = async (fractionId) => {
    try {
      setLoading(true);
      const contract = getContract(true);
      const totalCost = await getBuyoutPrice(fractionId);
      
      toast.loading('Initiating buyout...', {id: 'buyout'});

      const tx = await contract.initiateBuyout(fractionId, {value: totalCost});
      const receipt = await tx.wait();
      const block = await tx.provider.getBlock(receipt.blockNumber);

      setBuyoutTimeStamp(block.timestamp);

      toast.success('Buyout initiated! Investors have 7 days to claim', {id: 'buyout'});
    } catch (error) {
      console.error('Error initiating buyout:', error);
      toast.error(error.reason || 'Failed to initiate buyout', { id: 'buyout' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getBuyoutPrice = async (fractionId) => {
    const contract = getContract(false);
    const fractionInfo = await getFractionInfo(fractionId);

      const buyoutPremium = await contract.buyoutPremium();
      const circulatingSupply = await contract.totalSupply(fractionId);
      
      const premiumPricePerFraction = (BigInt(fractionInfo.pricePerFraction) * BigInt(buyoutPremium)) / 100n;

      const totalCost = BigInt(circulatingSupply) * premiumPricePerFraction;
      return totalCost;
  }

  const finalizeBuyout = async (fractionId) => {
    try {
      setLoading(true);
      const contract = getContract(true);
      toast.loading('Finalizing buyout...', {id: 'finalize'});

      const tx = await contract.finalizeBuyout(fractionId);
      await tx.wait();

      toast.success('Buyout finalized! NFT returned.', { id: 'finalize' });
    } catch (error) {
      console.error('Error finalizing buyout:', error);
      toast.error(error.reason || 'Failed to finalize buyout', { id: 'finalize' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const claimBuyout = async (fractionId) => {
    try {
      setLoading(true);
      const contract = getContract(true);
      toast.loading('Claiming buyout proceeds...', {id: 'claim'});

      const tx = await contract.claimBuyoutPayment(fractionId);
      await tx.wait();

      toast.success('Buyout payment claimed!', { id: 'claim' });
    } catch (error) {
      console.error('Error claiming buyout:', error);
      toast.error(error.reason || 'Failed to claim buyout', { id: 'claim' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const redeemAfterPayment = async (fractionId) => {
    try {
      setLoading(true);
      const contract = getContract(true);

      toast.loading('Redeeming NFT...', { id: 'redeem' });

      const tx = await contract.redeemAfterPayment(fractionId);
      await tx.wait();

      toast.success('NFT redeemed successfully!', { id: 'redeem' });
    } catch (error) {
      console.error('Error redeeming NFT:', error);
      toast.error(error.reason || 'Failed to redeem NFT', { id: 'redeem' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const emergencyRelease = async (fractionId, recipient) => {
    try {
      setLoading(true);
      const contract = getContract(true);

      toast.loading('Releasing NFT...', { id: 'release' });

      const tx = await contract.emergencyRelease(fractionId, recipient);
      await tx.wait();

      toast.success('NFT released!', { id: 'release' });
    } catch (error) {
      console.error('Error releasing NFT:', error);
      toast.error(error.reason || 'Failed to release NFT', { id: 'release' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const withdrawPlatformFees = async () => {
    try {
      setLoading(true);
      const contract = getContract(true);

      toast.loading('Withdrawing platform fees...', { id: 'withdraw-fees' });

      const tx = await contract.withdrawPlatformFees();
      await tx.wait();

      toast.success('Platform fees withdrawn!', { id: 'withdraw-fees' });
    } catch (error) {
      console.error('Error withdrawing fees:', error);
      toast.error(error.reason || 'Failed to withdraw fees', { id: 'withdraw-fees' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getFractionIdByInvoice = async (tokenId) => {
  try {
    const contract = getContract(false);

    const fractionId = await contract.getFractionIdByInvoice(tokenId);
    console.log(Number(fractionId))
    return Number(fractionId);
  } catch (error) {
    console.error('Error getting fraction ID:', error);
    return 0;
  }
};

  const getBuyoutInfo = async (fractionId) => {
    try {
      const contract = getContract(false);
      const info = await contract.buyouts(fractionId);
      
      return {
        buyer: info[0],
        pricePerFraction: info[1],
        remainingFractions: Number(info[2]),
        escrowedAmount: info[3],
        active: info[4],
        finalized: info[5],
      };
    } catch (error) {
      console.error('Error getting buyout info:', error);
      return null;
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
      return amount;
    } catch (error) {
      console.error('Error getting pending withdrawals:', error);
      throw error;
    }
  };

  const getPlatformFees = async () => {
    try {
      const contract = getContract(false);
      const fees = await contract.platformFees();
      return fees;
    } catch (error) {
      console.error('Error getting platform fees:', error);
      throw error;
    }
  };

  return {
    fractionalizeInvoice,
    buyFractions,
    withdrawProceeds,
    initiateBuyout,
    buyoutTimeStamp,
    finalizeBuyout,
    claimBuyout,
    redeemAfterPayment,
    emergencyRelease,
    withdrawPlatformFees,
    getBuyoutPrice,
    getPlatformFees,
    getFractionIdByInvoice,
    getBuyoutInfo,
    getFractionInfo,
    getPendingWithdrawals,
    loading,
  };
};