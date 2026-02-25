import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Clock, DollarSign, Split } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Modal } from '@/components/common/Modal';
import { InvoiceNFTViewer } from '@/components/invoice/InvoiceNFTViewer';
import { VerificationPanel } from '@/components/invoice/VerificationPanel';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { useFractionalization } from '@/hooks/useFractionalization';
import { formatEther, formatDate } from '@/utils/format';
import { CONTRACTS } from '@/constants/addresses';

export const ManageInvoices = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const { getInvoice, approveNFT } = useInvoiceNFT();
  const { fractionalizeInvoice, loading: fractionalizing } = useFractionalization();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFractionalizeModal, setShowFractionalizeModal] = useState(false);
  const [fractionParams, setFractionParams] = useState({
    totalFractions: '100',
    pricePerFraction: '',
  });

  useEffect(() => {
    loadInvoice();
  }, [tokenId]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoice(tokenId);
      setInvoice(data);
      
      // Auto-calculate suggested price
      const suggestedPrice = (parseFloat(formatEther(data.faceValue)) * 0.96) / 100;
      setFractionParams(prev => ({
        ...prev,
        pricePerFraction: suggestedPrice.toFixed(4),
      }));
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = async (data) => {
    console.log('Invoice verified:', data);
    // Reload invoice to show updated status
    await loadInvoice();
  };

  const handleFractionalize = async () => {
    try {
      // First approve the NFT
      await approveNFT(tokenId, CONTRACTS.FRACTIONALIZATION_POOL);
      
      // Then fractionalize
      await fractionalizeInvoice(
        tokenId,
        parseInt(fractionParams.totalFractions),
        parseFloat(fractionParams.pricePerFraction)
      );
      
      setShowFractionalizeModal(false);
      navigate('/business');
    } catch (error) {
      console.error('Error fractionalizing:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Card className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Invoice Not Found</h2>
          <p className="text-gray-400 mb-6">This invoice doesn't exist</p>
          <Button onClick={() => navigate('/business')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/business')}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Invoice Details */}
          <div className="space-y-6">
            <Card>
              <h2 className="text-2xl font-bold mb-6">Invoice #{tokenId}</h2>
              
              {/* Status Badge */}
              <div className="mb-6">
                {invoice.isPaid ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    Paid
                  </div>
                ) : invoice.isVerified ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 text-blue-400">
                    <Shield className="w-4 h-4" />
                    Verified
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400">
                    <Clock className="w-4 h-4" />
                    Pending Verification
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="space-y-4">
                <div className="glass p-4 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">Debtor</p>
                  <p className="text-xl font-semibold">{invoice.debtorName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-xl">
                    <p className="text-sm text-gray-400 mb-1">Face Value</p>
                    <p className="text-xl font-semibold text-primary-400">
                      {formatEther(invoice.faceValue)} ETH
                    </p>
                  </div>

                  <div className="glass p-4 rounded-xl">
                    <p className="text-sm text-gray-400 mb-1">Due Date</p>
                    <p className="text-xl font-semibold">{formatDate(invoice.dueDate)}</p>
                  </div>
                </div>

                {invoice.isVerified && (
                  <div className="glass p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Risk Score</p>
                        <p className="text-3xl font-bold text-primary-400">
                          {invoice.riskScore}/100
                        </p>
                      </div>
                      <Shield className="w-12 h-12 text-primary-400 opacity-50" />
                    </div>
                  </div>
                )}
              </div>

              {invoice.isVerified && !invoice.isPaid && (
                <div className="mt-6">
                  <Button
                    onClick={() => setShowFractionalizeModal(true)}
                    className="w-full"
                  >
                    <Split className="w-5 h-5" />
                    Fractionalize Invoice
                  </Button>
                </div>
              )}
            </Card>

            {/* Verification Panel */}
            <VerificationPanel 
              invoice={invoice} 
              tokenId={parseInt(tokenId)}
              onVerified={handleVerified}
            />

            {invoice.isVerified && !invoice.isPaid && (
              <Card>
                <h3 className="text-xl font-bold mb-4">Next Steps</h3>
                <Button
                  onClick={() => setShowFractionalizeModal(true)}
                  className="w-full"
                >
                  <Split className="w-5 h-5" />
                  Fractionalize Invoice
                </Button>
              </Card>
            )}
          </div>

          {/* NFT Viewer */}
          <div>
            <Card>
              <h3 className="text-xl font-bold mb-4">Invoice NFT</h3>
              <InvoiceNFTViewer tokenId={tokenId} />
            </Card>
          </div>
        </div>

        {/* Fractionalize Modal */}
        <Modal
          isOpen={showFractionalizeModal}
          onClose={() => setShowFractionalizeModal(false)}
          title="Fractionalize Invoice"
        >
          <div className="space-y-6">
            <div className="glass p-4 rounded-xl">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Invoice Value</p>
                  <p className="font-semibold">{formatEther(invoice.faceValue)} ETH</p>
                </div>
                <div>
                  <p className="text-gray-400">Risk Score</p>
                  <p className="font-semibold">{invoice.riskScore}/100</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Total Fractions
              </label>
              <input
                type="number"
                value={fractionParams.totalFractions}
                onChange={(e) => setFractionParams({ ...fractionParams, totalFractions: e.target.value })}
                className="input-field"
                min="1"
                max="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Price per Fraction (ETH)
              </label>
              <input
                type="number"
                value={fractionParams.pricePerFraction}
                onChange={(e) => setFractionParams({ ...fractionParams, pricePerFraction: e.target.value })}
                className="input-field"
                step="0.0001"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-2">
                Suggested: 96% of face value divided by fractions
              </p>
            </div>

            {/* Summary */}
            <div className="glass p-4 rounded-xl">
              <h4 className="font-semibold mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Raise</span>
                  <span className="font-semibold">
                    {(parseFloat(fractionParams.totalFractions) * parseFloat(fractionParams.pricePerFraction)).toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform Fee (2.5%)</span>
                  <span className="font-semibold">
                    {((parseFloat(fractionParams.totalFractions) * parseFloat(fractionParams.pricePerFraction)) * 0.025).toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex justify-between text-primary-400 font-semibold pt-2 border-t border-white/10">
                  <span>You Receive</span>
                  <span>
                    {((parseFloat(fractionParams.totalFractions) * parseFloat(fractionParams.pricePerFraction)) * 0.975).toFixed(4)} ETH
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleFractionalize}
              loading={fractionalizing}
              className="w-full"
            >
              Fractionalize Invoice
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};