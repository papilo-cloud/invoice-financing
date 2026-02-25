import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Wallet, TrendingUp } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { InvoiceCard } from '@/components/invoice/InvoiceCard';
import { useWeb3 } from '@/contexts/Web3Context';
import { useFractionalization } from '@/hooks/useFractionalization';
import { formatEther } from '@/utils/format';

export const BusinessDashboard = () => {
  const { account, isConnected } = useWeb3();
  const { getPendingWithdrawals, withdrawProceeds, loading } = useFractionalization();
  const [pendingProceeds, setPendingProceeds] = useState('0');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (account) {
      loadPendingProceeds();
    }
  }, [account]);

  const loadPendingProceeds = async () => {
    try {
      const amount = await getPendingWithdrawals(account);
      setPendingProceeds(amount);
    } catch (error) {
      console.error('Error loading pending proceeds:', error);
    }
  };

  const handleWithdraw = async () => {
    try {
      setWithdrawing(true);
      await withdrawProceeds();
      await loadPendingProceeds();
    } catch (error) {
      console.error('Error withdrawing:', error);
    } finally {
      setWithdrawing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Card className="text-center max-w-md">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">
            Please connect your wallet to access the business dashboard
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Business Dashboard</h1>
            <p className="text-gray-400">Manage your invoices and track proceeds</p>
          </div>
          <Link to="/business/submit">
            <Button>
              <Plus className="w-5 h-5" />
              Create Invoice
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Pending Proceeds</p>
                <p className="text-3xl font-bold text-primary-400">
                  {parseFloat(pendingProceeds).toFixed(4)} ETH
                </p>
              </div>
              <Wallet className="w-12 h-12 text-primary-400 opacity-50" />
            </div>
            {parseFloat(pendingProceeds) > 0 && (
              <Button
                onClick={handleWithdraw}
                loading={withdrawing}
                className="w-full mt-4"
              >
                Withdraw
              </Button>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Active Invoices</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <FileText className="w-12 h-12 text-accent-400 opacity-50" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Total Raised</p>
                <p className="text-3xl font-bold text-green-400">0 ETH</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-400 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Recent Invoices */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Your Invoices</h2>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">You haven't created any invoices yet</p>
            <Link to="/business/submit">
              <Button>
                <Plus className="w-5 h-5" />
                Create Your First Invoice
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};