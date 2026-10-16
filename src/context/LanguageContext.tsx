import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'ch';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header & Brand
    app_title: 'Malawi Harvest Hub',
    app_tagline: 'Chitukuko cha Ulimi • Agricultural Trade & Logistics across Malawi',
    lang_en: 'English',
    lang_ch: 'Chichewa',
    lang_select: 'Select Language',
    lang_current: 'Language: English',
    lang_side_label: 'Language Selector',

    // Navigation
    nav_overview: 'Overview',
    nav_browse: 'Browse Produce',
    nav_marketplace: 'Produce Marketplace',
    nav_agri_intel: 'Agri-Intelligence (AI)',
    nav_my_commodities: 'My Farm Commodities',
    nav_incoming_orders: 'Incoming Produce Orders',
    nav_hire_transport: 'Hire Transporter',
    nav_queries_help: 'Queries & Help Desk',
    nav_my_purchases: 'My Purchases & Tracking',
    nav_available_jobs: 'Available Freight Jobs',
    nav_active_deliveries: 'Active Deliveries',
    nav_control_center: 'Administrator Control Center',
    nav_finance: 'Finance Approvals & Escrow Ledger',
    nav_transactions: 'Transactions Ledger',
    nav_impact: 'Impact Overview & Metrics',
    nav_fee_simulator: 'Fee & Escrow Simulator',
    nav_desktop_view: 'Desktop View',
    nav_mobile_view: 'Mobile View',
    nav_notifications: 'Notifications',
    nav_menu: 'Navigation Menu',

    // Landing Page
    landing_badge: "Malawi's Premier Agricultural Digital Exchange",
    landing_hero_title: 'Connecting Malawian Farmers, Commercial Buyers & Freight Transporters',
    landing_hero_desc: 'Secure escrow payments, transparent farmgate prices, direct transport logistics, and guaranteed settlement across all 28 districts of Malawi.',
    landing_btn_explore: 'Explore Marketplace',
    landing_btn_signin: 'Sign In / Join Hub',
    landing_feat_farmgate_title: 'Direct Farmgate Trade',
    landing_feat_farmgate_desc: 'Cut out predatory middlemen. Smallholders receive fair market value while buyers source certified quality produce directly from rural aggregation centers.',
    landing_feat_escrow_title: '4% Capped Escrow Protection',
    landing_feat_escrow_desc: 'Funds are securely deposited in escrow via Airtel Money, TNM Mpamba, or National Bank of Malawi before produce leaves the farm.',
    landing_feat_transport_title: 'Verified Freight Transporters',
    landing_feat_transport_desc: 'Connect directly with reliable 3-ton to 30-ton truck operators across Malawi. Real-time delivery coordination and transparent distance pricing.',
    landing_feat_districts_title: 'National Coverage: 28 Districts',
    landing_feat_districts_desc: 'Connecting agricultural hubs from Chitipa, Karonga, and Mzuzu in the North, through Lilongwe, Mchinji, and Kasungu, to Blantyre and Mulanje in the South.',
    landing_live_produce_title: 'Fresh Agricultural Produce Available Now',
    landing_live_produce_subtitle: 'Direct farmgate listings with verified weights, moisture levels, and quality certifications.',
    landing_card_price_per: 'Price per',
    landing_card_available: 'Available stock:',
    landing_card_order: 'Order Produce',
    landing_card_view_details: 'View Details',
    landing_all_commodities_btn: 'View All Commodities in Marketplace',
    landing_why_title: 'Why Malawi Harvest Hub?',
    landing_why_subtitle: 'Empowering smallholder farmers, expanding market reach, and securing agricultural food supply chains across Malawi.',
    landing_stat_farmers: 'Registered Smallholder Farmers',
    landing_stat_districts: 'Malawian Districts Active',
    landing_stat_orders: 'Completed Deliveries',
    landing_stat_escrow: 'Protected Escrow Volume',

    // Auth & Profile
    auth_signin: 'Sign In',
    auth_register: 'Create Account',
    auth_signout: 'Sign Out',
    auth_email: 'Email Address',
    auth_password: 'Password',
    auth_phone: 'Phone Number (+265)',
    auth_district: 'Home District',
    auth_trading_area: 'Trading Center / Market Depot',
    auth_vehicle: 'Vehicle Type (for transporters)',
    auth_profile_picture: 'Change Profile Picture',
    auth_saving_picture: 'Saving Profile Picture...',
    auth_logged_in_as: 'Signed in as',
    auth_choose_role: 'Select Platform Role',
    auth_full_name: 'Full Name',
    auth_confirm_password: 'Confirm Password',
    auth_forgot_password: 'Forgot Password?',
    auth_already_have_account: 'Already have an account? Sign In',
    auth_need_account: "Don't have an account? Register Now",

    // Roles
    role_farmer: 'Smallholder Farmer',
    role_buyer: 'Agro-Commodity Buyer',
    role_transporter: 'Freight Transporter',
    role_admin: 'Lead Administrator',
    role_finance_admin: 'Finance Administrator',

    // Marketplace & Orders
    market_search_placeholder: 'Search produce (e.g., White Maize, Soya, Chalimbana, Rice, Beans)...',
    market_category_all: 'All Categories',
    market_district_all: 'All Districts (28)',
    market_grade_all: 'All Quality Grades',
    market_sort_qty: 'Highest Available Stock',
    market_sort_price_asc: 'Lowest Price First',
    market_sort_price_desc: 'Highest Price First',
    market_unit_price: 'Price per Unit',
    market_available_qty: 'Available Stock',
    market_order_now: 'Place Produce Order',
    market_order_modal_title: 'Direct Farmgate Produce Order',
    market_escrow_badge: 'Capped Escrow Protection (4%)',
    market_platform_commission: 'Platform Commission (4%)',
    market_produce_subtotal: 'Produce Subtotal',
    market_transport_estimate: 'Logistics & Transport Estimate',
    market_grand_total: 'Grand Total (Deposit to Escrow)',
    market_payment_channel: 'Select Escrow Payment Channel',
    market_confirm_order: 'Confirm & Deposit into Escrow',
    market_quantity_label: 'Order Quantity',
    market_delivery_district: 'Delivery District',
    market_delivery_location: 'Specific Delivery Warehouse / Address',

    // Categories
    cat_grains: 'Grains & Cereals',
    cat_legumes: 'Legumes & Pulses',
    cat_oilseeds: 'Oilseeds & Nuts',
    cat_roots: 'Roots & Tubers',
    cat_commercial: 'Commercial Crops',

    // Statuses
    status_available: 'Available in Stock',
    status_sold_out: 'Sold Out',
    status_pending_verification: 'Pending Payment Verification',
    status_escrow_held: 'Escrow Funds Held',
    status_dispatched: 'In Transit / Dispatched',
    status_delivered: 'Delivered & Confirmed',
    status_funds_disbursed: 'Farmer Paid / Complete',
    status_cancelled: 'Cancelled & Refunded',
    status_pending: 'Pending',
    status_completed: 'Completed',

    // Notifications
    notif_title: 'Notifications',
    notif_subtitle: 'Live operational & financial updates',
    notif_empty: 'No notifications yet',
    notif_empty_sub: 'New order, delivery, and payment alerts will show here in real time.',
    notif_mark_all_read: 'Mark all as read',
    notif_auto_delete_banner: 'Viewed notifications automatically delete permanently after 30 seconds.',
    notif_deleting_in: 'Auto-deleting in',
    notif_delete_now: 'Delete permanently now',

    // Realtime & Settings
    realtime_connected: 'PostgreSQL Realtime Connected',
    realtime_connecting: 'Connecting to Database...',
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
    common_more: 'More Options',
  },
  ch: {
    // Header & Brand
    app_title: 'Malawi Harvest Hub',
    app_tagline: 'Chitukuko cha Ulimi • Malonda a Zokolola & Mayendedwe ku Malawi konse',
    lang_en: 'Chingerezi (English)',
    lang_ch: 'Chichewa',
    lang_select: 'Sankhani Chilankhulo',
    lang_current: 'Chilankhulo: Chichewa',
    lang_side_label: 'Sankhani Chilankhulo',

    // Navigation
    nav_overview: 'Chidule cha Dongosolo',
    nav_browse: 'Fufuzani Zokolola',
    nav_marketplace: 'Msika wa Zokolola',
    nav_agri_intel: 'Nzeru za Ulimi & Msika (AI)',
    nav_my_commodities: 'Zokolola Zanga Zapafamu',
    nav_incoming_orders: 'Maoda a Zokolola Obwera',
    nav_hire_transport: 'Lembani Wonyamula Katundu',
    nav_queries_help: 'Mafunso & Chithandizo',
    nav_my_purchases: 'Zogula Zanga & Tsatirani',
    nav_available_jobs: 'Ntchito za Katundu Zomwe Zilipo',
    nav_active_deliveries: 'Katundu Womwe Akuperekedwa',
    nav_control_center: 'Bwalo la Oyang\'anira Akulu',
    nav_finance: 'Zachuma & Chivomerezo cha Escrow',
    nav_transactions: 'Kaundula wa Zochitika Zachuma',
    nav_impact: 'Kukula & Phindu ku Malawi',
    nav_fee_simulator: 'Wowerengera Ndalama za Escrow',
    nav_desktop_view: 'Kawonedwe ka Kompyuta',
    nav_mobile_view: 'Kawonedwe ka Foni',
    nav_notifications: 'Zidziwitso',
    nav_menu: 'Menyu ya Zosankha',

    // Landing Page
    landing_badge: 'Msika Wapamwamba wa Zokolola pa Intaneti ku Malawi',
    landing_hero_title: 'Kugwirizanitsa Alimi a ku Malawi, Ogula Zokolola & Oyendetsa Magalimoto a Katundu',
    landing_hero_desc: 'Malipiro otetezedwa a escrow, mitengo yowonekera bwino ya pafamu, mayendedwe achindunji a katundu, ndi kugawa ndalama moyenera m\'maboma onse 28 a Malawi.',
    landing_btn_explore: 'Fufuzani Msika wa Zokolola',
    landing_btn_signin: 'Lowani / Tsegulani Akaunti ku Hub',
    landing_feat_farmgate_title: 'Malonda a Pafamu Mwachindunji',
    landing_feat_farmgate_desc: 'Chotsani anyamata apakatikati odyera alimi masuku pamutu. Alimi alandire mtengo woyenera pamene ogula akugula mbewu zabwino zotsimikizika.',
    landing_feat_escrow_title: 'Chitetezo cha Escrow pa 4%',
    landing_feat_escrow_desc: 'Ndalama zimasungidwa motetezedwa mu escrow kudzera pa Airtel Money, TNM Mpamba, kapena National Bank of Malawi mbewu zisanachoke pafamu.',
    landing_feat_transport_title: 'Oyendetsa Katundu Odalirika',
    landing_feat_transport_desc: 'Lumikizanani mwachindunji ndi magalimoto odalirika a matani 3 mpaka matani 30 ku Malawi konse. Mitengo yodziwika bwino ndi kutsatira katundu panjira.',
    landing_feat_districts_title: 'Kufikira Maboma Onse 28 a Malawi',
    landing_feat_districts_desc: 'Kugwirizanitsa alimi kuyambira ku Chitipa, Karonga, Mzuzu kumpoto, kudutsa Lilongwe, Mchinji, Kasungu pakati, mpaka Blantyre ndi Mulanje kumwera.',
    landing_live_produce_title: 'Zokolola Zatsopano Zochokera Pafamu Pompano',
    landing_live_produce_subtitle: 'Mbewu zochokera mwachindunji kwa alimi ndi miyeso yotsimikizika ya kulemera, chinyezi, ndi giredi.',
    landing_card_price_per: 'Mtengo pa',
    landing_card_available: 'Zomwe zilipo:',
    landing_card_order: 'Gulani Zokolola',
    landing_card_view_details: 'Onani Zambiri',
    landing_all_commodities_btn: 'Onani Zokolola Zonse Pamsika',
    landing_why_title: 'Chifukwa Chiyani Musankhe Malawi Harvest Hub?',
    landing_why_subtitle: 'Kulimbikitsa alimi aang\'ono, kukulitsa msika, ndi kukhazikitsa chitetezo cha chakudya m\'dziko lonselo.',
    landing_stat_farmers: 'Alimi Aang\'ono Olembedwa',
    landing_stat_districts: 'Maboma a ku Malawi Omwe Akugwira Ntchito',
    landing_stat_orders: 'Katundu Woperekedwa Bwino',
    landing_stat_escrow: 'Ndalama Zotetezedwa mu Escrow',

    // Auth & Profile
    auth_signin: 'Lowani mu Akaunti',
    auth_register: 'Tsegulani Akaunti Yatsopano',
    auth_signout: 'Tulukani',
    auth_email: 'Adilesi ya Imelo',
    auth_password: 'Mawu Achinsinsi (Password)',
    auth_phone: 'Nambala ya Foni (+265)',
    auth_district: 'Boma Lanu Lokhalamo',
    auth_trading_area: 'Msika / Malo Ogulitsira',
    auth_vehicle: 'Mtundu wa Galimoto (kwa onyamula katundu)',
    auth_profile_picture: 'Sinthani Chithunzi Chanu',
    auth_saving_picture: 'Kusunga Chithunzi...',
    auth_logged_in_as: 'Mwalowa monga',
    auth_choose_role: 'Sankhani Udindo Wanu',
    auth_full_name: 'Maina Anu Onse',
    auth_confirm_password: 'Tsimikizani Mawu Achinsinsi',
    auth_forgot_password: 'Mwayiwala Mawu Achinsinsi?',
    auth_already_have_account: 'Muli ndi akaunti kale? Lowani pano',
    auth_need_account: 'Mulibe akaunti? Lembetsani Tsopano',

    // Roles
    role_farmer: 'Mlimi Waing\'ono',
    role_buyer: 'Wogula Zokolola',
    role_transporter: 'Woyendetsa Galimoto ya Katundu',
    role_admin: 'Mtsogoleri Wamkulu wa Dongosolo',
    role_finance_admin: 'Mtsogoleri wa Zachuma',

    // Marketplace & Orders
    market_search_placeholder: 'Sakani zokolola (monga Chimanga, Soya, Chalimbana, Mpunga, Nyemba)...',
    market_category_all: 'Magulu Onse a Mbewu',
    market_district_all: 'Maboma Onse (28)',
    market_grade_all: 'Miyeso Yonse ya Ubwino',
    market_sort_qty: 'Zambiri Zomwe Zilipo',
    market_sort_price_asc: 'Mtengo Wotsika Kwambiri Poyamba',
    market_sort_price_desc: 'Mtengo Wapamwamba Kwambiri Poyamba',
    market_unit_price: 'Mtengo pa Muyeso',
    market_available_qty: 'Kuchuluka Komwe Kulipo',
    market_order_now: 'Gulani Zokolola',
    market_order_modal_title: 'Kugula Zokolola Mwachindunji kwa Alimi',
    market_escrow_badge: 'Chitetezo cha Escrow Chovomerezeka (4%)',
    market_platform_commission: 'Ndalama ya Utumiki wa Dongosolo (4%)',
    market_produce_subtotal: 'Mtengo Wonse wa Zokolola',
    market_transport_estimate: 'Ndalama Yoyerekeza ya Mayendedwe',
    market_grand_total: 'Ndalama Zonse (Ikani mu Escrow)',
    market_payment_channel: 'Sankhani Njira Yolipirira Escrow',
    market_confirm_order: 'Tsimikizani & Ikani Ndalama mu Escrow',
    market_quantity_label: 'Kuchuluka Komwe Mukufuna',
    market_delivery_district: 'Boma Lomwe Katundu Apitako',
    market_delivery_location: 'Adilesi Yeniyeni kapena Nkhokwe Yolandirirapo',

    // Categories
    cat_grains: 'Grains & Cereals (Chimanga, Mpunga, Mapira)',
    cat_legumes: 'Legumes & Pulses (Soya, Sugar Beans, Nandolo)',
    cat_oilseeds: 'Oilseeds & Nuts (Mtedza wa Chalimbana, Mpendadzuwa)',
    cat_roots: 'Roots & Tubers (Chinangwa, Mbatata Zofiira, Mbatata)',
    cat_commercial: 'Commercial Crops (Fodya, Khofi, Tiyi)',

    // Statuses
    status_available: 'Zilipo m\'Nkhokwe',
    status_sold_out: 'Zatha Zonse',
    status_pending_verification: 'Kudikira Chitsimikizo cha Malipiro',
    status_escrow_held: 'Ndalama Zili mu Escrow Motetezedwa',
    status_dispatched: 'Katundu Ali pa Ulendo',
    status_delivered: 'Zalandiridwa & Zatsimikizidwa',
    status_funds_disbursed: 'Mlimi Walipidwa / Zatha Bwino',
    status_cancelled: 'Zathetsedwa & Kubwezedwa Ndalama',
    status_pending: 'Zikuyembekezeka',
    status_completed: 'Zamalizidwa',

    // Notifications
    notif_title: 'Zidziwitso',
    notif_subtitle: 'Zosintha zofunika za malonda, mayendedwe & ndalama',
    notif_empty: 'Palibe zidziwitso pakali pano',
    notif_empty_sub: 'Zidziwitso zatsopano zamaoda, mayendedwe, ndi ndalama ziziwonekera pompano pa nthawi yake.',
    notif_mark_all_read: 'Werengani Zonse',
    notif_auto_delete_banner: 'Chidziwitso chilichonse chikawerengedwa, chidzafufutidwa mwaokha pakapita masekondi 30.',
    notif_deleting_in: 'Ifufutidwa mwaokha pakapita',
    notif_delete_now: 'Fufutani kwathunthu tsopano',

    // Realtime & Settings
    realtime_connected: 'Kulumikizidwa ndi PostgreSQL Realtime',
    realtime_connecting: 'Kulumikizana ndi Database...',
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
    common_more: 'Zosankha Zambiri',
  },
};

// Common direct word translation dictionary for dynamic strings
const dynamicWordMap: Record<string, string> = {
  // Commodities
  'White Maize (Grade A)': 'Chimanga Choyera (Giredi A)',
  'White Maize': 'Chimanga Choyera',
  'Soya Beans (Non-GMO)': 'Soya Woyera (Wosapsa ndi Mankhwala)',
  'Soya Beans': 'Soya Woyera',
  'Pure Mchinji Groundnuts (Chalimbana)': 'Mtedza wa Chalimbana ku Mchinji',
  'Groundnuts': 'Mtedza',
  'Kilombero Aromatic Rice': 'Mpunga Wofunkha wa Kilombero',
  'Rice': 'Mpunga',
  'Red Kidney Beans (Sugar Beans)': 'Nyemba za Sugar Beans',
  'Sugar Beans': 'Nyemba za Sugar Beans',
  'Dark Fire-Cured Tobacco': 'Fodya Wakuda Wofukiza',
  'Tobacco': 'Fodya',
  'Sunflower Seed': 'Mbewu za Mpendadzuwa',
  'Cassava': 'Chinangwa',
  'Sweet Potatoes': 'Mbatata Zofiira',
  'Irish Potatoes': 'Mbatata za Chilungu',
  // Quality
  'Grade A - Premium Dry (Moisture <13%)': 'Giredi A - Youma Bwino (Chinyezi <13%)',
  'Grade A - Premium Cleaned': 'Giredi A - Yoeretsedwa Kwambiri',
  'Grade A - Jumbo Confectionery': 'Giredi A - Nthanga Zaikulu za Chalimbana',
  'Grade A - First Milling Aromatic': 'Giredi A - Mpunga Wabwino Kwambiri Wofunkha',
  'Grade A - Premium Uniform': 'Giredi A - Nyemba Zapamwamba Zosasakanizika',
  'Grade 1 - Heavy Bodied Wrap': 'Giredi 1 - Fodya Wolimba Wabwino',
  // Categories
  'Grains & Cereals': 'Grains & Cereals (Monga Chimanga, Mpunga)',
  'Legumes & Pulses': 'Legumes & Pulses (Soya, Sugar Beans, Nyemba)',
  'Oilseeds & Nuts': 'Oilseeds & Nuts (Mtedza, Mpendadzuwa)',
  'Roots & Tubers': 'Roots & Tubers (Chinangwa, Mbatata)',
  'Commercial Crops': 'Commercial Crops (Fodya, Tiyi, Khofi)',
  // Units
  'kg': 'kg',
  'bags': 'matumba',
  'metric tonnes': 'matani',
  // Statuses
  'available': 'Zilipo m\'Nkhokwe',
  'sold_out': 'Zatha Zonse',
  'pending': 'Zikudikira',
  'in_transit': 'Katundu Ali pa Ulendo',
  'completed': 'Zamalizidwa Bwino',
  'cancelled': 'Zathetsedwa',
  'escrow_held': 'Ndalama Zili mu Escrow',
  'paid': 'Zalipidwa',
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
    // If Chichewa is selected:
    if (language === 'ch') {
      const chDict = translations.ch;
      if (chDict[key]) return chDict[key];

      // Check dynamic word map
      if (dynamicWordMap[key]) return dynamicWordMap[key];
      if (fallback && dynamicWordMap[fallback]) return dynamicWordMap[fallback];

      // If fallback matches an English key, look up its Chichewa counterpart
      const enDict = translations.en;
      for (const [k, v] of Object.entries(enDict)) {
        if (v === key || v === fallback) {
          if (chDict[k]) return chDict[k];
        }
      }
    }

    // Default to English dictionary
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
