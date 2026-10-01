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
  const { currentUser, switchDemoRole, loginAsUser, loginWithGoogle, logout } = useAuth();
  const { isConnected, unreadCount } = useRealtime();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  const rolesList: { role: UserRole; label: string; icon: any; color: string; desc: string; uid?: string }[] = [
    {
      role: 'farmer',
      label: 'Smallholder Farmer',
      icon: Sprout,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      desc: 'Chimwemwe Phiri (Mchinji)',
      uid: 'farmer-chimwemwe-01',
    },
    {
      role: 'buyer',
      label: 'Agro-Commodity Buyer',
      icon: ShoppingCart,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      desc: 'Alinafe Banda (Lilongwe)',
      uid: 'buyer-alinafe-02',
    },
    {
      role: 'transporter',
      label: 'Logistics Transporter',
      icon: Truck,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      desc: 'Kondwani Chirwa (5-Ton Canter)',
      uid: 'transporter-kondwani-03',
    },
    {
      role: 'admin',
      label: 'Peter Malikebu',
      icon: ShieldCheck,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      desc: 'Lead Administrator &bull; Lilongwe',
      uid: 'frF3xukObzdA8AhCBYIBPYV0UK13',
    },
    {
      role: 'admin',
      label: 'Joshua Malikebu',
      icon: ShieldCheck,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      desc: 'Lead Administrator &bull; Lilongwe',
      uid: '9DXK6Cfy4FaODmqyVm7q8yrKup82',
    },
    {
      role: 'finance_admin',
      label: 'Finance Administrator',
      icon: Coins,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      desc: 'Chisomo Mwale (Ledger & Commission)',
      uid: 'finance-chisomo-05',
    },
  ];

  const currentRoleConfig = rolesList.find((r) => r.role === currentUser?.role) || rolesList[0];
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

            {/* Role Switcher & Profile Dropdown */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 transition-colors shadow-2xs"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${currentRoleConfig.color}`}
                    >
                      <CurrentIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left hidden md:block">
                      <div className="text-xs font-bold text-stone-900 leading-tight">
                        {currentUser?.fullName}
                      </div>
                      <div className="text-[10px] font-medium text-stone-500 leading-tight">
                        {currentUser?.role === 'admin' ? 'Lead Admin' : currentRoleConfig.label} &bull; {currentUser?.district}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  </button>

                  {roleDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                      onClick={() => setRoleDropdownOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-stone-100">
                        <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                          Switch Role for Testing
                        </p>
                        <p className="text-xs text-stone-600 mt-0.5">
                          Experience the system from all 5 perspectives:
                        </p>
                      </div>

                      <div className="p-1 space-y-0.5">
                        {rolesList.map((r) => {
                          const Icon = r.icon;
                          const isCurrent = r.uid ? currentUser?.uid === r.uid : currentUser?.role === r.role;
                          const isLeadAdminRole = r.role === 'admin';
                          const isFinanceRole = r.role === 'finance_admin';

                          const isRestrictedForUser =
                            (isLeadAdminRole && currentUser?.role !== 'admin') ||
                            (isFinanceRole && currentUser?.role !== 'admin' && currentUser?.role !== 'finance_admin');

                          return (
                            <button
                              key={r.uid || r.role}
                              onClick={async (e) => {
                                if (isRestrictedForUser) {
                                  e.stopPropagation();
                                  if (isLeadAdminRole) {
                                    setAccessDeniedNotice(
                                      'Access Denied: Only authorized Platform Administrators (Peter Malikebu & Joshua Malikebu) can open the Administrator Control Center. As a farmer, transporter, or buyer, you can freely access your respective operations.'
                                    );
                                  } else {
                                    setAccessDeniedNotice(
                                      'Access Denied: Only Finance Administrators (Chisomo Mwale) and Lead Administrators have access to the Finance & Escrow portal. You have full access to Farmer and Transporter hiring operations.'
                                    );
                                  }
                                  return;
                                }

                                if (r.uid) {
                                  await loginAsUser(r.uid);
                                } else {
                                  await switchDemoRole(r.role);
                                }
                                if (r.role === 'farmer') setActiveTab('farmer_commodities');
                                else if (r.role === 'buyer') setActiveTab('marketplace');
                                else if (r.role === 'transporter') setActiveTab('transporter_jobs');
                                else if (r.role === 'admin') setActiveTab('admin_overview');
                                else if (r.role === 'finance_admin') setActiveTab('finance_revenue');
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                                isCurrent
                                  ? 'bg-stone-100 font-semibold text-stone-900'
                                  : isRestrictedForUser
                                  ? 'text-stone-400 hover:bg-stone-50/80'
                                  : 'text-stone-700 hover:bg-stone-50'
                              }`}
                            >
                              <div className={`p-1.5 rounded-md ${r.color} ${isRestrictedForUser ? 'opacity-50' : ''}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-stone-900 truncate flex items-center gap-1.5">
                                  <span>{r.label}</span>
                                  {isRestrictedForUser && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                      <Lock className="w-2.5 h-2.5 text-amber-700" />
                                      <span>Locked</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-stone-500 truncate">{r.desc}</div>
                              </div>
                              {isCurrent && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="border-t border-stone-100 mt-1 pt-1 px-1">
                        <button
                          onClick={loginWithGoogle}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 rounded-lg"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Sign in with Google OAuth</span>
                        </button>
                        <button
                          onClick={logout}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign out (Logout)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Prominent Sign Out Button */}
                <button
                  onClick={logout}
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
