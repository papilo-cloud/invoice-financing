import { useState, useEffect } from 'react';
import { Contract, JsonRpcProvider } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS } from '@/constants/addresses';
import { FRACTIONALIZATION_ABI, DISTRIBUTOR_ABI } from '@/constants/abis';
import { useFractionalization } from './useFractionalization';
import { useInvoiceNFT } from './useInvoiceNFT';

export const usePortfolio = () => {
  const { account, provider } = useWeb3();
  const { getFractionInfo } = useFractionalization();
  const { getInvoice } = useInvoiceNFT();
  const [portfolio, setPortfolio] = useState([]);
  const [claimHistory, setClaimHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalInvested: '0',
    currentValue: '0',
    claimable: '0',
    activePositions: 0,
    fractionsOwned: 0,
    totalClaimed: '0',
    lifetimeInvested: '0',
    lifetimeProfit: '0',
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

    const distributorContract = new Contract(
      CONTRACTS.PAYMENT_DISTRIBUTOR,
      DISTRIBUTOR_ABI,
      readProvider
    );

    const nextFractionId = await fractionContract.getNextFractionId();
    const maxFractionId = Number(nextFractionId);
    console.log(`Total fractions created: ${maxFractionId - 1}`)

    let userFractions = []

    try {
      userFractions = await fractionContract.getHolderFractions(account, maxFractionId);
      console.log(`User owns ${userFractions.length} different fractions:`, userFractions);
    } catch (error) {
      console.log('getHolderFractions not available, falling back to manual check');
      // Fallback: Check each fraction manually (but only up to maxFractionId)
        for (let i = 1; i < maxFractionId; i++) {
          try {
            const balance = await fractionContract.balanceOf(account, i);
            if (Number(balance) > 0) {
              userFractions.push(i);
            }
          } catch (err) {
            continue;
          }
        }
    }

    if (userFractions.length === 0) {
      console.log('No active positions found')

      const claims = await getClaimHistory(distributorContract, account);

      setPortfolio([])
      setClaimHistory(claims)
      setStats({
          totalInvested: '0',
          currentValue: '0',
          claimable: '0',
          activePositions: 0,
          totalFractions: 0,
          totalClaimed: calculateTotalClaimed(claims),
          lifetimeInvested: '0',
          lifetimeProfit: '0',
        });
        setLoading(false);
        return;
    }

    const portfolioItems = [];
    let totalInvested = BigInt(0);
    let totalClaimable = BigInt(0);
    let currentValue = BigInt(0);
    let totalFractionTokens = 0;


    for (const fractionId of userFractions) {
      try {
        const balance = await fractionContract.balanceOf(account, fractionId);
        
        if (Number(balance) > 0) {
          console.log(`Found balance for fraction ${fractionId}:`, Number(balance));

          totalFractionTokens += Number(balance);

          const fractionInfo = await getFractionInfo(fractionId);
          if (!fractionInfo.isActive) continue;

          const invoice = await getInvoice(fractionInfo.invoiceTokenId);

          const invested = BigInt(fractionInfo.pricePerFraction) * BigInt(balance);
          totalInvested += invested;

          let positionValue = BigInt(0);
          let positionClaimable = BigInt(0);

          if (invoice.isPaid) {
            try {
              const claimable = await distributorContract.claimable(account, fractionInfo.invoiceTokenId);
              positionClaimable = BigInt(claimable || 0);
              totalClaimable += positionClaimable;
              positionValue = positionClaimable;
            } catch (error) {
              console.log('Could not get claimable for fraction', fractionId);
              // estimatimation based on ownership
              const estimatedShare = (BigInt(balance) * BigInt(invoice.faceValue)) / 
                                    BigInt(fractionInfo.totalFractions);
              positionValue = estimatedShare;
              positionClaimable = estimatedShare;
            }

          } else {
            positionValue = invested; // If not paid, current value is what was invested
          }
          currentValue += positionValue;

          portfolioItems.push({
            fractionId,
            balance: Number(balance),
            fractionInfo,
            invoice,
            invested: invested.toString(),
            currentValue: positionValue.toString(),
            claimable: positionClaimable.toString(),
            ownership: (Number(balance) / fractionInfo.totalFractions) * 100,
          });
        }
      } catch (error) {
        continue;
      }
    }

    const claimedHistory = await getClaimHistory(distributorContract, account);
    const totalClaimed = calculateTotalClaimed(claimedHistory);

    const lifetimeInvested = totalInvested + BigInt(0);
    const lifetimeProfit = BigInt(totalClaimed) + totalClaimable - lifetimeInvested;

    setPortfolio(portfolioItems);
    setClaimHistory(claimedHistory);
    setStats({
      totalInvested: totalInvested.toString(),
      currentValue: currentValue.toString(),
      claimable: totalClaimable.toString(),
      activePositions: userFractions.length,
      totalFractions: totalFractionTokens,
      totalClaimed,
      lifetimeInvested: lifetimeInvested.toString(),
      lifetimeProfit: lifetimeProfit.toString(),
    });

  } catch (error) {
    console.error('Error loading portfolio:', error);
  } finally {
    setLoading(false);
  }
};

const getClaimHistory = async (distributorContract, userAddress) => {
  try {
    const filter = distributorContract.filters.PayoutClaimed(null, userAddress);
    const events = await distributorContract.queryFilter(filter, 0, 'latest');
    
    return events.map(event => ({
      invoiceTokenId: event.args.invoiceTokenId.toString(),
      amount: event.args.amount.toString(),
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
    }));
  } catch (error) {
    console.error('Error fetching claim history:', error);
    return [];
  }
};

const calculateTotalClaimed = (claims) => {
  const total = claims.reduce((sum, item) => sum + BigInt(item.amount), BigInt(0));
  return total.toString();
}

  return {
    portfolio,
    claimHistory,
    stats,
    loading,
    refreshPortfolio: loadPortfolio,
  };
};