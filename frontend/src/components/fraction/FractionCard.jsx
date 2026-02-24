import { ShoppingCart, TrendingUp, Users, Percent } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { formatEther } from '@/utils/format';
import { motion } from 'framer-motion';

export const FractionCard = ({ fraction, invoice, onBuy }) => {
  const soldPercentage = (fraction.fractionsSold / fraction.totalFractions) * 100;
  const available = fraction.totalFractions - fraction.fractionsSold;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">
              Invoice #{fraction.invoiceTokenId}
            </h3>
            <p className="text-gray-400 text-sm">{invoice?.debtorName || 'Loading...'}</p>
          </div>
          {invoice?.riskScore && (
            <div className="glass px-3 py-1 rounded-full">
              <span className="text-sm font-semibold text-primary-400">
                Risk: {invoice.riskScore}
              </span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="font-semibold">{soldPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${soldPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="glass p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-primary-400" />
              <span className="text-xs text-gray-400">Price per Fraction</span>
            </div>
            <p className="font-bold">{formatEther(fraction.pricePerFraction)} ETH</p>
          </div>

          <div className="glass p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-accent-400" />
              <span className="text-xs text-gray-400">Available</span>
            </div>
            <p className="font-bold">{available} / {fraction.totalFractions}</p>
          </div>
        </div>

        {invoice?.faceValue && (
          <div className="glass p-3 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400">Expected Return</span>
              </div>
              <span className="font-bold text-green-400">
                {((parseFloat(formatEther(invoice.faceValue)) / fraction.totalFractions / parseFloat(formatEther(fraction.pricePerFraction)) - 1) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        <Button 
          onClick={() => onBuy(fraction)}
          className="w-full"
          disabled={!fraction.isActive || available === 0}
        >
          <ShoppingCart className="w-5 h-5" />
          {available > 0 ? 'Buy Fractions' : 'Sold Out'}
        </Button>
      </Card>
    </motion.div>
  );
};