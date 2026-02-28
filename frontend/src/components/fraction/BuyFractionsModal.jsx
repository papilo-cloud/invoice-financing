import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { formatEther } from '@/utils/format';
import { Minus, Plus, ShoppingCart } from 'lucide-react';

export const BuyFractionsModal = ({ isOpen, onClose, fraction, onBuy, loading }) => {
  const [amount, setAmount] = useState(1);
  
  const available = fraction.totalFractions - fraction.fractionsSold;

  const calculateTotalCost = () => {
    if (!fraction || !fraction.pricePerFraction) return '0';

    try {
      const price = BigInt(fraction.pricePerFraction);
      const qty = BigInt(amount);
      const total = price * qty;
      return formatEther(total);
    } catch (error) {
      console.error('Error calculating total cost:', error);
      return '0';
    }
  }

  const totalCost = calculateTotalCost();

  const handleAmountChange = (delta) => {
    const newAmount = amount + delta;
    if (newAmount >= 1 && newAmount <= available) {
      setAmount(newAmount);
    }
  };

  const handleSubmit = () => {
    onBuy(fraction.fractionId, amount, formatEther(fraction.pricePerFraction));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buy Fractions" size="md">
      <div className="space-y-6">
        <div className="glass p-4 rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Invoice ID</p>
              <p className="font-semibold">#{fraction.invoiceTokenId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Price per Fraction</p>
              <p className="font-semibold">{formatEther(fraction.pricePerFraction)} ETH</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Available</p>
              <p className="font-semibold">{available}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Fractions</p>
              <p className="font-semibold">{fraction.totalFractions}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">
            How many fractions do you want to buy?
          </label>
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => handleAmountChange(-1)}
              disabled={amount <= 1}
              className="px-4"
            >
              <Minus className="w-5 h-5" />
            </Button>
            
            <div className="flex-1">
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setAmount(Math.max(1, Math.min(available, val)));
                }}
                className="input-field text-center text-2xl font-bold"
                min="1"
                max={available}
              />
            </div>

            <Button
              variant="secondary"
              onClick={() => handleAmountChange(1)}
              disabled={amount >= available}
              className="px-4"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-2 mt-3">
            {[10, 25, 50, 100].map((preset) => (
              preset <= available && (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className="glass-hover px-3 py-2 rounded-lg text-sm font-medium"
                >
                  {preset}
                </button>
              )
            ))}
          </div>
        </div>

        <div className="glass p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Cost</span>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary-400">
                {totalCost} ETH
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {amount} × {(formatEther(fraction.pricePerFraction))} ETH
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          loading={loading}
          className="w-full"
        >
          <ShoppingCart className="w-5 h-5" />
          Buy {amount} Fraction{amount > 1 ? 's' : ''}
        </Button>
      </div>
    </Modal>
  );
};