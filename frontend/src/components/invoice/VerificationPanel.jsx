import { useState, useEffect } from 'react';
import { Shield, Loader2, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useVerifier } from '@/hooks/useVerifier';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export const VerificationPanel = ({ invoice, tokenId, onVerified }) => {
  const { manualVerify, getVerification, onVerificationReceived, loading } = useVerifier();
  const [verification, setVerification] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showManualOption, setShowManualOption] = useState(false);

  useEffect(() => {
    const loadVerification = async () => {
      if (tokenId !== undefined) {
        setIsChecking(true);
        try {
          const data = await getVerification(tokenId);
          setVerification(data);
        } catch (error) {
          console.error('Error loading verification:', error);
        } finally {
          setIsChecking(false);
        }
      }
    };

    loadVerification()
  }, [tokenId]);

  useEffect(() => {
    if (tokenId === undefined) return;
    
    const cleanup = onVerificationReceived(tokenId, (data) => {
      console.log('CRE verification received:', data);

      setVerification({
        riskScore: data.riskScore,
        isVerified: data.success,
        verifiedAt: data.timestamp,
      });

      if (data.success) {
        toast.success(
          `Invoice verified automatically! Risk Score: ${data.riskScore}/100`,
          { duration: 5000, icon: '🎉' }
        );
        
        if (onVerified) {
          onVerified(data);
        }
      }
    });

    return cleanup;
  }, [tokenId])
  

  const handleManualVerify = async () => {
    try {
      await manualVerify(tokenId, 45);
      
      setVerification({
        riskScore: 45,
        isVerified: true,
        verifiedAt: Math.floor(Date.now() / 1000),
      });

      setShowManualOption(false);
      if (onVerified) {
        onVerified({ riskScore: 45, success: true });
      }
    } catch (error) {
      console.error('Manual verification error:', error);
    }
  };

  if (isChecking) {
    return (
      <Card className="border-2 border-gray-500/30 bg-gray-500/10">
        <div className="flex items-center gap-4">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <p className="text-gray-400">Checking verification status...</p>
        </div>
      </Card>
    );
  }

  // Already verified
  if (invoice?.isVerified || verification?.isVerified) {
    const riskScore = verification?.riskScore || invoice?.riskScore || 0;
    const verifiedAt = verification?.verifiedAt || 0;
    
    return (
      <Card className="border-2 border-green-500/30 bg-green-500/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-400 mb-1">Verified by Chainlink</h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-400">
                Risk Score: <span className="font-bold text-green-400">{riskScore}/100</span>
              </span>
              {verifiedAt > 0 && (
                <span className="text-gray-500 text-xs">
                  {new Date(verifiedAt * 1000).toLocaleString()}
                </span>
              )}
            </div>
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

      <AnimatePresence mode='wait'>
        {!showManualOption ? (
          <motion.div
            key="automatic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='space-y-4'
          >
            {/* Automatic Verification Status */}
            <div className="glass p-4 rounded-xl">
              <div className="flex items-start gap-3 mb-3">
                <div className="relative">
                  <Zap className="w-5 h-5 text-primary-400" />
                  <motion.div
                    className="absolute -inset-1 bg-primary-500/20 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1 flex items-center gap-2">
                    Automatic Verification
                    <span className="text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded-full">
                      CRE Workflow
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Chainlink Runtime Environment is automatically verifying this invoice. 
                    This typically takes 30-60 seconds.
                  </p>
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Verification in progress...</span>
                  <Clock className="w-3 h-3 animate-pulse" />
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 via-blue-500 to-primary-500"
                    style={{ width: '100%' }}
                    animate={{ 
                      x: ['-100%', '100%'],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: 'easeInOut'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Manual verify option for testing */}
            <Button
              onClick={() => setShowManualOption(true)}
              className="w-full"
              disabled={loading}
            >
              <Shield className="w-5 h-5" />
              Or use manual verification for testing →
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key='manual'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Manual Verification (for demo) */}
            <div className="glass p-4 rounded-xl">
              <div className="flex items-start gap-3 mb-3">
                <Clock className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Manual Verify (Demo)</h4>
                  <p className="text-xs text-gray-400">
                    Instant verification for testing (bypasses CRE workflow.)
                  </p>
                </div>
              </div>
              <Button
                onClick={handleManualVerify}
                variant="secondary"
                loading={loading}
                className="w-full"
              >
                {loading ? 'Verifying...' : 'Manual Verify'}
              </Button>
            </div>

            <button
              onClick={() => setShowManualOption(false)}
              className="text-sm text-gray-400 hover:text-white transition-colors w-full text-center"
            >
             ← Back to automatic verification
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};