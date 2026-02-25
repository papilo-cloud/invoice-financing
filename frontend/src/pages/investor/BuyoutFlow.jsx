import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Modal } from '@/components/common/Modal';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { useFractionalization } from '@/hooks/useFractionalization';
import { useWeb3 } from '@/contexts/Web3Context';
import { formatEther, formatCurrency } from '@/utils/format';
import { parseEther } from 'ethers';
import toast from 'react-hot-toast';

export const BuyoutFlow = () => {
  const { fractionId } = useParams();
  const navigate = useNavigate();
  const { account, isConnected } = useWeb3();
  const { getInvoice } = useInvoiceNFT();
  const { getFractionInfo, initiateBuyout, claimBuyoutPayment, finalizeBuyout } = useFractionalization();

  const [fraction, setFraction] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyoutCost, setBuyoutCost] = useState('0');
  const [step, setStep] = useState('initiate'); // initiate, claim, finalize
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (fractionId) {
      loadData();
    }
  }, [fractionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const fractionInfo = await getFractionInfo(parseInt(fractionId));
      setFraction(fractionInfo);

      const invoiceData = await getInvoice(fractionInfo.invoiceTokenId);
      setInvoice(invoiceData);

      // Calculate buyout cost (110% of current value)
      const pricePerFraction = parseFloat(fractionInfo.pricePerFraction);
      const circulatingSupply = fractionInfo.fractionsSold;
      const cost = pricePerFraction * circulatingSupply * 1.1;
      setBuyoutCost(cost.toFixed(4));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load buyout data');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateBuyout = async () => {
    try {
      await initiateBuyout(parseInt(fractionId), parseFloat(buyoutCost));
      setStep('claim');
      setShowSuccess(true);
      toast.success('Buyout initiated! Fraction holders can now claim.');
    } catch (error) {
      console.error('Error initiating buyout:', error);
    }
  };

  const handleClaimBuyout = async () => {
    try {
      await claimBuyoutPayment(parseInt(fractionId));
      toast.success('Buyout payment claimed!');
      await loadData();
    } catch (error) {
      console.error('Error claiming buyout:', error);
    }
  };

  const handleFinalizeBuyout = async () => {
    try {
      await finalizeBuyout(parseInt(fractionId));
      setShowSuccess(true);
      toast.success('Buyout finalized! You now own the invoice NFT.');
      setTimeout(() => navigate('/portfolio'), 2000);
    } catch (error) {
      console.error('Error finalizing buyout:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Card className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to proceed</p>
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Invoice Buyout</h1>
          <p className="text-gray-400">
            Purchase all outstanding fractions at a 10% premium
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'initiate' ? 'text-primary-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'initiate' ? 'bg-primary-500' : 'bg-gray-700'}`}>
                1
              </div>
              <span className="font-semibold">Initiate</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-700 mx-4" />
            <div className={`flex items-center gap-2 ${step === 'claim' ? 'text-primary-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'claim' ? 'bg-primary-500' : 'bg-gray-700'}`}>
                2
              </div>
              <span className="font-semibold">Claim</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-700 mx-4" />
            <div className={`flex items-center gap-2 ${step === 'finalize' ? 'text-primary-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'finalize' ? 'bg-primary-500' : 'bg-gray-700'}`}>
                3
              </div>
              <span className="font-semibold">Finalize</span>
            </div>
          </div>
        </Card>

        {/* Invoice Info */}
        <Card className="mb-8">
          <h3 className="text-xl font-bold mb-4">Invoice Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-xl">
              <p className="text-sm text-gray-400 mb-1">Invoice ID</p>
              <p className="text-xl font-bold">#{fraction?.invoiceTokenId}</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-sm text-gray-400 mb-1">Debtor</p>
              <p className="text-xl font-bold">{invoice?.debtorName}</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-sm text-gray-400 mb-1">Face Value</p>
              <p className="text-xl font-bold text-green-400">
                {invoice ? formatEther(invoice.faceValue) : '0'} ETH
              </p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-sm text-gray-400 mb-1">Risk Score</p>
              <p className="text-xl font-bold text-primary-400">
                {invoice?.riskScore}/100
              </p>
            </div>
          </div>
        </Card>

        {/* Buyout Cost */}
        <Card className="mb-8">
          <h3 className="text-xl font-bold mb-4">Buyout Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-lg">
              <span className="text-gray-400">Fractions Sold</span>
              <span className="font-semibold">{fraction?.fractionsSold}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-400">Price per Fraction</span>
              <span className="font-semibold">{fraction?.pricePerFraction} ETH</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-400">Premium (10%)</span>
              <span className="font-semibold text-accent-400">
                {(parseFloat(buyoutCost) * 0.1).toFixed(4)} ETH
              </span>
            </div>
            <div className="pt-4 border-t border-white/10 flex justify-between">
              <span className="text-xl font-bold">Total Cost</span>
              <span className="text-3xl font-bold text-primary-400">
                {buyoutCost} ETH
              </span>
            </div>
          </div>
        </Card>

        {/* Warning */}
        <Card className="mb-8 border-2 border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-yellow-400 mb-2">Important Information</p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• You'll pay a 10% premium over the current fraction price</li>
                <li>• All fraction holders must claim their payout</li>
                <li>• You can finalize once all fractions are claimed</li>
                <li>• The invoice NFT will be transferred to you upon finalization</li>
              </ul>
            </div>
          </div>
        </Card>

        {step === 'initiate' && (
          <Button onClick={handleInitiateBuyout} className="w-full">
            <ShoppingCart className="w-5 h-5" />
            Initiate Buyout for {buyoutCost} ETH
          </Button>
        )}

        {step === 'claim' && (
          <div className="space-y-4">
            <Button onClick={handleClaimBuyout} className="w-full">
              Claim Buyout Payment
            </Button>
            <Button onClick={handleFinalizeBuyout} variant="secondary" className="w-full">
              Finalize Buyout (Get NFT)
            </Button>
          </div>
        )}

        {/* Success Modal */}
        <Modal
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          title="Success!"
        >
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">
              {step === 'initiate' ? 'Buyout Initiated!' : 'Buyout Complete!'}
            </h3>
            <p className="text-gray-400 mb-6">
              {step === 'initiate' 
                ? 'Fraction holders can now claim their payouts'
                : 'You now own the invoice NFT'}
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
};