import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { UserRole } from '../../types/index.ts';
import {
  Sprout,
  Truck,
  ShoppingCart,
  ShieldCheck,
  Coins,
  Bell,
  Smartphone,
  Monitor,
  ChevronDown,
  LogOut,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  HelpCircle,
  LogIn,
  Sparkles,
  Package,
  MoreVertical,
  X,
  Globe,
  Check,
  BarChart3,
  Calculator,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileSimulator: boolean;
  setIsMobileSimulator: (val: boolean) => void;
  onOpenNotifications: () => void;
  onOpenAuthModal?: (mode?: 'signin' | 'register' | 'reset_password') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isMobileSimulator,
  setIsMobileSimulator,
  onOpenNotifications,
  onOpenAuthModal,
}) => {
  const { currentUser, logout, uploadProfilePhoto } = useAuth();
  const { isConnected, unreadCount } = useRealtime();
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Auto-hide header state on scroll
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show at top of page or if mobile menu is open
      if (currentScrollY <= 45 || mobileMenuOpen) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY - lastScrollY.current > 8) {
        // Scrolling down -> smoothly hide header
        setShowHeader(false);
        setRoleDropdownOpen(false);
        setLanguageMenuOpen(false);
      } else if (currentScrollY < lastScrollY.current && lastScrollY.current - currentScrollY > 8) {
        // Scrolling up -> smoothly reveal header
        setShowHeader(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 360;
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          canvas.width = MAX_SIZE;
          canvas.height = MAX_SIZE;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE);
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
            await uploadProfilePhoto(optimizedDataUrl);
          }
        } catch (err) {
          console.error('Failed to update profile picture:', err);
          alert(language === 'ch' ? 'Sizinatheke kusunga chithunzi. Yesaninso.' : 'Could not update profile picture. Please try again.');
        } finally {
          setUploadingPhoto(false);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const roleDisplayConfig: Record<UserRole, { label: string; icon: any; color: string }> = {
    farmer: {
      label: t('role_farmer', 'Smallholder Farmer'),
      icon: Sprout,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    buyer: {
      label: t('role_buyer', 'Agro-Commodity Buyer'),
      icon: ShoppingCart,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    transporter: {
      label: t('role_transporter', 'Freight Transporter'),
      icon: Truck,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    admin: {
      label: t('role_admin', 'Lead Administrator'),
      icon: ShieldCheck,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    finance_admin: {
      label: t('role_finance_admin', 'Finance Administrator'),
      icon: Coins,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  };

  const currentRoleConfig = currentUser?.role ? roleDisplayConfig[currentUser.role] || roleDisplayConfig.farmer : roleDisplayConfig.farmer;
  const CurrentIcon = currentRoleConfig.icon;

  // Build the list of navigation items according to user role or guest
  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: string;
    color?: string;
  }

  const getNavItems = (): NavItem[] => {
    if (!currentUser) {
      return [
        { id: 'landing', label: t('nav_overview'), icon: Sprout },
        { id: 'marketplace', label: t('nav_browse'), icon: ShoppingCart },
        { id: 'agri_intelligence', label: t('nav_agri_intel'), icon: Sparkles, badge: 'AI' },
        { id: 'support_queries', label: t('nav_queries_help'), icon: HelpCircle },
        { id: 'impact_dashboard', label: t('nav_impact'), icon: BarChart3 },
        { id: 'fee_simulator', label: t('nav_fee_simulator'), icon: Calculator },
      ];
    }

    if (currentUser.role === 'farmer') {
      return [
        { id: 'farmer_commodities', label: t('nav_my_commodities'), icon: Sprout },
        { id: 'farmer_orders', label: t('nav_incoming_orders'), icon: ShoppingCart },
        { id: 'farmer_hire_transport', label: t('nav_hire_transport'), icon: Truck, color: 'text-blue-700' },
        { id: 'marketplace', label: t('nav_marketplace'), icon: ShoppingCart },
        { id: 'support_queries', label: t('nav_queries_help'), icon: HelpCircle },
        { id: 'agri_intelligence', label: t('nav_agri_intel'), icon: Sparkles, badge: 'AI' },
        { id: 'impact_dashboard', label: t('nav_impact'), icon: BarChart3 },
        { id: 'fee_simulator', label: t('nav_fee_simulator'), icon: Calculator },
      ];
    }

    if (currentUser.role === 'buyer') {
      return [
        { id: 'marketplace', label: t('nav_marketplace'), icon: ShoppingCart },
        { id: 'buyer_orders', label: t('nav_my_purchases'), icon: Package },
        { id: 'support_queries', label: t('nav_queries_help'), icon: HelpCircle },
        { id: 'agri_intelligence', label: t('nav_agri_intel'), icon: Sparkles, badge: 'AI' },
        { id: 'impact_dashboard', label: t('nav_impact'), icon: BarChart3 },
        { id: 'fee_simulator', label: t('nav_fee_simulator'), icon: Calculator },
      ];
    }

    if (currentUser.role === 'transporter') {
      return [
        { id: 'transporter_jobs', label: t('nav_available_jobs'), icon: Truck },
        { id: 'transporter_my_jobs', label: t('nav_active_deliveries'), icon: Package },
        { id: 'support_queries', label: t('nav_queries_help'), icon: HelpCircle },
        { id: 'agri_intelligence', label: t('nav_agri_intel'), icon: Sparkles, badge: 'AI' },
        { id: 'impact_dashboard', label: t('nav_impact'), icon: BarChart3 },
      ];
    }

    if (currentUser.role === 'admin') {
      return [
        { id: 'admin_overview', label: t('nav_control_center'), icon: ShieldCheck, color: 'text-purple-700' },
        { id: 'finance_revenue', label: t('nav_finance'), icon: Coins, color: 'text-rose-700' },
        { id: 'transactions_table', label: t('nav_transactions'), icon: Package },
        { id: 'support_queries', label: t('nav_queries_help'), icon: HelpCircle },
        { id: 'agri_intelligence', label: t('nav_agri_intel'), icon: Sparkles, badge: 'AI' },
        { id: 'impact_dashboard', label: t('nav_impact'), icon: BarChart3 },
        { id: 'fee_simulator', label: t('nav_fee_simulator'), icon: Calculator },
      ];
    }

    if (currentUser.role === 'finance_admin') {
      return [
        { id: 'finance_revenue', label: t('nav_finance'), icon: Coins, color: 'text-rose-700' },
        { id: 'transactions_table', label: t('nav_transactions'), icon: Package },
        { id: 'support_queries', label: t('nav_queries_help'), icon: HelpCircle },
        { id: 'impact_dashboard', label: t('nav_impact'), icon: BarChart3 },
        { id: 'fee_simulator', label: t('nav_fee_simulator'), icon: Calculator },
      ];
    }

    return [];
  };

  const navItems = getNavItems();

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Header Bar with Auto-Hide transition */}
      <header
        className={`sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200 shadow-xs transition-transform duration-300 ease-in-out ${
          showHeader ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand Logo & Name */}
            <div
              onClick={() => setActiveTab(currentUser ? (currentUser.role === 'admin' ? 'admin_overview' : 'farmer_commodities') : 'landing')}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20 group-hover:scale-105 transition-transform">
                <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-stone-900 tracking-tight text-base sm:text-lg group-hover:text-emerald-800 transition-colors">
                    Malawi Harvest Hub
                  </span>
                  <span className="inline-block px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase bg-emerald-100 text-emerald-800 rounded">
                    MW
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 font-medium hidden md:block">
                  {t('app_tagline')}
                </p>
              </div>
            </div>

            {/* Desktop Center Navigation (Visible on lg+) */}
            <nav className="hidden lg:flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl border border-stone-200/60 overflow-x-auto">
              {navItems.slice(0, 5).map((item) => {
                const ItemIcon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-emerald-800 shadow-xs border border-stone-200/60 font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ItemIcon className={`w-3.5 h-3.5 ${item.color || (isActive ? 'text-emerald-700' : 'text-stone-500')}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* More dropdown for remaining nav items on desktop if more than 5 */}
              {navItems.length > 5 && (
                <div className="relative group">
                  <button className="px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg flex items-center gap-1">
                    <span>{language === 'ch' ? 'Zambiri' : 'More'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-stone-200 p-1 hidden group-hover:block animate-in fade-in-50 duration-100 z-50">
                    {navItems.slice(5).map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 transition-colors ${
                            isActive ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <ItemIcon className="w-3.5 h-3.5 text-stone-500" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </nav>

            {/* Right Header Utilities */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* LANGUAGE SELECTION SIDE (Desktop / Tablet) */}
              <div className="relative">
                <button
                  onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                  className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-stone-800 transition-colors shadow-2xs"
                  title={t('lang_select')}
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-[11px] font-extrabold uppercase">
                    {language === 'ch' ? '🇲🇼 Chichewa' : '🇬🇧 English'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {languageMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-stone-200 p-1.5 z-50 animate-in fade-in-50 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      {t('lang_select')}
                    </div>
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setLanguageMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        language === 'en' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>🇬🇧</span>
                        <span>English</span>
                      </span>
                      {language === 'en' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('ch');
                        setLanguageMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        language === 'ch' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>🇲🇼</span>
                        <span>Chichewa</span>
                      </span>
                      {language === 'ch' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications Bell (Desktop & Mobile) */}
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                title={t('nav_notifications')}
              >
                <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Device Mode Toggle (Desktop only) */}
              <button
                onClick={() => setIsMobileSimulator(!isMobileSimulator)}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isMobileSimulator
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
                title="Toggle Native Mobile App Simulation"
              >
                {isMobileSimulator ? (
                  <>
                    <Monitor className="w-3.5 h-3.5" />
                    <span>{t('nav_desktop_view')}</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{t('nav_mobile_view')}</span>
                  </>
                )}
              </button>

              {/* Desktop User Profile Button & Dropdown */}
              {currentUser ? (
                <div className="hidden lg:flex items-center gap-2">
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
                      <div className="text-left">
                        <div className="text-xs font-bold text-stone-900 leading-tight">
                          {currentUser.fullName}
                        </div>
                        <div className="text-[10px] font-medium text-stone-500 leading-tight">
                          {currentRoleConfig.label} &bull; {currentUser.district}
                        </div>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                    </button>

                    {/* Role / Profile Dropdown Card */}
                    {roleDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 space-y-3 z-50 animate-in fade-in-50 duration-150">
                        {/* User Profile Header */}
                        <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                          <div className="relative group">
                            {currentUser.photoUrl ? (
                              <img
                                src={currentUser.photoUrl}
                                alt={currentUser.fullName}
                                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-600/30 shadow-xs"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shadow-xs">
                                <CurrentIcon className="w-6 h-6" />
                              </div>
                            )}
                            <label
                              className="absolute -bottom-1 -right-1 p-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg cursor-pointer shadow-md text-[10px]"
                              title={t('auth_profile_picture')}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingPhoto}
                                className="hidden"
                                onChange={handlePhotoUpload}
                              />
                              {uploadingPhoto ? '⏳' : '📷'}
                            </label>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-stone-900 text-sm truncate">
                              {currentUser.fullName}
                            </h4>
                            <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {currentRoleConfig.label}
                            </span>
                          </div>
                        </div>

                        {/* User Details */}
                        <div className="space-y-1.5 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                          <div className="flex justify-between">
                            <span className="text-stone-400">{t('auth_email')}:</span>
                            <span className="font-medium text-stone-800 truncate max-w-[160px]">{currentUser.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-400">{t('auth_phone')}:</span>
                            <span className="font-medium text-stone-800">{currentUser.phoneNumber || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-400">{t('auth_district')}:</span>
                            <span className="font-medium text-stone-800">{currentUser.district}</span>
                          </div>
                        </div>

                        {/* Photo Upload Hint */}
                        <label className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingPhoto}
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                          <span>{uploadingPhoto ? t('auth_saving_picture') : t('auth_profile_picture')}</span>
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
                          <span>{t('auth_signout')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Sign Out */}
                  <button
                    onClick={async () => {
                      await logout();
                      setActiveTab('signin');
                    }}
                    className="p-2 rounded-xl text-stone-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    title={t('auth_signout')}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (onOpenAuthModal) onOpenAuthModal('signin');
                    else setActiveTab('signin');
                  }}
                  className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('auth_signin')}</span>
                </button>
              )}

              {/* 3-DOTTED BAR BUTTON (Small Screens / Mobile & Tablet: < lg) */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 transition-colors shadow-2xs flex items-center justify-center"
                aria-label="Open Navigation Menu"
                title={t('nav_menu')}
              >
                <MoreVertical className="w-5 h-5 text-stone-800" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE LIST-FORMAT NAVIGATION DRAWER (Opened via 3-dotted bar) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer container */}
          <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <Sprout className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">{t('nav_menu')}</h3>
                  <p className="text-[10px] text-stone-500">Malawi Harvest Hub</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
                title={t('common_close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Selection Side in Mobile Menu */}
            <div className="p-4 border-b border-stone-200 bg-emerald-50/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t('lang_select')}</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  {language === 'ch' ? '🇲🇼 Chichewa' : '🇬🇧 English'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    language === 'en'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-600/30'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>English</span>
                  {language === 'en' && <Check className="w-3 h-3 ml-1" />}
                </button>
                <button
                  onClick={() => setLanguage('ch')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    language === 'ch'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-600/30'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>🇲🇼</span>
                  <span>Chichewa</span>
                  {language === 'ch' && <Check className="w-3 h-3 ml-1" />}
                </button>
              </div>
            </div>

            {/* User Profile Card (if authenticated) */}
            {currentUser && (
              <div className="p-4 border-b border-stone-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {currentUser.photoUrl ? (
                      <img
                        src={currentUser.photoUrl}
                        alt={currentUser.fullName}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-600/30 shadow-xs"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base ${currentRoleConfig.color}`}>
                        <CurrentIcon className="w-6 h-6" />
                      </div>
                    )}
                    <label
                      className="absolute -bottom-1 -right-1 p-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg cursor-pointer shadow-md text-[9px]"
                      title={t('auth_profile_picture')}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingPhoto}
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      {uploadingPhoto ? '⏳' : '📷'}
                    </label>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-900 text-sm truncate">
                      {currentUser.fullName}
                    </h4>
                    <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {currentRoleConfig.label}
                    </span>
                    <div className="text-[11px] text-stone-500 mt-0.5 truncate">
                      {currentUser.district} &bull; {currentUser.phoneNumber || currentUser.email}
                    </div>
                  </div>
                </div>

                <label className="mt-3 w-full py-1.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <span>{uploadingPhoto ? t('auth_saving_picture') : t('auth_profile_picture')}</span>
                </label>
              </div>
            )}

            {/* Vertical Menu Navigation in Clean List Format */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                {language === 'ch' ? 'Zosankha Zaikulu' : 'Main Navigation'}
              </div>

              {navItems.map((item) => {
                const ItemIcon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-emerald-700 text-white font-bold shadow-xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ItemIcon className={`w-4 h-4 ${isActive ? 'text-white' : item.color || 'text-stone-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        isActive ? 'bg-emerald-800 text-emerald-200' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Quick Simulator & Realtime in list */}
              <div className="pt-2 mt-2 border-t border-stone-200/80 px-1 space-y-1">
                <button
                  onClick={() => {
                    setIsMobileSimulator(!isMobileSimulator);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isMobileSimulator ? <Monitor className="w-4 h-4 text-stone-600" /> : <Smartphone className="w-4 h-4 text-stone-600" />}
                    <span>{isMobileSimulator ? t('nav_desktop_view') : t('nav_mobile_view')}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {isMobileSimulator ? 'ON' : 'OFF'}
                  </span>
                </button>

                <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-between text-xs text-stone-600">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-[11px] font-medium">
                      {isConnected ? t('realtime_connected') : t('realtime_connecting')}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions: Sign In or Sign Out */}
            <div className="p-4 border-t border-stone-200 bg-stone-50/90">
              {currentUser ? (
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                    setActiveTab('signin');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-rose-200/60"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('auth_signout')}</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAuthModal) onOpenAuthModal('signin');
                      else setActiveTab('signin');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold text-center shadow-xs"
                  >
                    {t('auth_signin')}
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAuthModal) onOpenAuthModal('register');
                      else setActiveTab('signin');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold text-center"
                  >
                    {t('auth_register')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role Access Restricted Modal */}
      {accessDeniedNotice && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 p-6 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-amber-700" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">
              {language === 'ch' ? 'Kulepheretsidwa Kulowa' : 'Role Access Restricted'}
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {accessDeniedNotice}
            </p>
            <div className="pt-2">
              <button
                onClick={() => setAccessDeniedNotice(null)}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs shadow-xs"
              >
                {t('common_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
