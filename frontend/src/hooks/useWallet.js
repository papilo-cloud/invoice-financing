import { useState, useEffect } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import toast from 'react-hot-toast';

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    if (account && provider) {
      loadBalance();
    }
  }, [account, provider]);

  const loadBalance = async () => {
    try {
      if (!provider || !account) return;
      
      const balance = await provider.getBalance(account);
      setBalance(formatEther(balance));
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const connect = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask!');
      return null;
    }

    try {
      setIsConnecting(true);
      
      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      setProvider(provider);

      toast.success('Wallet connected!');
      return accounts[0];
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        toast.error('Connection rejected');
      } else {
        toast.error('Failed to connect wallet');
      }
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setBalance('0');
    setProvider(null);
    toast.success('Wallet disconnected');
  };

  const switchChain = async (targetChainId) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      
      toast.success('Network switched successfully');
      return true;
    } catch (error) {
      console.error('Error switching network:', error);
      
      // Chain not added
      if (error.code === 4902) {
        toast.error('Please add this network to MetaMask');
      } else if (error.code === 4001) {
        toast.error('Network switch rejected');
      } else {
        toast.error('Failed to switch network');
      }
      return false;
    }
  };

  const addToken = async (tokenAddress, tokenSymbol, tokenDecimals = 18, tokenImage) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            image: tokenImage,
          },
        },
      });
      
      toast.success(`${tokenSymbol} added to wallet`);
      return true;
    } catch (error) {
      console.error('Error adding token:', error);
      toast.error('Failed to add token');
      return false;
    }
  };

  return {
    account,
    balance,
    chainId,
    isConnecting,
    isConnected: !!account,
    provider,
    connect,
    disconnect,
    switchChain,
    addToken,
    refreshBalance: loadBalance,
  };
};