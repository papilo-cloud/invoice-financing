import { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, Clock } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Spinner } from '@/components/common/Spinner';
import { FractionCard } from '@/components/fraction/FractionCard';
import { BuyFractionsModal } from '@/components/fraction/BuyFractionsModal';
import { useFractionalization } from '@/hooks/useFractionalization';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';

export const Marketplace = () => {
  const [fractions, setFractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFraction, setSelectedFraction] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  
  const { getFractionInfo, buyFractions, loading: buying } = useFractionalization();
  const { getInvoice } = useInvoiceNFT();

  useEffect(() => {
    loadMarketplace();
  }, []);

  const loadMarketplace = async () => {
    try {
      setLoading(true);
      // In production, we'd query events or use a subgraph
      // For demo, we'll show sample data
      
      const sampleFractions = [];
      for (let i = 1; i <= 5; i++) {
        try {
          const fractionInfo = await getFractionInfo(i);
          if (fractionInfo.isActive) {
            const invoice = await getInvoice(fractionInfo.invoiceTokenId);
            sampleFractions.push({
              ...fractionInfo,
              fractionId: i,
              invoice,
            });
          }
        } catch (error) {
          // Fraction doesn't exist, skip
          continue;
        }
      }
      
      setFractions(sampleFractions);
    } catch (error) {
      console.error('Error loading marketplace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (fraction) => {
    setSelectedFraction(fraction);
    setShowBuyModal(true);
  };

  const handleBuyConfirm = async (fractionId, amount, pricePerFraction) => {
    try {
      await buyFractions(fractionId, amount, pricePerFraction);
      setShowBuyModal(false);
      await loadMarketplace();
    } catch (error) {
      console.error('Error buying fractions:', error);
    }
  };

  const filteredFractions = fractions.filter(f =>
    f.invoice?.debtorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
          <p className="text-gray-400">Invest in verified invoices and earn returns</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Active Listings</p>
                <p className="text-3xl font-bold">{fractions.length}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-primary-400 opacity-50" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Avg. Risk Score</p>
                <p className="text-3xl font-bold text-green-400">
                  {fractions.length > 0
                    ? Math.round(
                        fractions.reduce((acc, f) => acc + (f.invoice?.riskScore || 0), 0) /
                          fractions.length
                      )
                    : 0}
                </p>
              </div>
              <Clock className="w-12 h-12 text-green-400 opacity-50" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Total Volume</p>
                <p className="text-3xl font-bold text-accent-400">
                  {fractions.reduce((acc, f) => 
                    acc + (parseFloat(f.pricePerFraction) * f.totalFractions), 0
                  ).toFixed(2)} ETH
                </p>
              </div>
              <Filter className="w-12 h-12 text-accent-400 opacity-50" />
            </div>
          </Card>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-12"
              placeholder="Search by debtor name..."
            />
          </div>
        </div>

        {/* Listings */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="xl" />
          </div>
        ) : filteredFractions.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFractions.map((fraction) => (
              <FractionCard
                key={fraction.fractionId}
                fraction={fraction}
                invoice={fraction.invoice}
                onBuy={handleBuy}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Active Listings</h3>
            <p className="text-gray-400">
              {searchTerm
                ? 'No results found. Try a different search term.'
                : 'Check back soon for new investment opportunities!'}
            </p>
          </Card>
        )}

        {/* Buy Modal */}
        {selectedFraction && (
          <BuyFractionsModal
            isOpen={showBuyModal}
            onClose={() => setShowBuyModal(false)}
            fraction={selectedFraction}
            onBuy={handleBuyConfirm}
            loading={buying}
          />
        )}
      </div>
    </div>
  );
};