import { useState, useEffect } from 'react';
import { Shield, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useChainlinkVerification } from '@/hooks/useChainlinkVerification';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export const VerificationPanel = ({ invoice, tokenId, onVerified }) => {
  const { requestVerification, manualVerify, onVerificationFulfilled, isVerificationPending, loading } = useChainlinkVerification();
  const { getInvoice } = useInvoiceNFT();
  const [isPending, setIsPending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    setIsPending(isVerificationPending(tokenId));
  }, [tokenId, isVerificationPending]);

  useEffect(() => {
    const cleanup = onVerificationFulfilled(tokenId, (data) => {
      console.log('Verification fulfilled:', data);
      setIsPending(false);
      
      if (data.success) {
        toast.success(
          `Invoice verified! Risk Score: ${data.riskScore}/100`,
          { duration: 5000 }
        );
        
        if (onVerified) {
          onVerified(data);
        }
      } else {
        toast.error('Verification failed. Please try again.');
      }
    });

    return cleanup;
  }, [tokenId, onVerificationFulfilled, onVerified]);

  const handleChainlinkVerify = async () => {
    try {
      await requestVerification(tokenId);
      setIsPending(true);
      setShowOptions(false);
    } catch (error) {
      console.error('Verification error:', error);
    }
  };

  const handleManualVerify = async () => {
    try {
      await manualVerify(tokenId, 85);
      setShowOptions(false);
      if (onVerified) {
        onVerified({ riskScore: 85, success: true });
      }
    } catch (error) {
      console.error('Manual verification error:', error);
    }
  };

  // Already verified
  if (invoice.isVerified) {
    return (
      <Card className="border-2 border-green-500/30 bg-green-500/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-400 mb-1">Verified by Chainlink</h3>
            <p className="text-sm text-gray-400">
              Risk Score: <span className="font-bold text-green-400">{invoice.riskScore}/100</span>
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Verification pending
  if (isPending) {
    return (
      <Card className="border-2 border-blue-500/30 bg-blue-500/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-400 mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Verification in Progress
            </h3>
            <p className="text-sm text-gray-400">
              Chainlink is processing your request. This may take 1-2 minutes...
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-primary-500"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
          </div>
        </div>
      </Card>
    );
  }

  // Not verified - show options
  return (
    <Card className="border-2 border-yellow-500/30 bg-yellow-500/10">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-yellow-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-yellow-400 mb-1">Verification Required</h3>
          <p className="text-sm text-gray-400">
            Verify this invoice before you can fractionalize it
          </p>
        </div>
      </div>

      <AnimatePresence>
        {!showOptions ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              onClick={() => setShowOptions(true)}
              className="w-full"
              disabled={loading}
            >
              <Shield className="w-5 h-5" />
              Verify Invoice
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Chainlink Option */}
            <div className="glass p-4 rounded-xl">
              <div className="flex items-start gap-3 mb-3">
                <Shield className="w-5 h-5 text-primary-400 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Chainlink Functions</h4>
                  <p className="text-xs text-gray-400">
                    Decentralized verification using Chainlink oracle network
                  </p>
                </div>
              </div>
              <Button
                onClick={handleChainlinkVerify}
                loading={loading}
                className="w-full"
              >
                Verify with Chainlink
              </Button>
            </div>

            {/* Manual Option (for demo) */}
            <div className="glass p-4 rounded-xl">
              <div className="flex items-start gap-3 mb-3">
                <Clock className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Quick Verify (Demo)</h4>
                  <p className="text-xs text-gray-400">
                    Instant verification for testing (bypasses Chainlink)
                  </p>
                </div>
              </div>
              <Button
                onClick={handleManualVerify}
                variant="secondary"
                loading={loading}
                className="w-full"
              >
                Manual Verify
              </Button>
            </div>

            <button
              onClick={() => setShowOptions(false)}
              className="text-sm text-gray-400 hover:text-white transition-colors w-full text-center"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};