import { useState, useEffect } from 'react';
import { Plus, FileText, Wallet, TrendingUp, Eye } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { useWeb3 } from '@/contexts/Web3Context';
import { useFractionalization } from '@/hooks/useFractionalization';
import { formatEther, formatDate } from '@/utils/format';
import { Contract, JsonRpcProvider } from 'ethers';
import { CONTRACTS } from '@/constants/addresses';
import { INVOICE_NFT_ABI } from '@/constants/abis';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { useNavigate } from 'react-router-dom';

export const BusinessDashboard = () => {
  const { account, isConnected, provider } = useWeb3();
  const { getPendingWithdrawals, withdrawProceeds } = useFractionalization();
  const [withdrawing, setWithdrawing] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    activeInvoices: 0,
    pendingProceeds: '0',
    totalRaised: '0',
  });
  const [loading, setLoading] = useState(true);
  const { getInvoice } = useInvoiceNFT();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected && account) {
      loadInvoices();
      loadStats();
    }
  }, [isConnected, account]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      console.log('Loading invoices for account:', account);

      const readProvider = provider || new JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL);
      const contract = new Contract(CONTRACTS.INVOICE_NFT, INVOICE_NFT_ABI, readProvider);

      const filter = contract.filters.InvoiceCreated(null, account);
      const events = await contract.queryFilter(filter, 0, 'latest');

      const invoicePromises = await events.map(async (event) => {
        try {
          const tokenId = Number(event.args.tokenId);
          const invoiceData = await getInvoice(tokenId);
          return {
            tokenId,
            ...invoiceData,
            // debtorName: invoiceData.debtorName,
            // faceValue: formatEther(invoiceData.faceValue),
            // dueDate: formatDate(invoiceData.dueDate.toNumber() * 1000),
            // status: invoiceData.status,
          };
        } catch (error) {
          console.error('Error loading invoice data for tokenId:', event.args.tokenId, error);
          return null;
        }
      });

      const loadedInvoices = (await Promise.all(invoicePromises))
        .filter(Boolean)
        .sort((a, b) => b.createdAt - a.createdAt); // Sort by most recent

      setInvoices(loadedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      let proceeds = '0';
      try {
        proceeds = await getPendingWithdrawals(account);
      } catch (error) {
        console.error('Error fetching pending proceeds:', error);
      }

      setStats({
        activeInvoices: invoices.filter(inv => !inv.isPaid).length,
        pendingProceeds: proceeds,
        totalRaised: '0', // Calculate from invoices if needed
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };


  const handleWithdraw = async () => {
    try {
      setWithdrawing(true);
      await withdrawProceeds();
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Business Dashboard</h1>
            <p className="text-gray-400">Manage your invoices and track proceeds</p>
          </div>
          <Button onClick={() => navigate('/business/submit')}>
            <Plus className="w-5 h-5" />
            Create Invoice
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Pending Proceeds</p>
                <p className="text-3xl font-bold text-primary-500">
                  {formatEther(stats.pendingProceeds)} ETH
                </p>
              </div>
              <Wallet className="w-12 h-12 text-primary-500 opacity-50" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Invoices</p>
                <p className="text-3xl font-bold">{invoices.length}</p>
              </div>
              <FileText className="w-12 h-12 text-white opacity-50" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Raised</p>
                <p className="text-3xl font-bold text-green-400">0 ETH</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-400 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Invoices Section */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Invoices</h2>
            {invoices.length > 0 && (
              <Button 
                variant="secondary" 
                onClick={() => navigate('/business/submit')}
              >
                <Plus className="w-5 h-5" />
                New Invoice
              </Button>
            )}
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-400">
                You haven't created any invoices yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first invoice to get started with invoice financing
              </p>
              <Button onClick={() => navigate('/business/submit')}>
                <Plus className="w-5 h-5" />
                Create Your First Invoice
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.tokenId}
                  className="glass p-6 rounded-xl border border-gray-700 hover:border-primary-500/50 transition-all cursor-pointer"
                  onClick={() => navigate(`/business/manage/${invoice.tokenId}`)}
                >
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-mono text-gray-400">
                      #{invoice.tokenId}
                    </span>
                    {invoice.isPaid ? (
                      <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30">
                        Paid
                      </span>
                    ) : invoice.isVerified ? (
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
                        Verified
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold border border-yellow-500/30">
                        Pending
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-lg mb-2">{invoice.debtorName}</h3>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Amount</span>
                      <span className="font-semibold text-primary-500">
                        {formatEther(invoice.faceValue)} ETH
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Due Date</span>
                      <span className="font-semibold">
                        {formatDate(invoice.dueDate)}
                      </span>
                    </div>
                    {invoice.isVerified && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Risk Score</span>
                        <span className="font-semibold text-green-400">
                          {invoice.riskScore}/100
                        </span>
                      </div>
                    )}
                  </div>

                  <button className="w-full py-2 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-all flex items-center justify-center gap-2 text-sm font-semibold">
                    <Eye className="w-4 h-4" />
                    Manage
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Withdraw Proceeds */}
        {formatEther(stats.pendingProceeds) > 0 && (
          <Card className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Pending Proceeds</h3>
                <p className="text-gray-400">
                  You have <span className='text-primary-500 font-bold'>
                    {formatEther(stats.pendingProceeds)} ETH   
                  </span> ready to withdraw
                </p>
              </div>
              <Button 
                onClick={handleWithdraw}
                loading={withdrawing}
              >
                Withdraw Proceeds
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};