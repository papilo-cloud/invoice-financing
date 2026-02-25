import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './contexts/Web3Context';
import { NavBar } from './components/common/Navbar';

// Pages
import { Home } from './pages/Home';
import { Marketplace } from './pages/investor/Marketplace';
import { Portfolio } from './pages/investor/Portfolio';
import { BusinessDashboard } from './pages/business/BusinessDashboard';
import { SubmitInvoice } from './pages/business/SubmitInvoice';
import { ManageInvoices } from './pages/business/ManageInvoices';
import { BuyoutFlow } from './pages/investor/BuyoutFlow';
import { Analytics } from './pages/Analytics';
import { InvestorDashboard } from './pages/investor/InvestorDashboard';
import { PayInvoice } from './pages/debtor/PayInvoice';

function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="min-h-screen">
          <NavBar />
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/investor" element={<InvestorDashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/business" element={<BusinessDashboard />} />
            <Route path="/business/submit" element={<SubmitInvoice />} />
            <Route path="/business/manage/:tokenId" element={<ManageInvoices />} />
            <Route path="/buyout/:fractionId" element={<BuyoutFlow />} />
            <Route path="/pay" element={<PayInvoice />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path='*' element={<Home />} />
          </Routes>

          {/* Toast Notifications */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(43, 47, 54, 0.95)',
                backdropFilter: 'blur(12px)',
                color: '#fff',
                border: '1px solid rgba(113, 113, 122, 0.3)',
                borderRadius: '12px',
              },
              success: {
                iconTheme: {
                  primary: '#F0B90B',
                  secondary: '#1E2329',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App;