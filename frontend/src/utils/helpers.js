export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

export const openInExplorer = (address, type = 'address') => {
  const baseUrl = 'https://sepolia.etherscan.io';
  const url = `${baseUrl}/${type}/${address}`;
  window.open(url, '_blank');
};

export const calculateROI = (invested, returned) => {
  if (invested === 0) return 0;
  return ((returned - invested) / invested) * 100;
};

export const calculateAPY = (invested, returned, days) => {
  if (invested === 0 || days === 0) return 0;
  const roi = calculateROI(invested, returned);
  return (roi * 365) / days;
};

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const parseError = (error) => {
  if (error?.reason) return error.reason;
  if (error?.message) {
    // Extract error message from MetaMask errors
    const match = error.message.match(/reason="(.+?)"/);
    if (match) return match[1];
    return error.message;
  }
  return 'Transaction failed';
};