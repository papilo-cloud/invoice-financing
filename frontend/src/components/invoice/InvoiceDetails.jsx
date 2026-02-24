import { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Shield, 
  User, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { formatEther, formatDate, getRiskColor, getStatusBadge } from '@/utils/format';
import { copyToClipboard, openInExplorer } from '@/utils/helpers';
import { NETWORK_CONFIG } from '@/constants/addresses';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const InvoiceDetails = ({ tokenId, showActions = true, onFractionalize }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { getInvoice } = useInvoiceNFT();

  useEffect(() => {
    loadInvoice();
  }, [tokenId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await getInvoice(tokenId);
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Invoice Not Found</h3>
        <p className="text-gray-400">
          This invoice doesn't exist or has been removed
        </p>
      </Card>
    );
  }

  const status = getStatusBadge(invoice.isVerified, invoice.isPaid);
  const riskColor = getRiskColor(invoice.riskScore);
  const isExpired = invoice.dueDate < Math.floor(Date.now() / 1000);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold">Invoice #{tokenId}</h2>
              <button
                onClick={() => handleCopy(tokenId.toString())}
                className="glass-hover p-2 rounded-lg transition-all"
                title="Copy Invoice ID"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Created</span>
              <span className="font-medium">{formatDate(invoice.createdAt)}</span>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`px-4 py-2 rounded-full font-semibold ${status.bg} ${status.text} flex items-center gap-2`}>
            {invoice.isPaid ? (
              <CheckCircle className="w-4 h-4" />
            ) : invoice.isVerified ? (
              <Shield className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            {status.label}
          </div>
        </div>

        {/* Warning for expired invoices */}
        {isExpired && !invoice.isPaid && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-4 rounded-xl border border-red-500/30 bg-red-500/10 mb-6"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-semibold text-red-400">Invoice Expired</p>
                <p className="text-sm text-gray-400">
                  This invoice is past its due date and may not be valid for fractionalization
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Debtor</p>
                <p className="text-xl font-bold">{invoice.debtorName}</p>
              </div>
            </div>
          </div>

          {/* Face Value */}
          <div className="glass p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Face Value</p>
                <p className="text-xl font-bold text-green-400">
                  {formatEther(invoice.faceValue)} ETH
                </p>
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div className="glass p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full ${isExpired ? 'bg-red-500/20' : 'bg-blue-500/20'} flex items-center justify-center`}>
                <Calendar className={`w-5 h-5 ${isExpired ? 'text-red-400' : 'text-blue-400'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Due Date</p>
                <p className={`text-xl font-bold ${isExpired ? 'text-red-400' : ''}`}>
                  {formatDate(invoice.dueDate)}
                </p>
                {isExpired && (
                  <p className="text-xs text-red-400 mt-1">Expired</p>
                )}
              </div>
            </div>
          </div>

          {/* Risk Score */}
          {invoice.isVerified && (
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full bg-opacity-20 flex items-center justify-center`}>
                  <Shield className={`w-5 h-5 ${riskColor}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Risk Score</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-bold ${riskColor}`}>
                      {invoice.riskScore}
                    </p>
                    <p className="text-sm text-gray-400">/ 100</p>
                  </div>
                </div>
              </div>
              
              {/* Risk Score Bar */}
              <div className="mt-3">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${invoice.riskScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full ${
                      invoice.riskScore >= 80 ? 'bg-green-400' :
                      invoice.riskScore >= 60 ? 'bg-blue-400' :
                      invoice.riskScore >= 40 ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Issuer Information */}
        <div className="mt-6 glass p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Issued By</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono">{invoice.issuer.slice(0, 10)}...{invoice.issuer.slice(-8)}</code>
                <button
                  onClick={() => handleCopy(invoice.issuer)}
                  className="glass-hover p-1.5 rounded-lg transition-all"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => openInExplorer(invoice.issuer, 'address')}
              className="glass-hover px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all"
            >
              View on Explorer
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showActions && invoice.isVerified && !invoice.isPaid && !isExpired && onFractionalize && (
          <div className="mt-6">
            <Button onClick={onFractionalize} className="w-full">
              <DollarSign className="w-5 h-5" />
              Fractionalize Invoice
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-xl font-bold mb-6">Invoice Timeline</h3>
        
        <div className="space-y-4">
          {/* Created */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-primary-400" />
              </div>
              {(invoice.isVerified || invoice.isPaid) && (
                <div className="w-0.5 h-full bg-primary-500/20 mt-2" />
              )}
            </div>
            <div className="flex-1 pb-8">
              <p className="font-semibold">Invoice Created</p>
              <p className="text-sm text-gray-400">{formatDate(invoice.createdAt)}</p>
            </div>
          </div>

          {/* Verified */}
          {invoice.isVerified && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-400" />
                </div>
                {invoice.isPaid && (
                  <div className="w-0.5 h-full bg-blue-500/20 mt-2" />
                )}
              </div>
              <div className="flex-1 pb-8">
                <p className="font-semibold">Verified by Chainlink</p>
                <p className="text-sm text-gray-400">Risk Score: {invoice.riskScore}/100</p>
              </div>
            </div>
          )}

          {/* Paid */}
          {invoice.isPaid && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-400">Invoice Paid</p>
                <p className="text-sm text-gray-400">Payment received and distributed</p>
              </div>
            </div>
          )}

          {/* Due Date (Future) */}
          {!invoice.isPaid && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full ${isExpired ? 'bg-red-500/20' : 'bg-gray-500/20'} flex items-center justify-center`}>
                  <Calendar className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                  {isExpired ? 'Payment Overdue' : 'Payment Due'}
                </p>
                <p className="text-sm text-gray-400">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};