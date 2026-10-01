import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import {
  Sprout,
  ShoppingCart,
  Truck,
  Package,
  Clock,
  Coins,
  Bell,
  User as UserIcon,
  Wifi,
  WifiOff,
  ChevronLeft,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { FarmerDashboard } from '../farmer/FarmerDashboard.tsx';
import { BuyerMarketplace } from '../buyer/BuyerMarketplace.tsx';
import { BuyerOrders } from '../buyer/BuyerOrders.tsx';
import { TransporterDashboard } from '../transporter/TransporterDashboard.tsx';

interface MobileAppContainerProps {
  onCloseMobileMode: () => void;
  onOpenNotifications: () => void;
}

export const MobileAppContainer: React.FC<MobileAppContainerProps> = ({
  onCloseMobileMode,
  onOpenNotifications,
}) => {
  const { currentUser, switchDemoRole, logout } = useAuth();
  const { isConnected, unreadCount } = useRealtime();

  // Mobile active navigation tab
  const [mobileTab, setMobileTab] = useState<string>('home');
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);

  const role = currentUser?.role || 'farmer';

  // Render content according to active tab and role
  const renderMobileContent = () => {
    if (role === 'farmer') {
      if (mobileTab === 'home' || mobileTab === 'commodities' || mobileTab === 'orders' || mobileTab === 'earnings') {
        return <FarmerDashboard />;
      }
      if (mobileTab === 'marketplace') {
        return <BuyerMarketplace />;
      }
      if (mobileTab === 'profile') {
        return renderProfileView();
      }
    }

    if (role === 'buyer') {
      if (mobileTab === 'home' || mobileTab === 'marketplace') {
        return <BuyerMarketplace onOrderPlaced={() => setMobileTab('orders')} />;
      }
      if (mobileTab === 'orders' || mobileTab === 'purchases') {
        return <BuyerOrders />;
      }
      if (mobileTab === 'profile') {
        return renderProfileView();
      }
    }

    if (role === 'transporter') {
      if (mobileTab === 'home' || mobileTab === 'available' || mobileTab === 'my_jobs' || mobileTab === 'deliveries' || mobileTab === 'earnings') {
        return <TransporterDashboard />;
      }
      if (mobileTab === 'profile') {
        return renderProfileView();
      }
    }

    // Default fallback
    return <BuyerMarketplace />;
  };

  const renderProfileView = () => (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-5 text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-bold text-xl mx-auto">
          {currentUser?.fullName.charAt(0)}
        </div>
        <h3 className="font-bold text-stone-900 text-lg">{currentUser?.fullName}</h3>
        <p className="text-xs text-stone-500 capitalize">{currentUser?.role.replace('_', ' ')} &bull; {currentUser?.district}</p>
        <div className="text-xs text-stone-600 font-mono bg-stone-50 p-2 rounded-lg border border-stone-100">
          Phone: {currentUser?.phoneNumber || '+265 888 123 456'}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
          Simulate Role Perspective
        </h4>
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          <button
            onClick={() => { switchDemoRole('farmer'); setMobileTab('home'); }}
            className={`p-2.5 rounded-xl border text-left font-semibold ${
              role === 'farmer' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'border-stone-200'
            }`}
          >
            🌾 Smallholder Farmer (Mchinji)
          </button>
          <button
            onClick={() => { switchDemoRole('buyer'); setMobileTab('home'); }}
            className={`p-2.5 rounded-xl border text-left font-semibold ${
              role === 'buyer' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'border-stone-200'
            }`}
          >
            🛒 Wholesale Buyer (Lilongwe)
          </button>
          <button
            onClick={() => { switchDemoRole('transporter'); setMobileTab('home'); }}
            className={`p-2.5 rounded-xl border text-left font-semibold ${
              role === 'transporter' ? 'bg-blue-50 border-blue-300 text-blue-900' : 'border-stone-200'
            }`}
          >
            🚚 Transporter (Dedza / Lilongwe)
          </button>
        </div>
      </div>

      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-xs space-y-2 text-amber-900">
        <div className="font-bold flex items-center gap-1.5">
          <Wifi className="w-4 h-4 text-amber-700" />
          <span>Rural Offline Caching</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          The mobile client caches recent commodity listings and order contracts locally for low-connectivity rural zones. When connectivity restores, synchronization pushes records to PostgreSQL.
        </p>
      </div>

      {/* Prominent Sign Out Button for Mobile Users */}
      <button
        onClick={() => {
          logout();
          onCloseMobileMode();
        }}
        className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 transition-colors shadow-2xs"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out (Log Out) of Account</span>
      </button>
    </div>
  );

  return (
    <div className="py-6 flex justify-center">
      {/* Phone Mockup Frame */}
      <div className="w-full max-w-md bg-stone-900 rounded-[44px] p-3 shadow-2xl ring-12 ring-stone-900/40 relative">
        {/* Notch / Speaker Bar */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-4 bg-stone-900 rounded-full z-30 flex items-center justify-center">
          <div className="w-12 h-1 bg-stone-700 rounded-full" />
        </div>

        {/* Screen Area */}
        <div className="bg-stone-50 rounded-[36px] overflow-hidden flex flex-col h-[780px] border border-stone-800 relative">
          {/* Top Status Bar */}
          <div className="bg-stone-900 text-white px-6 pt-3 pb-2 flex items-center justify-between text-[11px] font-mono z-20">
            <span>09:41</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                MW-AIRTEL 4G
              </span>
              {isConnected && !isOfflineSimulated ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
          </div>

          {/* Mobile App Header */}
          <div className="bg-white border-b border-stone-200 px-4 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={onCloseMobileMode}
                className="text-stone-500 hover:text-stone-900 text-xs font-semibold flex items-center"
                title="Exit Mobile View"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Web</span>
              </button>
              <div className="h-4 w-px bg-stone-200" />
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                  MH
                </div>
                <span className="font-bold text-stone-900 text-xs truncate max-w-[130px]">
                  Harvest Hub Mobile
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenNotifications}
                className="relative p-1.5 rounded-lg text-stone-600 hover:bg-stone-100"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Scrollable Viewport */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {renderMobileContent()}
          </div>

          {/* Role-Specific Mobile Bottom Navigation Bar */}
          <div className="bg-white border-t border-stone-200 px-2 py-2 flex items-center justify-around shrink-0 text-[10px] font-medium text-stone-600 z-20">
            {role === 'farmer' && (
              <>
                <button
                  onClick={() => setMobileTab('home')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'home' || mobileTab === 'commodities' ? 'text-emerald-700 font-bold' : ''
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>My Crops</span>
                </button>
                <button
                  onClick={() => setMobileTab('orders')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'orders' ? 'text-emerald-700 font-bold' : ''
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Orders</span>
                </button>
                <button
                  onClick={() => setMobileTab('marketplace')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'marketplace' ? 'text-emerald-700 font-bold' : ''
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Market</span>
                </button>
                <button
                  onClick={() => setMobileTab('profile')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'profile' ? 'text-emerald-700 font-bold' : ''
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </button>
              </>
            )}

            {role === 'buyer' && (
              <>
                <button
                  onClick={() => setMobileTab('marketplace')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'marketplace' || mobileTab === 'home' ? 'text-amber-700 font-bold' : ''
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Marketplace</span>
                </button>
                <button
                  onClick={() => setMobileTab('orders')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'orders' ? 'text-amber-700 font-bold' : ''
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>My Orders</span>
                </button>
                <button
                  onClick={() => setMobileTab('profile')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'profile' ? 'text-amber-700 font-bold' : ''
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </button>
              </>
            )}

            {role === 'transporter' && (
              <>
                <button
                  onClick={() => setMobileTab('available')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'available' || mobileTab === 'home' ? 'text-blue-700 font-bold' : ''
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Jobs</span>
                </button>
                <button
                  onClick={() => setMobileTab('active')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'active' ? 'text-blue-700 font-bold' : ''
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Transit</span>
                </button>
                <button
                  onClick={() => setMobileTab('profile')}
                  className={`flex flex-col items-center gap-0.5 ${
                    mobileTab === 'profile' ? 'text-blue-700 font-bold' : ''
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
