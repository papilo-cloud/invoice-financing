import { useState } from 'react';
import { Contract, parseEther } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/constants/addresses';
import { INVOICE_NFT_ABI } from '@/constants/abis';
import toast from 'react-hot-toast';

export const useInvoiceNFT = () => {
  const { signer, account } = useWeb3();
  const [loading, setLoading] = useState(false);

  const getContract = () => {
    if (!signer) throw new Error('No signer available');
    return new Contract(CONTRACTS.INVOICE_NFT, INVOICE_NFT_ABI, signer);
  };

  const createInvoice = async (debtorName, faceValue, dueDate) => {
    try {
      setLoading(true);
      const contract = getContract();
      
      const tx = await contract.createInvoice(
        debtorName,
        parseEther(faceValue.toString()),
        Math.floor(new Date(dueDate).getTime() / 1000)
      );

      const receipt = await tx.wait();
      
      // Extract tokenId from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'InvoiceCreated';
        } catch {
          return false;
        }
      });

      const parsedEvent = contract.interface.parseLog(event);
      const tokenId = parsedEvent.args.tokenId;

      toast.success(`Invoice #${tokenId} created successfully!`);
      return { tokenId: Number(tokenId), receipt };
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(error.reason || 'Failed to create invoice');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getInvoice = async (tokenId) => {
    try {
      const contract = getContract();
      const invoice = await contract.getInvoice(tokenId);
      
      return {
        issuer: invoice.issuer,
        debtorName: invoice.debtorName,
        faceValue: invoice.faceValue,
        dueDate: Number(invoice.dueDate),
        riskScore: Number(invoice.riskScore),
        isPaid: invoice.isPaid,
        isVerified: invoice.isVerified,
        createdAt: Number(invoice.createdAt),
      };
    } catch (error) {
      console.error('Error getting invoice:', error);
      throw error;
    }
  };

  const approveNFT = async (tokenId, spender) => {
    try {
      setLoading(true);
      const contract = getContract();
      const tx = await contract.approve(spender, tokenId);
      await tx.wait();
      toast.success('NFT approved!');
    } catch (error) {
      console.error('Error approving NFT:', error);
      toast.error('Failed to approve NFT');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getTokenURI = async (tokenId) => {
    try {
      const contract = getContract();
      return await contract.tokenURI(tokenId);
    } catch (error) {
      console.error('Error getting token URI:', error);
      throw error;
    }
  };

  return {
    createInvoice,
    getInvoice,
    approveNFT,
    getTokenURI,
    loading,
  };
};