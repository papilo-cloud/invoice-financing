import { formatUnits } from 'ethers';

export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatEther = (value) => {
  try {
    return parseFloat(formatUnits(value, 18)).toFixed(4);
  } catch {
    return '0';
  }
};

export const formatDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTimeRemaining = (timestamp) => {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;
  
  if (diff < 0) return 'Expired';
  
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

export const getRiskColor = (riskScore) => {
  if (riskScore >= 80) return 'text-green-400';
  if (riskScore >= 60) return 'text-blue-400';
  if (riskScore >= 40) return 'text-yellow-400';
  return 'text-red-400';
};

export const getStatusBadge = (isVerified, isPaid) => {
  if (isPaid) {
    return {
      label: 'PAID',
      bg: 'bg-green-500/20',
      text: 'text-green-400',
    };
  }
  if (isVerified) {
    return {
      label: 'VERIFIED',
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
    };
  }
  return {
    label: 'PENDING',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
  };
};

export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const formatNumber = (num, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatCurrency = (amount, currency = 'ETH') => {
  return `${formatNumber(amount)} ${currency}`;
};