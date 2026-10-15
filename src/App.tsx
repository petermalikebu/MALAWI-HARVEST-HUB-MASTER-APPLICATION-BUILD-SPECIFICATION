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
import { LandingView } from './components/landing/LandingView.tsx';
import { FarmerTransportHire } from './components/farmer/FarmerTransportHire.tsx';
import { SupportQueriesDesk } from './components/support/SupportQueriesDesk.tsx';
import { AgriIntelligenceView } from './components/intelligence/AgriIntelligenceView.tsx';
import { ShieldAlert } from 'lucide-react';

function MainContent() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [isMobileSimulator, setIsMobileSimulator] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'register' | 'reset_password'>('signin');

  // Helper to route to the correct portal based on user's registered role
  const navigateByRole = (role?: string) => {
    switch (role) {
      case 'farmer':
        setActiveTab('farmer_commodities');
        break;
      case 'buyer':
        setActiveTab('marketplace');
        break;
      case 'transporter':
        setActiveTab('transporter_jobs');
        break;
      case 'admin':
        setActiveTab('admin_overview');
        break;
      case 'finance_admin':
        setActiveTab('finance_revenue');
        break;
      default:
        setActiveTab('farmer_commodities');
        break;
    }
  };

  // Sync initial tab when user logs in or switches role
  React.useEffect(() => {
    if (!currentUser) return;
    // When user is authenticated and on signin tab, direct them to their registered role portal
    if (activeTab === 'signin' || !activeTab) {
      navigateByRole(currentUser.role);
    }
  }, [currentUser, activeTab]);

  // When currentUser changes (e.g. sign in or role switch)
  React.useEffect(() => {
    if (currentUser) {
      navigateByRole(currentUser.role);
    }
  }, [currentUser?.uid, currentUser?.role]);

  const renderDesktopView = () => {
    // Unauthenticated visitor experience
    if (!currentUser) {
      if (activeTab === 'signin') {
        return (
          <SignInView
            onLoginSuccess={(u) => navigateByRole(u.role)}
            onBackToLanding={() => setActiveTab('landing')}
          />
        );
      }
      if (activeTab === 'marketplace') {
        return <BuyerMarketplace onOrderPlaced={() => {
          setAuthModalMode('signin');
          setIsAuthModalOpen(true);
        }} />;
      }
      if (activeTab === 'impact_dashboard') {
        return <ImpactDashboard />;
      }
      if (activeTab === 'fee_simulator') {
        return <FeeSimulator />;
      }
      if (activeTab === 'support_queries') {
        return <SupportQueriesDesk />;
      }
      if (activeTab === 'agri_intelligence') {
        return <AgriIntelligenceView />;
      }
      return (
        <LandingView
          onOpenSignIn={() => {
            setAuthModalMode('signin');
            setIsAuthModalOpen(true);
          }}
          onExploreMarketplace={() => setActiveTab('marketplace')}
        />
      );
    }

    if (activeTab === 'landing') {
      return (
        <LandingView
          onOpenSignIn={() => navigateByRole(currentUser.role)}
          onExploreMarketplace={() => setActiveTab('marketplace')}
        />
      );
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
      case 'support_queries':
        return <SupportQueriesDesk />;
      case 'agri_intelligence':
        return <AgriIntelligenceView />;
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
        onOpenAuthModal={(mode = 'signin') => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
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

      {/* Interactive Sign In / Register / Password Reset Modal Overlay */}
      {isAuthModalOpen && !currentUser && (
        <SignInView
          isModal={true}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(u) => {
            setIsAuthModalOpen(false);
            navigateByRole(u.role);
          }}
        />
      )}

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
