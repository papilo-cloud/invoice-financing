import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, CheckCircle, Shield } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { Modal } from '@/components/common/Modal';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { useWeb3 } from '@/contexts/Web3Context';
import { Link } from 'react-router-dom';

export const SubmitInvoice = () => {
  const navigate = useNavigate();
  const { isConnected } = useWeb3();
  const { createInvoice, loading } = useInvoiceNFT();
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdTokenId, setCreatedTokenId] = useState(null);

  const handleSubmit = async (formData) => {
    try {
      const result = await createInvoice(
        formData.debtorName,
        parseFloat(formData.faceValue),
        formData.dueDate
      );
      
      setCreatedTokenId(result.tokenId);
      setShowSuccess(true);

      setTimeout(() => {
        navigate(`/business/manage/${result.tokenId}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const handleViewNow = () => {
    setShowSuccess(false);
    navigate(`/business/manage/${createdTokenId}`);
  };

  const handleClose = () => {
    setShowSuccess(false);
    navigate('/business');
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <Card className="text-center max-w-md">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">
            Please connect your wallet to create an invoice
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link to="/business" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Invoice</h1>
          <p className="text-gray-400">
            Submit your invoice details to mint an NFT and prepare for fractionalization
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Invoice Details</h2>
                <p className="text-sm text-gray-400">Fill in the information below</p>
              </div>
            </div>
          </div>

          <InvoiceForm onSubmit={handleSubmit} loading={loading} />

          {/* Info Box */}
          <div className="mt-6 glass p-4 rounded-xl">
            <h3 className="font-semibold mb-2 text-sm">What happens next?</h3>
            <ol className="text-sm text-gray-400 space-y-2">
              <li className="flex gap-2">
                <span className="text-primary-400 font-semibold">1.</span>
                Your invoice NFT will be minted on-chain
              </li>
              <li className="flex gap-2">
                <span className="text-primary-400 font-semibold">2.</span>
                Chainlink Functions will verify the invoice
              </li>
              <li className="flex gap-2">
                <span className="text-primary-400 font-semibold">3.</span>
                Once verified, you can fractionalize and raise capital
              </li>
            </ol>
          </div>
        </Card>

        {/* Success Modal */}
        <Modal
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          title="Invoice Created Successfully!"
        >
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Invoice #{createdTokenId}</h3>
            <p className="text-gray-400 mb-6">
              Your invoice NFT has been minted successfully!
            </p>
            
            {/* Add next steps */}
            <div className="glass p-4 rounded-xl mb-6 text-left">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-400" />
                Next: Verify Your Invoice
              </h4>
              <p className="text-sm text-gray-400 mb-2">
                Before you can fractionalize, your invoice needs to be verified by Chainlink.
              </p>
              <p className="text-xs text-gray-500">
                This will calculate a risk score based on debtor reputation, amount, and due date.
              </p>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Redirecting to manage page in 2 seconds...
            </p>
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/business')} 
                className="flex-1"
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={handleViewNow}
                className="flex-1"
              >
                Verify Now
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};