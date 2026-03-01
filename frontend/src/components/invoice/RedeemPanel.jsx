import { CheckCircle, Trash2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useFractionalization } from '@/hooks/useFractionalization';
import { formatEther } from '@/utils/format';

export const RedeemPanel = ({ invoice, tokenId, fractionId, isOwner, onRedeem }) => {
  const { redeemAfterPayment, loading } = useFractionalization();

  const handleRedeem = async () => {
    try {
      await redeemAfterPayment(fractionId);
      if (onRedeem) onRedeem();
    } catch (error) {
      console.error('Redeem error:', error);
    }
  };

  if (!isOwner || !invoice.isPaid) return null;

  return (
    <Card className="border-2 border-green-500/30 bg-green-500/10">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-6 h-6 text-green-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-green-400 mb-2">Invoice Paid!</h3>
          <p className="text-sm text-gray-400 mb-4">
            The invoice has been paid. You can now redeem your NFT to complete the process.
            This will burn the NFT and close the invoice.
          </p>

          <div className="mb-4 p-4 rounded-lg bg-dark-800">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Invoice Amount</p>
                <p className="font-bold text-green-400">
                  {formatEther(invoice.faceValue)} ETH
                </p>
              </div>
              <div>
                <p className="text-gray-400">Status</p>
                <p className="font-bold text-green-400">✓ Paid</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleRedeem}
            loading={loading}
            className="w-full bg-green-500 hover:bg-green-400"
          >
            <Trash2 className="w-5 h-5" />
            Redeem NFT
          </Button>

          <p className="text-xs text-gray-500 mt-2">
            This action cannot be undone. The NFT will be burned.
          </p>
        </div>
      </div>
    </Card>
  );
};