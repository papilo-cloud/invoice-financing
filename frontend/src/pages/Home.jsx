import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { useWeb3 } from '@/contexts/Web3Context';

export const Home = () => {
  const { isConnected } = useWeb3();

  const features = [
    {
      icon: Shield,
      title: 'Verified by Chainlink',
      description: 'All invoices are verified using Chainlink Functions for trustless, decentralized authentication with real-time risk scoring',
      color: 'text-primary-500',
    },
    {
      icon: Zap,
      title: 'Instant Liquidity',
      description: 'Convert your invoices into immediate capital without waiting 30-90 days for payment',
      color: 'text-primary-500',
    },
    {
      icon: TrendingUp,
      title: 'Earn Returns',
      description: 'Invest in verified invoices and earn competitive returns when debtors pay',
      color: 'text-green-400',
    },
    {
      icon: Users,
      title: 'Decentralized',
      description: 'No middlemen. Smart contracts handle everything automatically on-chain',
      color: 'text-primary-500',
    },
  ];

  const stats = [
    { label: 'Total Volume', value: '$2.5M+', color: 'text-primary-500' },
    { label: 'Active Invoices', value: '156', color: 'text-white' },
    { label: 'Total Investors', value: '1,200+', color: 'text-white' },
    { label: 'Avg Returns', value: '8.5%', color: 'text-green-400' },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-circle(800px at 50% 200px, rgba(240, 185, 11, 0.15), transparent)`,
          }} />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              Unlock Capital from
              <br />
              <span className="text-primary-500">Your Invoices</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
              Decentralized invoice financing powered by blockchain and Chainlink oracles. 
              Get instant liquidity or invest in verified invoices.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={isConnected ? '/business/submit' : '/business'}>
                <Button className="text-lg px-8 py-4">
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="secondary" className="text-lg px-8 py-4">
                  Explore Marketplace
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="glass p-6 rounded-xl text-center border-gray-700 hover:border-primary-500/50 transition-all"
              >
                <div className={`text-3xl md:text-4xl font-bold mb-2 ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It <span className="text-primary-500">Works</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Simple, secure, and transparent invoice financing for everyone
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass p-6 rounded-2xl border-gray-700 hover:border-primary-500/50 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center mb-4 border border-gray-700`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="glass p-12 rounded-3xl text-center border-2 border-primary-500/30"
          >
            <h2 className="text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of businesses and investors using InvoiceFlow
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/business/submit">
                <Button className="text-lg px-8 py-4">
                  Create Invoice
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="secondary" className="text-lg px-8 py-4">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};