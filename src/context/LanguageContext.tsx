import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ch';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header & Brand
    app_title: 'Malawi Harvest Hub',
    app_tagline: 'Chitukuko cha Ulimi • Agricultural Trade & Logistics',
    lang_en: 'English',
    lang_ch: 'Chichewa',
    lang_select: 'Select Language',
    lang_current: 'Language: English',
    
    // Navigation
    nav_overview: 'Overview',
    nav_browse: 'Browse Produce',
    nav_marketplace: 'Marketplace',
    nav_agri_intel: 'Agri-Intelligence',
    nav_my_commodities: 'My Commodities',
    nav_incoming_orders: 'Incoming Orders',
    nav_hire_transport: 'Hire Transporter',
    nav_queries_help: 'Queries & Help',
    nav_my_purchases: 'My Purchases & Tracking',
    nav_available_jobs: 'Available Freight Jobs',
    nav_active_deliveries: 'Active Deliveries',
    nav_control_center: 'Control Center',
    nav_finance: 'Finance Approvals & Ledger',
    nav_transactions: 'Transactions',
    nav_impact: 'Impact Overview',
    nav_fee_simulator: 'Fee Simulator',
    nav_desktop_view: 'Desktop View',
    nav_mobile_view: 'Mobile App View',
    nav_notifications: 'Notifications',
    nav_menu: 'Navigation Menu',

    // Auth & Profile
    auth_signin: 'Sign In',
    auth_register: 'Create Account',
    auth_signout: 'Sign Out',
    auth_email: 'Email',
    auth_password: 'Password',
    auth_phone: 'Phone Number',
    auth_district: 'District',
    auth_trading_area: 'Trading Center',
    auth_vehicle: 'Vehicle Type',
    auth_profile_picture: 'Upload / Change Profile Picture',
    auth_saving_picture: 'Saving Profile Picture...',
    auth_logged_in_as: 'Signed in as',

    // Roles
    role_farmer: 'Smallholder Farmer',
    role_buyer: 'Agro-Commodity Buyer',
    role_transporter: 'Freight Transporter',
    role_admin: 'Lead Administrator',
    role_finance_admin: 'Finance Administrator',

    // Marketplace & Orders
    market_search_placeholder: 'Search produce, farmers, locations...',
    market_category_all: 'All Categories',
    market_district_all: 'All Districts',
    market_grade_all: 'All Quality Grades',
    market_sort_qty: 'Highest Quantity',
    market_sort_price_asc: 'Lowest Price First',
    market_sort_price_desc: 'Highest Price First',
    market_unit_price: 'Price per Unit',
    market_available_qty: 'Available Stock',
    market_order_now: 'Order Produce',
    market_order_modal_title: 'Direct Farmgate Produce Order',
    market_escrow_badge: 'Capped Escrow Protection',
    market_platform_commission: 'Platform Commission',
    market_produce_subtotal: 'Produce Subtotal',
    market_transport_estimate: 'Logistics & Transport Estimate',
    market_grand_total: 'Grand Total (Deposit to Escrow)',
    market_payment_channel: 'Select Escrow Payment Channel',
    market_confirm_order: 'Confirm & Deposit into Escrow',

    // Statuses
    status_available: 'Available',
    status_sold_out: 'Sold Out',
    status_pending_verification: 'Pending Payment Verification',
    status_escrow_held: 'Escrow Funds Held',
    status_dispatched: 'In Transit',
    status_delivered: 'Delivered & Confirmed',
    status_funds_disbursed: 'Farmer Paid / Complete',
    status_cancelled: 'Cancelled',

    // Realtime
    realtime_connected: 'Postgres Realtime Connected',
    realtime_connecting: 'Connecting to Database...',

    // Settings
    settings_title: 'Platform Financial Parameters',
    settings_commission_rate: 'Commodity Trade Commission Rate',
    settings_save: 'Save Settings to PostgreSQL',
    settings_saved_success: 'Platform settings saved successfully to PostgreSQL database.',

    // Common
    common_close: 'Close',
    common_back: 'Back',
    common_save: 'Save',
    common_cancel: 'Cancel',
    common_delete: 'Delete',
    common_confirm: 'Confirm',
    common_filter: 'Filter',
    common_actions: 'Actions',
    common_details: 'Details',
    common_empty: 'No records found',
    common_refresh: 'Refresh',
    common_copy: 'Copy',
    common_copied: 'Copied!',
    common_loading: 'Loading data...',
  },
  ch: {
    // Header & Brand
    app_title: 'Malawi Harvest Hub',
    app_tagline: 'Chitukuko cha Ulimi • Malonda a Zokolola & Mayendedwe ku Malawi',
    lang_en: 'Chingerezi (English)',
    lang_ch: 'Chichewa',
    lang_select: 'Sankhani Chilankhulo',
    lang_current: 'Chilankhulo: Chichewa',
    
    // Navigation
    nav_overview: 'Chidule cha Dongosolo',
    nav_browse: 'Fufuzani Zokolola',
    nav_marketplace: 'Msika wa Zokolola',
    nav_agri_intel: 'Nzeru za Ulimi & Msika',
    nav_my_commodities: 'Zokolola Zanga',
    nav_incoming_orders: 'Maoda Obwera',
    nav_hire_transport: 'Lembani Wonyamula Katundu',
    nav_queries_help: 'Mafunso & Chithandizo',
    nav_my_purchases: 'Zogula Zanga & Tsatirani',
    nav_available_jobs: 'Ntchito za Katundu Zomwe Zilipo',
    nav_active_deliveries: 'Katundu Womwe Akuperekedwa',
    nav_control_center: 'Bwalo la Oyang\'anira',
    nav_finance: 'Zachuma & Chivomerezo cha Escrow',
    nav_transactions: 'Zochitika Zachuma',
    nav_impact: 'Kukula & Phindu ku Malawi',
    nav_fee_simulator: 'Wowerengera Ndalama za Escrow',
    nav_desktop_view: 'Kawonedwe ka Kompyuta',
    nav_mobile_view: 'Kawonedwe ka Foni',
    nav_notifications: 'Zidziwitso',
    nav_menu: 'Menyu ya Zosankha',

    // Auth & Profile
    auth_signin: 'Lowani mu Akaunti',
    auth_register: 'Tsegulani Akaunti Yatsopano',
    auth_signout: 'Tulukani',
    auth_email: 'Imelo Yanu',
    auth_password: 'Mawu Achinsinsi (Password)',
    auth_phone: 'Nambala ya Foni',
    auth_district: 'Boma Lanu',
    auth_trading_area: 'Msika / Likulu la Malonda',
    auth_vehicle: 'Mtundu wa Galimoto',
    auth_profile_picture: 'Ikani / Sinthani Chithunzi Chanu',
    auth_saving_picture: 'Kusunga Chithunzi...',
    auth_logged_in_as: 'Mwalowa monga',

    // Roles
    role_farmer: 'Mlimi Waing\'ono',
    role_buyer: 'Wogula Zokolola',
    role_transporter: 'Woyendetsa Galimoto ya Katundu',
    role_admin: 'Mtsogoleri Wamkulu wa Dongosolo',
    role_finance_admin: 'Mtsogoleri wa Zachuma',

    // Marketplace & Orders
    market_search_placeholder: 'Sakani zokolola, alimi, malo...',
    market_category_all: 'Magulu Onse a Mbewu',
    market_district_all: 'Maboma Onse',
    market_grade_all: 'Miyeso Yonse ya Ubwino',
    market_sort_qty: 'Zambiri Kwambiri',
    market_sort_price_asc: 'Mtengo Wotsika Kwambiri',
    market_sort_price_desc: 'Mtengo Wapamwamba Kwambiri',
    market_unit_price: 'Mtengo pa Muyeso',
    market_available_qty: 'Kuchuluka Komwe Kulipo',
    market_order_now: 'Gulani Tsopano',
    market_order_modal_title: 'Kugula Zokolola Mwachindunji kwa Alimi',
    market_escrow_badge: 'Chitetezo cha Escrow Chovomerezeka',
    market_platform_commission: 'Ndalama ya Utumiki wa Dongosolo',
    market_produce_subtotal: 'Mtengo Wonse wa Zokolola',
    market_transport_estimate: 'Ndalama Yoyerekeza ya Mayendedwe',
    market_grand_total: 'Ndalama Zonse (Ikani mu Escrow)',
    market_payment_channel: 'Sankhani Njira Yolipirira Escrow',
    market_confirm_order: 'Tsimikizani & Ikani Ndalama mu Escrow',

    // Statuses
    status_available: 'Zilipo',
    status_sold_out: 'Zatha',
    status_pending_verification: 'Kudikira Chitsimikizo cha Malipiro',
    status_escrow_held: 'Ndalama Zili mu Escrow Motetezedwa',
    status_dispatched: 'Katundu Ali pa Ulendo',
    status_delivered: 'Zalandiridwa & Zatsimikizidwa',
    status_funds_disbursed: 'Mlimi Walipidwa / Zatha Bwino',
    status_cancelled: 'Zathetsedwa',

    // Realtime
    realtime_connected: 'Kulumikizidwa ndi PostgreSQL Realtime',
    realtime_connecting: 'Kulumikizana ndi Database...',

    // Settings
    settings_title: 'Miyeso ya Zachuma pa Dongosolo',
    settings_commission_rate: 'Mlingo wa Commission ya Malonda',
    settings_save: 'Sungani Zokonda mu PostgreSQL',
    settings_saved_success: 'Zokonda zasungidwa bwino mu PostgreSQL database.',

    // Common
    common_close: 'Tsekani',
    common_back: 'Bwererani',
    common_save: 'Sungani',
    common_cancel: 'Lekani',
    common_delete: 'Chotsani',
    common_confirm: 'Tsimikizani',
    common_filter: 'Sankhani Mwapadera',
    common_actions: 'Zochita',
    common_details: 'Tsatanetsatane',
    common_empty: 'Palibe zomwe zapezeka',
    common_refresh: 'Konzaninso',
    common_copy: 'Koperani',
    common_copied: 'Zakopera!',
    common_loading: 'Kutenga zambiri...',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('mhh_language');
      if (saved === 'ch' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('mhh_language', lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ch' : 'en');
  };

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language] || translations.en;
    if (langDict[key]) return langDict[key];
    const enDict = translations.en;
    if (enDict[key]) return enDict[key];
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
