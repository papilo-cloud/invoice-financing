import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, DollarSign, Package, RefreshCcw, Download } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { useWeb3 } from '@/contexts/Web3Context';
import { useDistributor } from '@/hooks/useDistributor';
import { formatEther, formatDate } from '@/utils/format';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const Portfolio = () => {
  const { account, isConnected } = useWeb3();
  const { portfolio, stats, loading, refreshPortfolio } = usePortfolio();
  const { claimPayout, loading: claiming } = useDistributor();
  const navigate = useNavigate();

  const handleClaim = async (fractionId, invoiceTokenId) => {
    try {
      toast.loading('Processing claim...', invoiceTokenId);
      await claimPayout(invoiceTokenId);
      toast.success('Payout claimed successfully!', invoiceTokenId);
    } catch (error) {
      toast.error('Failed to process claim', invoiceTokenId);
    }
  }


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

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Portfolio</h1>
            <p className="text-gray-400">Track your investments and claim returns</p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshPortfolio}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Total Invested</p>
                <p className="text-3xl font-bold text-primary-400">
                  {formatEther(stats.totalInvested)} ETH
                </p>
              </div>
              <Wallet className="w-12 h-12 text-primary-400 opacity-50" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Current Value</p>
                <p className="text-3xl font-bold">
                  {formatEther(stats.totalValue)} ETH
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-white opacity-50" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Fractions Owned</p>
                <p className="text-3xl font-bold">{stats.fractionsOwned}</p>
              </div>
              <Package className="w-12 h-12 text-white opacity-50" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Claimable</p>
                <p className="text-3xl font-bold text-green-400">
                  {formatEther(stats.claimable)} ETH
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-400 opacity-50" />
            </div>
          </Card>
        </div>

        {formatEther(stats.claimable) > 0 && (
          <Card className="mb-6 border-2 border-green-500/30 bg-green-500/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-green-400 mb-2">
                  You have returns ready to claim!
                </h3>
                <p className="text-gray-400">
                  Total claimable: <span className="text-green-400 font-bold">
                    {formatEther(stats.claimable)} ETH
                  </span>
                </p>
              </div>
              <Button 
                onClick={() => {
                  portfolio
                    .filter(item => item.invoice.isPaid)
                    .forEach(item => handleClaim(item.fractionInfo.invoiceTokenId, item.fractionId));
                }}
                loading={claiming}
                className="whitespace-nowrap"
              >
                <Download className="w-5 h-5" />
                Claim All Returns
              </Button>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Investments</h2>
            <p className="text-gray-400">
              {portfolio.length} {portfolio.length === 1 ? 'position' : 'positions'}
            </p>
          </div>

          {portfolio.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-400">
                No Investments Yet
              </h3>
              <p className="text-gray-500 mb-6">
                Start investing in verified invoices to earn returns
              </p>
              <Button onClick={() => navigate('/marketplace')}>
                Explore Marketplace
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolio.map((item) => (
                <div
                  key={item.fractionId}
                  className="glass p-6 rounded-xl border border-gray-700 hover:border-primary-500/50 transition-all cursor-pointer"
                  onClick={() => navigate(`/marketplace/${item.fractionId}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-gray-400">
                          Fraction #{item.fractionId}
                        </span>
                        {item.invoice.isPaid ? (
                          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30">
                            Paid
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-1">
                        {item.invoice.debtorName}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Invoice #{item.fractionInfo.invoiceTokenId}
                      </p>
                    </div>

                    {item.invoice.isPaid && (
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim(item.fractionId, item.fractionInfo.invoiceTokenId);
                          }}
                        loading={claiming}
                        className="whitespace-nowrap"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Claim Returns
                      </Button>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Your Fractions</p>
                      <p className="font-bold text-lg">{item.balance}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Invested</p>
                      <p className="font-bold text-primary-500">
                        {formatEther(item.invested)} ETH
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Invoice Value</p>
                      <p className="font-bold">
                        {formatEther(item.invoice.faceValue)} ETH
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">
                        {item.invoice.isPaid ? 'Your Return' : 'Due Date'}
                      </p>
                      <p className={`font-bold ${item.invoice.isPaid ? 'text-green-400' : ''}`}>
                        {item.invoice.isPaid ? formatEther(item.invoice.returnAmount) + ' ETH' : formatDate(item.invoice.dueDate)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>Your Ownership</span>
                      <span>{item.ownership.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${item.ownership}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};