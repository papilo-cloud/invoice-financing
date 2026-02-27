import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, TrendingUp, Users, FileText, DollarSign, Lock } from 'lucide-react';
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

  const workflow = [
    {
      step: '01',
      title: 'Create Invoice',
      description: 'Mint your invoice as an NFT on-chain',
      icon: FileText,
    },
    {
      step: '02',
      title: 'Verify & Score',
      description: 'Chainlink calculates risk score automatically',
      icon: Shield,
    },
    {
      step: '03',
      title: 'Fractionalize',
      description: 'Split into tradeable fractions for investors',
      icon: DollarSign,
    },
    {
      step: '04',
      title: 'Get Paid',
      description: 'Receive instant liquidity from investors',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-500 rounded-full blur-3xl" />
        </div>

        {/* Grid Pattern Background */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(#F0B90B 1px, transparent 1px), linear-gradient(90deg, #F0B90B 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6"
              >
                <Lock className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-semibold text-primary-500">Powered by Chainlink</span>
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-6xl font-extrabold mb-6 leading-tight">
                Unlock Capital from {' '}
                <span className="text-primary-500">Your Invoices</span>
              </h1>
              <p className="text-xl text-gray-400 mb-8 loading-relaxed">
                Decentralized invoice financing powered by blockchain and Chainlink oracles. 
                Get instant liquidity or invest in verified invoices.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
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

              <div className="grid grid-cols-3 gap-6">
                {stats.slice(0, 3).map((stat, index) => (
                  <div key={index}>
                    <div className={`text-2xl font-bold mb-1 ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="relative glass p-8 rounded-3xl border-2 border-primary-500/30"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-dark-900" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Invoice NFT</div>
                        <div className="font-bold">#1234</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                      <span className="text-sm font-semibold text-green-400">Verified</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Debtor</div>
                      <div className="font-semibold">Apple Inc</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Amount</div>
                        <div className="text-xl font-bold text-primary-500">50,000 ETH</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Risk Score</div>
                        <div className="text-xl font-bold text-green-400">95/100</div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Fractions Sold</span>
                      <span className="font-semibold">75/100</span>
                    </div>
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '75%' }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-full bg-primary-500 rounded-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Due in 45 days</span>
                    <span className="text-primary-500 font-semibold">96% funded</span>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute -top-8 -right-8 glass p-4 rounded-2xl border border-primary-500/30"
                >
                  <Shield className="w-8 h-8 text-primary-500 mb-2" />
                  <div className="text-xs text-gray-400">Chainlink</div>
                  <div className="text-sm font-bold">Verified</div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 15, 0], x: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                  className="absolute -bottom-8 -left-8 glass p-4 rounded-2xl border border-green-500/30"
                >
                  <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
                  <div className="text-xs text-gray-400">ROI</div>
                  <div className="text-sm font-bold text-green-400">+8.5%</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-dark-950/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              How It <span className="text-primary-500">Works</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Four simple steps to unlock your capital
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {workflow.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="glass p-6 rounded-2xl border-gray-700 hover:border-primary-500/50 transition-all h-full">
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-primary-500 text-dark-900 font-bold flex items-center justify-center text-lg">
                    {item.step}
                  </div>

                  <div className="mt-4">
                    <div className="w-14 h-14 rounded-xl bg-dark-800 flex items-center justify-center mb-4 border border-gray-700">
                      <item.icon className="w-7 h-7 text-primary-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {index < workflow.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary-500/30" />
                )}
              </motion.div>
            ))}
          </div>
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
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              Why <span className="text-primary-500">InvoiceFlow</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Built on cutting-edge blockchain technology
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
                className="glass p-6 rounded-2xl border-gray-700 hover:border-primary-500/50 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center mb-4 border border-gray-700 group-hover:border-primary-500/50 transition-all`}>
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
            className="relative glass p-12 rounded-3xl text-center border-2 border-primary-500/30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary-500/5 blur-3xl" />

              <div className="relative z-10">
                <h2 className="text-4xl font-extrabold mb-4">
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
              </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};