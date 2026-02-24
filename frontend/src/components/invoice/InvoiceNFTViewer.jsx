import { useState, useEffect } from 'react';
import { useInvoiceNFT } from '@/hooks/useInvoiceNFT';
import { Spinner } from '@/components/common/Spinner';

export const InvoiceNFTViewer = ({ tokenId }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getTokenURI } = useInvoiceNFT();

  useEffect(() => {
    loadImage();
  }, [tokenId]);

  const loadImage = async () => {
    try {
      const uri = await getTokenURI(tokenId);
      
      // Parse data URI
      if (uri.startsWith('data:application/json;base64,')) {
        const json = JSON.parse(atob(uri.split(',')[1]));
        setImageUrl(json.image);
      }
    } catch (error) {
      console.error('Error loading NFT image:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {imageUrl ? (
        <img src={imageUrl} alt={`Invoice #${tokenId}`} className="w-full h-auto" />
      ) : (
        <div className="p-8 text-center text-gray-400">
          Failed to load NFT image
        </div>
      )}
    </div>
  );
};