import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { UserRole } from '../../types/index.ts';
import {
  Sprout,
  Truck,
  ShoppingCart,
  ShieldCheck,
  Coins,
  Bell,
  Radio,
  Smartphone,
  Monitor,
  ChevronDown,
  LogOut,
  MapPin,
  CheckCircle2,
  Lock,
  ShieldAlert,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileSimulator: boolean;
  setIsMobileSimulator: (val: boolean) => void;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isMobileSimulator,
  setIsMobileSimulator,
  onOpenNotifications,
}) => {
  const { currentUser, logout } = useAuth();
  const { isConnected, unreadCount } = useRealtime();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  const roleDisplayConfig: Record<UserRole, { label: string; icon: any; color: string }> = {
    farmer: {
      label: 'Smallholder Farmer',
      icon: Sprout,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    buyer: {
      label: 'Agro-Commodity Buyer',
      icon: ShoppingCart,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    transporter: {
      label: 'Freight Transporter',
      icon: Truck,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    admin: {
      label: 'Lead Platform Administrator',
      icon: ShieldCheck,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    finance_admin: {
      label: 'Finance Administrator',
      icon: Coins,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  };

  const currentRoleConfig = currentUser?.role ? roleDisplayConfig[currentUser.role] || roleDisplayConfig.farmer : roleDisplayConfig.farmer;
  const CurrentIcon = currentRoleConfig.icon;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 tracking-tight text-lg">
                  Malawi Harvest Hub
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-emerald-100 text-emerald-800 rounded">
                  Malawi
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium hidden md:block">
                Chitukuko cha Ulimi &bull; Agricultural Trade & Logistics
              </p>
            </div>
          </div>

          {/* Center Navigation depending on Role */}
          <nav className="hidden lg:flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl border border-stone-200/60">
            {currentUser?.role === 'farmer' && (
              <>
                <button
                  onClick={() => setActiveTab('farmer_commodities')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'farmer_commodities'
                      ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  My Commodities
                </button>
                <button
                  onClick={() => setActiveTab('farmer_orders')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'farmer_orders'
                      ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Incoming Orders
                </button>
                <button
                  onClick={() => setActiveTab('farmer_hire_transport')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'farmer_hire_transport'
                      ? 'bg-white text-blue-800 shadow-xs border border-stone-200/60 font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Hire Transporter</span>
                </button>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'marketplace'
                      ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Marketplace
                </button>
              </>
            )}

            {currentUser?.role === 'buyer' && (
              <>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'marketplace'
                      ? 'bg-white text-amber-800 shadow-xs border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Browse Marketplace
                </button>
                <button
                  onClick={() => setActiveTab('buyer_orders')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'buyer_orders'
                      ? 'bg-white text-amber-800 shadow-xs border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  My Purchases & Tracking
                </button>
              </>
            )}

            {currentUser?.role === 'transporter' && (
              <>
                <button
                  onClick={() => setActiveTab('transporter_jobs')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'transporter_jobs'
                      ? 'bg-white text-blue-800 shadow-xs border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Available Freight Jobs
                </button>
                <button
                  onClick={() => setActiveTab('transporter_my_jobs')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'transporter_my_jobs'
                      ? 'bg-white text-blue-800 shadow-xs border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Active Deliveries
                </button>
              </>
            )}

            {/* ONLY Lead Admins have access to the Control Center */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin_overview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'admin_overview'
                    ? 'bg-white text-purple-800 shadow-xs border border-stone-200/60 font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Control Center
              </button>
            )}

            {/* ONLY Lead Admins and Finance Admins have access to the Finance section */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'finance_admin') && (
              <>
                <button
                  onClick={() => setActiveTab('finance_revenue')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'finance_revenue'
                      ? 'bg-white text-rose-800 shadow-xs border border-stone-200/60 font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Finance Approvals & Ledger (4%)
                </button>
                <button
                  onClick={() => setActiveTab('transactions_table')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'transactions_table'
                      ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Transactions
                </button>
              </>
            )}

            {/* Common Analytics Tabs */}
            <button
              onClick={() => setActiveTab('impact_dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'impact_dashboard'
                  ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Impact Overview
            </button>
            <button
              onClick={() => setActiveTab('fee_simulator')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'fee_simulator'
                  ? 'bg-white text-indigo-800 shadow-xs border border-stone-200/60'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Fee Simulator
            </button>
          </nav>

          {/* Right Header Utilities: Realtime badge, Device mode toggle, Notifications, Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}
              title={isConnected ? 'Live WebSocket connected to PostgreSQL' : 'Reconnecting...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="hidden sm:inline">
                {isConnected ? 'Postgres Realtime' : 'Connecting'}
              </span>
            </div>

            {/* Device View Toggle (Desktop vs Mobile App) */}
            <button
              onClick={() => setIsMobileSimulator(!isMobileSimulator)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isMobileSimulator
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
              title="Toggle Native Mobile App Simulation"
            >
              {isMobileSimulator ? (
                <>
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop View</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile App View</span>
                </>
              )}
            </button>

            {/* Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile Card & Profile Photo Upload (No role-switching) */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 transition-colors shadow-2xs"
                  >
                    {currentUser.photoUrl ? (
                      <img
                        src={currentUser.photoUrl}
                        alt={currentUser.fullName}
                        className="w-7 h-7 rounded-lg object-cover ring-1 ring-emerald-500/30"
                      />
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${currentRoleConfig.color}`}
                      >
                        <CurrentIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-left hidden md:block">
                      <div className="text-xs font-bold text-stone-900 leading-tight">
                        {currentUser?.fullName}
                      </div>
                      <div className="text-[10px] font-medium text-stone-500 leading-tight">
                        {currentUser?.role === 'admin'
                          ? 'Lead Administrator'
                          : currentUser?.role === 'farmer'
                          ? 'Smallholder Farmer'
                          : currentUser?.role === 'buyer'
                          ? 'Agro-Commodity Buyer'
                          : currentUser?.role === 'transporter'
                          ? 'Freight Transporter'
                          : 'Finance Administrator'}{' '}
                        &bull; {currentUser?.district}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  </button>

                  {roleDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3"
                    >
                      {/* User Profile Header */}
                      <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                        <div className="relative group">
                          {currentUser.photoUrl ? (
                            <img
                              src={currentUser.photoUrl}
                              alt={currentUser.fullName}
                              className="w-13 h-13 rounded-2xl object-cover ring-2 ring-emerald-600/30 shadow-xs"
                            />
                          ) : (
                            <div className="w-13 h-13 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shadow-xs">
                              <CurrentIcon className="w-6 h-6" />
                            </div>
                          )}
                          <label className="absolute -bottom-1 -right-1 p-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg cursor-pointer shadow-md text-[10px]" title="Change profile picture">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  const dataUrl = reader.result as string;
                                  try {
                                    await fetch('/api/users/profile-photo', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ uid: currentUser.uid, photoUrl: dataUrl }),
                                    });
                                    window.location.reload();
                                  } catch (err) {
                                    console.error(err);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                            📷
                          </label>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-stone-900 text-sm truncate">
                            {currentUser.fullName}
                          </h4>
                          <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {currentUser.role === 'admin'
                              ? 'Lead Administrator'
                              : currentUser.role === 'farmer'
                              ? 'Smallholder Farmer'
                              : currentUser.role === 'buyer'
                              ? 'Agro-Commodity Buyer'
                              : currentUser.role === 'transporter'
                              ? 'Freight Transporter'
                              : 'Finance Administrator'}
                          </span>
                        </div>
                      </div>

                      {/* User Details */}
                      <div className="space-y-1.5 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Email:</span>
                          <span className="font-medium text-stone-800 truncate max-w-[170px]">{currentUser.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Phone:</span>
                          <span className="font-medium text-stone-800">{currentUser.phoneNumber || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">District:</span>
                          <span className="font-medium text-stone-800">{currentUser.district}</span>
                        </div>
                        {currentUser.tradingArea && (
                          <div className="flex justify-between">
                            <span className="text-stone-400">Trading Center:</span>
                            <span className="font-medium text-stone-800">{currentUser.tradingArea}</span>
                          </div>
                        )}
                        {currentUser.vehicleType && (
                          <div className="flex justify-between">
                            <span className="text-stone-400">Vehicle:</span>
                            <span className="font-medium text-stone-800">{currentUser.vehicleType}</span>
                          </div>
                        )}
                      </div>

                      {/* Photo Upload Hint */}
                      <label className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const dataUrl = reader.result as string;
                              try {
                                await fetch('/api/users/profile-photo', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ uid: currentUser.uid, photoUrl: dataUrl }),
                                });
                                window.location.reload();
                              } catch (err) {
                                console.error(err);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <span>Upload / Change Profile Picture</span>
                      </label>

                      {/* Sign Out Button */}
                      <button
                        onClick={async () => {
                          setRoleDropdownOpen(false);
                          await logout();
                          setActiveTab('signin');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Harvest Hub</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct Prominent Sign Out Button */}
                <button
                  onClick={async () => {
                    await logout();
                    setActiveTab('signin');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all shadow-2xs"
                  title="Sign out of your account"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('signin')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs"
              >
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Access Denied Notice Modal */}
      {accessDeniedNotice && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 p-6 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-amber-700" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">Role Access Restricted</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {accessDeniedNotice}
            </p>
            <div className="pt-2">
              <button
                onClick={() => setAccessDeniedNotice(null)}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs shadow-xs"
              >
                Understood, Return
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
