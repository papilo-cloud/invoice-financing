import { useState, useEffect } from 'react';
import { ShoppingCart, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useFractionalization } from '@/hooks/useFractionalization';
import { formatEther, formatDate } from '@/utils/format';
import { motion } from 'framer-motion';

export const BuyoutPanel = ({ fractionId, fractionInfo, isOwner, onBuyoutComplete }) => {
  const { 
    initiateBuyout, 
    finalizeBuyout, 
    getBuyoutInfo,
    getBuyoutPrice,
    loading,
    buyoutTimeStamp
  } = useFractionalization();

  const [buyoutInfo, setBuyoutInfo] = useState(null);
  const [buyoutPrice, setBuyoutPrice] = useState(null);
  // const buyoutPrice = await getBuyoutPrice(fractionId);

  useEffect(() => {
    loadBuyoutInfo();
    loadBuyoutPrice();
  }, [fractionId]);

  const loadBuyoutPrice = async () => {
    const price = await getBuyoutPrice(fractionId);
    setBuyoutPrice(price);
  }

  const loadBuyoutInfo = async () => {
    const info = await getBuyoutInfo(fractionId);
    setBuyoutInfo(info);
  };

  const handleInitiateBuyout = async () => {
    try {
      await initiateBuyout(fractionId);
      await loadBuyoutInfo();
      if (onBuyoutComplete) onBuyoutComplete();
    } catch (error) {
      console.error('Buyout error:', error);
    }
  };

  const handleFinalizeBuyout = async () => {
    try {
      await finalizeBuyout(fractionId);
      await loadBuyoutInfo();
      if (onBuyoutComplete) onBuyoutComplete();
    } catch (error) {
      console.error('Finalize error:', error);
    }
  };

  if (!isOwner) return null;

  const now = Math.floor(Date.now() / 1000);
  // Active buyout
  if (buyoutInfo?.active) {
    const SEVEN_DAYS = 7 * 24 * 60 * 60; // 7 days in seconds
    const deadline = buyoutTimeStamp + SEVEN_DAYS;
    const isPastDeadline = now > deadline;

    return (
      <Card className="border-2 border-blue-500/30 bg-blue-500/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-blue-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-blue-400 mb-2">Buyout in Progress</h3>
            <p className="text-sm text-gray-400 mb-4">
              You initiated a buyout for {formatEther(buyoutPrice)} ETH. 
              Investors have until {formatDate(buyoutTimeStamp)} to claim their payment.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-xs">Buyout Price</p>
                <p className="font-bold text-blue-400">
                  {formatEther(buyoutPrice)} ETH
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Deadline</p>
                <p className="font-bold">
                  {formatDate(buyoutTimeStamp)}
                </p>
              </div>
            </div>

            {isPastDeadline ? (
              <Button 
                onClick={handleFinalizeBuyout}
                loading={loading}
                className="w-full"
              >
                <CheckCircle className="w-5 h-5" />
                Finalize Buyout
              </Button>
            ) : (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-400">
                  Waiting for deadline. You can finalize after {formatDate(deadline)}.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // No active buyout
  if (fractionInfo.fractionsSold === 0) {
    return (
      <Card className="border border-gray-700">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-400 mb-2">No Fractions Sold</h3>
            <p className="text-sm text-gray-500">
              No investors have purchased fractions yet. Buyout is not available.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary-500/30 bg-primary-500/5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-6 h-6 text-primary-500" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold mb-2">Buy Back Your Invoice</h3>
          <p className="text-sm text-gray-400 mb-4">
            You can buy back all fractions and regain full control of your invoice. 
            Investors will receive their share of the buyout price.
          </p>

          <div className="mb-4 p-4 rounded-lg bg-dark-800">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Fractions Sold</p>
                <p className="font-bold">{fractionInfo.fractionsSold} / {fractionInfo.totalFractions}</p>
              </div>
              <div>
                <p className="text-gray-400">Buyout Cost</p>
                <p className="font-bold text-primary-500">
                  {formatEther(buyoutPrice)} ETH
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleInitiateBuyout}
            loading={loading}
            className="w-full"
          >
            <ShoppingCart className="w-5 h-5" />
            Initiate Buyout for {formatEther(buyoutPrice)} ETH
          </Button>

          <p className="text-xs text-gray-500 mt-2">
            Investors will have 7 days to claim their buyout payment
          </p>
        </div>
      </div>
    </Card>
  );
};