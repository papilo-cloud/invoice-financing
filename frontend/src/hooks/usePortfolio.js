import { useState, useEffect } from 'react';
import { Contract, JsonRpcProvider } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/constants/addresses';
import { FRACTIONALIZATION_ABI, INVOICE_NFT_ABI } from '@/constants/abis';
import { useFractionalization } from './useFractionalization';
import { useInvoiceNFT } from './useInvoiceNFT';

export const usePortfolio = () => {
  const { account, provider } = useWeb3();
  const { getFractionInfo } = useFractionalization();
  const { getInvoice } = useInvoiceNFT();
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalInvested: '0',
    totalValue: '0',
    fractionsOwned: 0,
    claimable: '0',
  });

  useEffect(() => {
    if (account) {
      loadPortfolio();
    }
  }, [account]);


const loadPortfolio = async () => {
  try {
    setLoading(true);
    console.log('Loading portfolio for:', account);

    const readProvider = provider || new JsonRpcProvider(
      import.meta.env.VITE_SEPOLIA_RPC_URL
    );

    const fractionContract = new Contract(
      CONTRACTS.FRACTIONALIZATION_POOL,
      FRACTIONALIZATION_ABI,
      readProvider
    );

    //Try checking fractions 0-99
    // This is a brute-force approac, just for demo 
    const portfolioItems = [];
    let totalInvested = BigInt(0);
    let totalFractions = 0;
    let claimable = BigInt(0);

    const MAX_FRACTION_ID = 100; // Adjust if you expect more

    for (let fractionId = 0; fractionId < MAX_FRACTION_ID; fractionId++) {
      try {
        // Check if user owns any of this fraction
        const balance = await fractionContract.balanceOf(account, fractionId);
        
        if (Number(balance) > 0) {
          console.log(`Found balance for fraction ${fractionId}:`, Number(balance));

          // Get fraction info
          const fractionInfo = await getFractionInfo(fractionId);
          
          // Skip if not active
          if (!fractionInfo.isActive) continue;

          // Get invoice details
          const invoice = await getInvoice(fractionInfo.invoiceTokenId);

          // Calculate investment
          const invested = BigInt(fractionInfo.pricePerFraction) * BigInt(balance);
          totalInvested += invested;
          totalFractions += Number(balance);

          // Calculate claimable if invoice is paid
          if (invoice.isPaid) {
            const share = (BigInt(balance) * BigInt(invoice.faceValue)) / BigInt(fractionInfo.totalFractions);
            claimable += share;
          }

          portfolioItems.push({
            fractionId,
            balance: Number(balance),
            fractionInfo,
            invoice,
            invested: invested.toString(),
            ownership: (Number(balance) / fractionInfo.totalFractions) * 100,
          });
        }
      } catch (error) {
        // Silently skip fractions that don't exist
        continue;
      }
    }

    // console.log('Portfolio items:', portfolioItems);

    setPortfolio(portfolioItems);
    setStats({
      totalInvested: totalInvested.toString(),
      totalValue: totalInvested.toString(),
      fractionsOwned: totalFractions,
      claimable: claimable.toString(),
    });
  } catch (error) {
    console.error('Error loading portfolio:', error);
  } finally {
    setLoading(false);
  }
};

  return {
    portfolio,
    stats,
    loading,
    refreshPortfolio: loadPortfolio,
  };
};