import { Calendar, DollarSign, Shield, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { formatEther, formatDate, getRiskColor, getStatusBadge } from '@/utils/format';
import { motion } from 'framer-motion';

export const InvoiceCard = ({ invoice, onClick }) => {
  const riskColor = getRiskColor(invoice.riskScore);
  const status = getStatusBadge(invoice.isVerified, invoice.isPaid);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <Card hover className="cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">Invoice #{invoice.tokenId}</h3>
            <p className="text-gray-400 text-sm">{invoice.debtorName}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
            {status.label}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-400" />
            <div>
              <p className="text-xs text-gray-400">Face Value</p>
              <p className="font-semibold">{formatEther(invoice.faceValue)} ETH</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-400" />
            <div>
              <p className="text-xs text-gray-400">Due Date</p>
              <p className="font-semibold">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>
        </div>

        {/* Risk Score */}
        {invoice.isVerified && (
          <div className="glass p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${riskColor}`} />
                <span className="text-sm text-gray-400">Risk Score</span>
              </div>
              <span className={`text-2xl font-bold ${riskColor}`}>
                {invoice.riskScore}
              </span>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};