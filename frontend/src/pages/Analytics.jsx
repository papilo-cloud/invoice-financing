import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, Activity } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Spinner } from '@/components/common/Spinner';
import { useWeb3 } from '@/contexts/Web3Context';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const Analytics = () => {
  const { isConnected } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVolume: '0',
    activeInvoices: 0,
    totalInvestors: 0,
    avgRiskScore: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // In production, we'll fetch from subgraph or events
      // For demo, using mock data
      setStats({
        totalVolume: '2.5M',
        activeInvoices: 156,
        totalInvestors: 1200,
        avgRiskScore: 78,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for charts
  const volumeData = [
    { month: 'Jan', volume: 500 },
    { month: 'Feb', volume: 800 },
    { month: 'Mar', volume: 1200 },
    { month: 'Apr', volume: 1600 },
    { month: 'May', volume: 2000 },
    { month: 'Jun', volume: 2500 },
  ];

  const riskDistribution = [
    { name: 'Excellent (80-100)', value: 45, color: '#22c55e' },
    { name: 'Good (60-79)', value: 30, color: '#3b82f6' },
    { name: 'Moderate (40-59)', value: 20, color: '#fbbf24' },
    { name: 'Poor (0-39)', value: 5, color: '#ef4444' },
  ];

  const invoiceStatus = [
    { status: 'Active', count: 89 },
    { status: 'Paid', count: 52 },
    { status: 'Overdue', count: 15 },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Platform Analytics</h1>
          <p className="text-gray-400">
            Real-time insights into the invoice financing ecosystem
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="xl" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Total Volume</p>
                  <DollarSign className="w-5 h-5 text-primary-400" />
                </div>
                <p className="text-3xl font-bold text-primary-400">
                  ${stats.totalVolume}
                </p>
                <p className="text-sm text-green-400 mt-2">↑ 12% from last month</p>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Active Invoices</p>
                  <Activity className="w-5 h-5 text-accent-400" />
                </div>
                <p className="text-3xl font-bold">{stats.activeInvoices}</p>
                <p className="text-sm text-green-400 mt-2">↑ 8% from last month</p>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Total Investors</p>
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400">
                  {stats.totalInvestors}
                </p>
                <p className="text-sm text-green-400 mt-2">↑ 15% from last month</p>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Avg Risk Score</p>
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-blue-400">
                  {stats.avgRiskScore}
                </p>
                <p className="text-sm text-green-400 mt-2">↑ 3% from last month</p>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Volume Chart */}
              <Card>
                <h3 className="text-xl font-bold mb-6">Platform Volume (ETH)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ fill: '#0ea5e9', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Risk Distribution */}
              <Card>
                <h3 className="text-xl font-bold mb-6">Risk Score Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <Card>
              <h3 className="text-xl font-bold mb-6">Invoice Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={invoiceStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="status" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};