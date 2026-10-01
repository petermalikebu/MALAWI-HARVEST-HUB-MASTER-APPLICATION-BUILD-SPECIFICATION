import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { RealtimeProvider } from './context/RealtimeContext.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { NotificationDrawer } from './components/common/NotificationDrawer.tsx';
import { FarmerDashboard } from './components/farmer/FarmerDashboard.tsx';
import { BuyerMarketplace } from './components/buyer/BuyerMarketplace.tsx';
import { BuyerOrders } from './components/buyer/BuyerOrders.tsx';
import { TransporterDashboard } from './components/transporter/TransporterDashboard.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { FinanceDashboard } from './components/finance/FinanceDashboard.tsx';
import { FeeSimulator } from './components/finance/FeeSimulator.tsx';
import { ImpactDashboard } from './components/impact/ImpactDashboard.tsx';
import { MobileAppContainer } from './components/mobile/MobileAppContainer.tsx';
import { SignInView } from './components/common/SignInView.tsx';
import { FarmerTransportHire } from './components/farmer/FarmerTransportHire.tsx';
import { ShieldAlert } from 'lucide-react';

function MainContent() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('farmer_commodities');
  const [isMobileSimulator, setIsMobileSimulator] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);

  // Sync initial tab when user switches role
  React.useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'farmer') setActiveTab('farmer_commodities');
    else if (currentUser.role === 'buyer') setActiveTab('marketplace');
    else if (currentUser.role === 'transporter') setActiveTab('transporter_jobs');
    else if (currentUser.role === 'admin') setActiveTab('admin_overview');
    else if (currentUser.role === 'finance_admin') setActiveTab('finance_revenue');
  }, [currentUser?.role]);

  const renderDesktopView = () => {
    if (!currentUser || activeTab === 'signin') {
      return <SignInView />;
    }

    // Role-based Access Guards
    if (activeTab === 'admin_overview' && currentUser.role !== 'admin') {
      return (
        <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-purple-100 text-purple-800 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-purple-700" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Administrator Control Center Restricted</h2>
          <p className="text-xs text-stone-600 leading-relaxed max-w-md mx-auto">
            Only authorized Platform Administrators (Peter Malikebu &amp; Joshua Malikebu) have operational access to the Administrator Control Center. As a registered user, you can access your Farmer, Transporter, or Marketplace operations below.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveTab('farmer_commodities')}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 shadow-xs"
            >
              Return to Farmer Portal
            </button>
            <button
              onClick={() => setActiveTab('farmer_hire_transport')}
              className="px-5 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 shadow-xs"
            >
              Hire a Transporter
            </button>
          </div>
        </div>
      );
    }

    if ((activeTab === 'finance_revenue' || activeTab === 'transactions_table') && currentUser.role !== 'admin' && currentUser.role !== 'finance_admin') {
      return (
        <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-rose-100 text-rose-800 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-rose-700" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Finance &amp; Escrow Control Restricted</h2>
          <p className="text-xs text-stone-600 leading-relaxed max-w-md mx-auto">
            Access to the Financial Revenue Ledger and Escrow Reconciliation is restricted strictly to Finance Administrators (Chisomo Mwale) and Lead Administrators.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveTab('farmer_commodities')}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 shadow-xs"
            >
              Return to Farmer Portal
            </button>
            <button
              onClick={() => setActiveTab('farmer_hire_transport')}
              className="px-5 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 shadow-xs"
            >
              Hire a Transporter
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'farmer_commodities':
      case 'farmer_orders':
        return <FarmerDashboard />;
      case 'farmer_hire_transport':
        return <FarmerTransportHire onJobCreated={() => setActiveTab('farmer_commodities')} />;
      case 'marketplace':
        return <BuyerMarketplace onOrderPlaced={() => setActiveTab('buyer_orders')} />;
      case 'buyer_orders':
        return <BuyerOrders />;
      case 'transporter_jobs':
      case 'transporter_my_jobs':
        return <TransporterDashboard />;
      case 'admin_overview':
        return <AdminDashboard />;
      case 'finance_revenue':
      case 'transactions_table':
        return <FinanceDashboard />;
      case 'impact_dashboard':
        return <ImpactDashboard />;
      case 'fee_simulator':
        return <FeeSimulator />;
      default:
        return <FarmerDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileSimulator={isMobileSimulator}
        setIsMobileSimulator={setIsMobileSimulator}
        onOpenNotifications={() => setIsNotificationOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isMobileSimulator ? (
          <MobileAppContainer
            onCloseMobileMode={() => setIsMobileSimulator(false)}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        ) : (
          renderDesktopView()
        )}
      </main>

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onSelectOrder={(orderId) => {
          if (currentUser?.role === 'buyer') setActiveTab('buyer_orders');
          else if (currentUser?.role === 'farmer') setActiveTab('farmer_orders');
        }}
      />

      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-stone-700">
            Malawi Harvest Hub &bull; Empowering Agricultural Commerce Across 28 Districts
          </p>
          <p>
            Connected to Cloud SQL PostgreSQL Central Database &bull; Realtime WebSockets &bull; 4% Capped Escrow
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <MainContent />
      </RealtimeProvider>
    </AuthProvider>
  );
}
