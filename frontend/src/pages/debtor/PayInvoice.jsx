import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DollarSign, Shield, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { InvoiceDetails } from '@/components/invoice/InvoiceDetails';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { useDistributor } from '@/hooks/useDistributor';
import { useWeb3 } from '@/contexts/Web3Context';
import { formatEther, formatCurrency } from '@/utils/format';
import { openInExplorer } from '@/utils/helpers';
import { parseEther } from 'ethers';
import toast from 'react-hot-toast';

export const PayInvoice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isConnected, account } = useWeb3();
  const { getInvoice } = useInvoiceNFT();
  const { receivePayment, loading: paying } = useDistributor();

  const [invoiceId, setInvoiceId] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setInvoiceId(id);
      loadInvoice(id);
    }
  }, [searchParams]);

  const loadInvoice = async (id) => {
    try {
      setLoading(true);
      const data = await getInvoice(id);
      setInvoice(data);
      setPaymentAmount(formatEther(data.faceValue));
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!invoiceId) {
      toast.error('Please enter an invoice ID');
      return;
    }
    loadInvoice(invoiceId);
  };

  const handlePayment = async () => {
    if (!invoice) return;

    try {
      const amount = parseFloat(paymentAmount);
      const faceValue = parseFloat(formatEther(invoice.faceValue));
      const minAcceptable = faceValue * 0.9;

      if (amount < minAcceptable) {
        toast.error(`Payment must be at least ${minAcceptable.toFixed(4)} ETH (90% of face value)`);
        return;
      }

      await receivePayment(parseInt(invoiceId), amount);
      
      setShowSuccess(true);
      toast.success('Payment successful!');
      
      setTimeout(() => {
        loadInvoice(invoiceId);
      }, 2000);
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Card className="text-center max-w-md">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">
            Please connect your wallet to pay an invoice
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Pay Invoice</h1>
          <p className="text-gray-400">
            Enter an invoice ID to view details and make payment
          </p>
        </div>

        {/* Search Card */}
        <Card className="mb-8">
          <form onSubmit={handleSearch}>
            <label className="block text-sm font-medium mb-2">Invoice ID</label>
            <div className="flex gap-3">
              <input
                type="number"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="input-field flex-1"
                placeholder="Enter invoice token ID (e.g. 0, 1, 2...)"
                min="0"
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Search'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Invoice Details */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="xl" />
          </div>
        ) : invoice ? (
          <>
            {invoice.isPaid && (
              <Card className="mb-8 border-2 border-green-500/30 bg-green-500/10">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="font-bold text-green-400">Invoice Already Paid</p>
                    <p className="text-sm text-gray-400">
                      This invoice has already been paid and distributed to investors
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {!invoice.isVerified && (
              <Card className="mb-8 border-2 border-yellow-500/30 bg-yellow-500/10">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                  <div>
                    <p className="font-bold text-yellow-400">Invoice Not Verified</p>
                    <p className="text-sm text-gray-400">
                      This invoice has not been verified by Chainlink and cannot accept payments
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <InvoiceDetails tokenId={parseInt(invoiceId)} showActions={false} />

            {invoice.isVerified && !invoice.isPaid && (
              <Card className="mt-8">
                <h3 className="text-2xl font-bold mb-6">Make Payment</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Payment Amount (ETH)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="input-field pl-12"
                        placeholder="0.00"
                        step="0.0001"
                        min="0"
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-gray-400">
                        Face Value: {formatEther(invoice.faceValue)} ETH
                      </span>
                      <span className="text-gray-400">
                        Min: {(parseFloat(formatEther(invoice.faceValue)) * 0.9).toFixed(4)} ETH (90%)
                      </span>
                    </div>
                  </div>

                  <div className="glass p-4 rounded-xl space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Debtor</span>
                      <span className="font-semibold">{invoice.debtorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Invoice Value</span>
                      <span className="font-semibold">{formatEther(invoice.faceValue)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Risk Score</span>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary-400" />
                        <span className="font-semibold">{invoice.riskScore}/100</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex justify-between">
                      <span className="font-semibold">You Pay</span>
                      <span className="text-2xl font-bold text-primary-400">
                        {paymentAmount || '0'} ETH
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePayment}
                    loading={paying}
                    disabled={!paymentAmount || parseFloat(paymentAmount) === 0}
                    className="w-full"
                  >
                    <DollarSign className="w-5 h-5" />
                    Pay Invoice
                  </Button>

                  <div className="glass p-4 rounded-xl">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      What happens next?
                    </h4>
                    <ol className="text-sm text-gray-400 space-y-2">
                      <li className="flex gap-2">
                        <span className="text-primary-400 font-semibold">1.</span>
                        Payment is distributed to all fraction holders
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary-400 font-semibold">2.</span>
                        Invoice is marked as paid on-chain
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary-400 font-semibold">3.</span>
                        Investors can claim their proportional payouts
                      </li>
                    </ol>
                  </div>
                </div>
              </Card>
            )}

            {showSuccess && (
              <Card className="mt-8 border-2 border-green-500/30">
                <div className="text-center py-6">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Payment Successful!</h3>
                  <p className="text-gray-400 mb-6">
                    Invoice #{invoiceId} has been paid and funds are ready for distribution
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate('/')} variant="secondary">
                      Go Home
                    </Button>
                    {txHash && (
                      <Button onClick={() => openInExplorer(txHash, 'tx')}>
                        View Transaction
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Enter an invoice ID above to get started</p>
          </Card>
        )}
      </div>
    </div>
  );
};