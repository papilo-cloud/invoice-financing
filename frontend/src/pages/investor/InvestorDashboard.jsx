import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  PieChart,
  ArrowUpRight,
  ArrowDownRight 
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { useWeb3 } from '@/contexts/Web3Context';
import { useDistributor } from '@/hooks/useDistributor';
import { useFractionalization } from '@/hooks/useFractionalization';
import { formatEther, formatCurrency } from '@/utils/format';
import { calculateROI } from '@/utils/helpers';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const InvestorDashboard = () => {
  const { account, isConnected } = useWeb3();
  const { getClaimable } = useDistributor();
  const [stats, setStats] = useState({
    totalInvested: '0',
    totalReturns: '0',
    activePositions: 0,
    claimableAmount: '0',
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (account) {
      loadDashboardData();
    }
  }, [account]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // In production, we'll fetch from events/subgraph
      // For demo, using mock data
      const mockChartData = [
        { date: 'Jan', value: 0 },
        { date: 'Feb', value: 150 },
        { date: 'Mar', value: 280 },
        { date: 'Apr', value: 450 },
        { date: 'May', value: 520 },
        { date: 'Jun', value: 650 },
      ];

      setChartData(mockChartData);
      
      setStats({
        totalInvested: '0',
        totalReturns: '0',
        activePositions: 0,
        claimableAmount: '0',
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
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
            Please connect your wallet to access the investor dashboard
          </p>
        </Card>
      </div>
    );
  }

  const roi = calculateROI(
    parseFloat(stats.totalInvested),
    parseFloat(stats.totalReturns)
  );

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Investor Dashboard</h1>
            <p className="text-gray-400">Track your investments and performance</p>
          </div>
          <Link to="/marketplace">
            <Button>
              Explore Marketplace
              <ArrowUpRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="xl" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Total Invested</p>
                  <Wallet className="w-5 h-5 text-primary-400" />
                </div>
                <p className="text-3xl font-bold mb-2">
                  {formatCurrency(stats.totalInvested)}
                </p>
                <p className="text-sm text-gray-400">Across {stats.activePositions} positions</p>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Total Returns</p>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400 mb-2">
                  {formatCurrency(stats.totalReturns)}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">{roi.toFixed(2)}% ROI</span>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Claimable</p>
                  <DollarSign className="w-5 h-5 text-accent-400" />
                </div>
                <p className="text-3xl font-bold text-accent-400 mb-2">
                  {formatCurrency(stats.claimableAmount)}
                </p>
                {parseFloat(stats.claimableAmount) > 0 ? (
                  <Link to="/portfolio">
                    <Button variant="secondary" className="w-full text-sm py-2">
                      Claim Now
                    </Button>
                  </Link>
                ) : (
                  <p className="text-sm text-gray-400">Nothing to claim</p>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Active Positions</p>
                  <PieChart className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold mb-2">{stats.activePositions}</p>
                <Link to="/portfolio" className="text-sm text-primary-400 hover:underline">
                  View All →
                </Link>
              </Card>
            </div>

            {/* Portfolio Value Chart */}
            <Card className="mb-8">
              <h3 className="text-xl font-bold mb-6">Portfolio Value Over Time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ fill: '#0ea5e9', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card hover className="cursor-pointer" onClick={() => window.location.href = '/marketplace'}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Browse Opportunities</h3>
                    <p className="text-sm text-gray-400">
                      Explore verified invoices in the marketplace
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>

              <Card hover className="cursor-pointer" onClick={() => window.location.href = '/portfolio'}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <PieChart className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Manage Portfolio</h3>
                    <p className="text-sm text-gray-400">
                      Track and claim your investment returns
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};