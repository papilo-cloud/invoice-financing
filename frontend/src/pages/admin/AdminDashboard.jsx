import { useState, useEffect } from 'react';
import { Shield, Download, AlertTriangle, DollarSign } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useWeb3 } from '@/contexts/Web3Context';
import { useFractionalization } from '@/hooks/useFractionalization';
import toast from 'react-hot-toast';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { formatEther } from '@/utils/format';

export const AdminDashboard = () => {
  const { account, signer, isConnected } = useWeb3();
  const { emergencyRelease, withdrawPlatformFees, getPlatformFees, loading } = useFractionalization();
  const {getAdmin} = useInvoiceNFT();
  const [isAdmin, setIsAdmin] = useState(false);
  const [releaseFractionId, setReleaseFractionId] = useState('');
  const [releaseRecipient, setReleaseRecipient] = useState('');
  const [platformFees, setPlatformFees] = useState(null);

  useEffect(() => {
    checkAdmin();
    getPlatformFeesValue();
  }, [account]);

  const getPlatformFeesValue = async () => {
    try {
      const fees = await getPlatformFees();
      setPlatformFees(fees);
      console.log(fees)
    } catch (error) {
      console.error('Error getting platform fees:', error);
    }
  };

  const checkAdmin = async () => {
    try {
      const admin = await getAdmin();
      console.log(account, admin, signer);
      setIsAdmin(admin.toString().toLowerCase() === account.toString().toLowerCase());
    } catch (error) {
      console.error('Error checking admin:', error);
      setIsAdmin(false);
    }
  };

  const handleEmergencyRelease = async () => {
    if (!releaseFractionId) {
      toast.error('Please enter a fraction ID');
      return;
    }
    if (!releaseRecipient) {
      toast.error('Please enter a recipient address');
      return;
    }

    try {
      await emergencyRelease(parseInt(releaseFractionId), releaseRecipient);
      setReleaseFractionId('');
      setReleaseRecipient('');
    } catch (error) {
      console.error('Release error:', error);
    }
  };

  const handleWithdrawFees = async () => {
    try {
      await withdrawPlatformFees();
      toast.success('Platform fees withdrawn!', { id: 'withdraw-fees' });
    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error(error.reason || 'Failed to withdraw fees', { id: 'withdraw-fees' });
    } 
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Card className="text-center max-w-md">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Admin Access</h2>
          <p className="text-gray-400">Please connect your wallet</p>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Card className="text-center max-w-md border-2 border-red-500/30">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-red-400">Access Denied</h2>
          <p className="text-gray-400">
            You don't have admin privileges
          </p>
          <p className="text-xs text-gray-500 mt-4 font-mono">
            Connected: {account}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary-500" />
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-gray-400">Platform management and emergency controls</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Platform Fees</p>
                <p className="text-3xl font-bold text-green-400">{platformFees ? formatEther(platformFees) : '0.0000'} ETH</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-400 opacity-50" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Invoices</p>
                <p className="text-3xl font-bold">-</p>
              </div>
              <Shield className="w-12 h-12 text-white opacity-50" />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-green-400" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Withdraw Platform Fees</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Withdraw accumulated platform fees (2.5% from sales) to the admin wallet
                </p>

                <Button 
                  onClick={handleWithdrawFees}
                  loading={loading}
                  className="bg-green-500 hover:bg-green-400"
                >
                  <Download className="w-5 h-5" />
                  Withdraw Fees
                </Button>
              </div>
            </div>
          </Card>

          {/* Emergency Release NFT */}
          <Card className="border-2 border-red-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2 text-red-400">
                  Emergency Release NFT
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Release an NFT from the contract in case of emergency. 
                  <span className="text-red-400 font-semibold"> Use with extreme caution!</span>
                </p>

                <div className="flex gap-3">
                  <input
                    type="number"
                    value={releaseFractionId}
                    onChange={(e) => setReleaseFractionId(e.target.value)}
                    placeholder="Enter Fraction ID (not token ID)"
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <input
                    type="text"
                    value={releaseRecipient}
                    onChange={(e) => setReleaseRecipient(e.target.value)}
                    placeholder="Recipient Address (0x...)"
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />

                  <Button 
                    onClick={handleEmergencyRelease}
                    loading={loading}
                    variant="secondary"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    Release
                  </Button>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-400">
                    Requirements:
                    <br />• Invoice must be 30+ days overdue
                    <br />• All fractions must be burned/redeemed
                    <br />• This will transfer the NFT to the recipient
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};