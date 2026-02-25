import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Menu, X, Zap } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';
import { Button } from './Button';
import { formatAddress } from '@/utils/format';

export const NavBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { account, isConnected, connect, disconnect, isConnecting } = useWeb3();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/marketplace', label: 'Marketplace' },
    { path: '/business', label: 'Business' },
    { path: '/investor', label: 'Investor' },
    { path: '/pay', label: 'Pay Invoice' },
    { path: '/analytics', label: 'Analytics' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Zap className="w-8 h-8 text-primary-500 group-hover:text-primary-400 transition-colors" />
              <div className="absolute inset-0 bg-primary-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              InvoiceFlow
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors relative group ${
                  isActive(item.path)
                    ? 'text-primary-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
                {isActive(item.path) && (
                  <div className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500" />
                )}
              </Link>
            ))}
          </div>

          {/* Wallet Button */}
          <div className="hidden md:block">
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="glass px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-mono">{formatAddress(account)}</span>
                  </div>
                </div>
                <Button variant="secondary" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
                <Button onClick={connect} className="bg-primary-500 hover:bg-primary-400 text-dark-900">
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden glass p-2 rounded-lg"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-hover border-t border-white/10">
          <div className="px-4 py-6 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-lg font-medium ${
                  isActive(item.path) ? 'text-primary-400' : 'text-gray-400'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/10">
              {isConnected ? (
                <>
                  <button
                    onClick={disconnect}
                    className="px-4 py-2 rounded-xl bg-dark-800 border border-gray-700 hover:border-primary-500/50 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary-500 rounded-full" />
                      <span className="font-mono text-sm">{formatAddress(account)}</span>
                    </div>
                  </button>
                </>
              ) : (
                <Button onClick={connect} loading={isConnecting} className="w-full">
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};