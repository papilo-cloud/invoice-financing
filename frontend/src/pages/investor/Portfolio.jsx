import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { useWeb3 } from '@/contexts/Web3Context';
import { useDistributor } from '@/hooks/useDistributor';
import { useFractionalization } from '@/hooks/useFractionalization';
import { formatEther } from '@/utils/format';

export const Portfolio = () => {
  const { account, isConnected } = useWeb3();
  const { getClaimable, claimPayout, loading: claiming } = useDistributor();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState('0');
  const [claimableAmount, setClaimableAmount] = useState('0');

  useEffect(() => {
    if (account) {
      loadPortfolio();
    }
  }, [account]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      // In production, we'll query events or use a subgraph
      // For demo purposes, showing empty state
      setHoldings([]);
      setTotalValue('0');
      setClaimableAmount('0');
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Card className="text-center max-w-md">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">
            Please connect your wallet to view your portfolio
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Portfolio</h1>
          <p className="text-gray-400">Track your investments and claim returns</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Total Invested</p>
                <p className="text-3xl font-bold text-primary-400">
                  {totalValue} ETH
                </p>
              </div>
              <Wallet className="w-12 h-12 text-primary-400 opacity-50" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Claimable</p>
                <p className="text-3xl font-bold text-green-400">
                  {claimableAmount} ETH
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-400 opacity-50" />
            </div>
            {parseFloat(claimableAmount) > 0 && (
              <Button className="w-full mt-4" loading={claiming}>
                Claim All
              </Button>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Active Positions</p>
                <p className="text-3xl font-bold">{holdings.length}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-accent-400 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Holdings */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="xl" />
          </div>
        ) : holdings.length > 0 ? (
          <div className="space-y-4">
            {holdings.map((holding, index) => (
              <Card key={index} hover>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">
                      Invoice #{holding.invoiceId}
                    </h3>
                    <p className="text-gray-400">{holding.debtorName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-400">
                      {holding.fractions} fractions
                    </p>
                    <p className="text-sm text-gray-400">
                      {holding.value} ETH invested
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Investments Yet</h3>
            <p className="text-gray-400 mb-6">
              Start investing in verified invoices to build your portfolio
            </p>
            <Button onClick={() => window.location.href = '/marketplace'}>
              Explore Marketplace
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};