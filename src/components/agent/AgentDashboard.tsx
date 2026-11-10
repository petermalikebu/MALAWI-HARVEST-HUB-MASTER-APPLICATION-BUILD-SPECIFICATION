import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  OfflineFarmer,
  Commodity,
  Order,
  SmsNotification,
  MALAWI_DISTRICTS,
  COMMODITY_UNITS,
  getDistrictRegion,
  Category,
  MarketPrice,
} from '../../types/index.ts';
import { safeParseJson, safeParseResponse } from '../../lib/api.ts';
import { compressImageFile } from '../../lib/imageCompressor.ts';
import { UssdKeypadSimulator } from './UssdKeypadSimulator.tsx';
import { SMSActivityLog, createDeviceSmsUri } from './SMSActivityLog.tsx';
import {
  Users,
  Plus,
  Package,
  Truck,
  MessageSquare,
  Smartphone,
  Phone,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  Calendar,
  X,
  RefreshCw,
  Scale,
  Award,
  ShieldCheck,
  Coins,
  Send,
  Eye,
  Camera,
  Layers,
  Filter,
  Check,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext.tsx';

interface AgentDashboardProps {
  categoriesList?: Category[];
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ categoriesList = [] }) => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();
  const { language, t } = useLanguage();
  const { openChat } = useChat();

  // Active Workspace District (defaults to Agent's assigned district or Zomba)
  const [activeDistrict, setActiveDistrict] = useState<string>(
    currentUser?.assignedDistrict || currentUser?.district || 'Zomba'
  );

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<'farmers' | 'listings' | 'orders' | 'sms_log' | 'colleagues' | 'earnings'>('farmers');

  // Workspace Data State
  const [loading, setLoading] = useState(true);
  const [districtAgents, setDistrictAgents] = useState<any[]>([]);
  const [districtFarmers, setDistrictFarmers] = useState<OfflineFarmer[]>([]);
  const [districtCommodities, setDistrictCommodities] = useState<Commodity[]>([]);
  const [districtOrders, setDistrictOrders] = useState<Order[]>([]);
  const [districtSmsLogs, setDistrictSmsLogs] = useState<SmsNotification[]>([]);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);

  // Feedback Notification Banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    actionLink?: string;
    actionLabel?: string;
  } | null>(null);

  // Search & Filter
  const [farmerSearch, setFarmerSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');

  // Modal 1: Register Farmer Without Smartphone
  const [showRegisterFarmerModal, setShowRegisterFarmerModal] = useState(false);
  const [farmerFullName, setFarmerFullName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('+265 ');
  const [farmerAltPhone, setFarmerAltPhone] = useState('');
  const [farmerTA, setFarmerTA] = useState('T/A Mwambo');
  const [farmerVillage, setFarmerVillage] = useState('Songani');
  const [farmerLanguage, setFarmerLanguage] = useState<'ch' | 'en'>('ch');
  const [farmerConsent, setFarmerConsent] = useState(true);
  const [farmerNotes, setFarmerNotes] = useState('');
  const [registeringFarmer, setRegisteringFarmer] = useState(false);
  const [registerFarmerError, setRegisterFarmerError] = useState<string | null>(null);

  // Modal 2: Add Produce for Offline Farmer
  const [showAddProduceModal, setShowAddProduceModal] = useState(false);
  const [selectedFarmerForProduce, setSelectedFarmerForProduce] = useState<OfflineFarmer | null>(null);
  const [produceCommodityName, setProduceCommodityName] = useState('Kilombero Aromatic Rice');
  const [produceCategory, setProduceCategory] = useState('Grains & Cereals');
  const [produceQuantity, setProduceQuantity] = useState<number>(50);
  const [produceUnit, setProduceUnit] = useState<string>('50kg bag');
  const [producePrice, setProducePrice] = useState<number>(1800);
  const [produceQuality, setProduceQuality] = useState('Grade A - Premium');
  const [produceDate, setProduceDate] = useState(new Date().toISOString().split('T')[0]);
  const [produceLocation, setProduceLocation] = useState('');
  const [produceDescription, setProduceDescription] = useState('');
  const [produceImage, setProduceImage] = useState<string | null>(null);
  const [submittingProduce, setSubmittingProduce] = useState(false);
  const [addProduceError, setAddProduceError] = useState<string | null>(null);

  // Modal 3: Transporter Coordination for Purchased Produce
  const [coordinatingOrder, setCoordinatingOrder] = useState<Order | null>(null);
  const [availableTransporters, setAvailableTransporters] = useState<any[]>([]);
  const [selectedTransporter, setSelectedTransporter] = useState<any | null>(null);
  const [transportQuotedFee, setTransportQuotedFee] = useState<number>(45000);
  const [transportPickupDate, setTransportPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [coordinatingTransport, setCoordinatingTransport] = useState(false);

  // Modal 4: USSD Keypad Phone Simulator
  const [showUssdSimulator, setShowUssdSimulator] = useState(false);
  const [simulatorPhone, setSimulatorPhone] = useState('+265 993 210 302');
  const [simulatorName, setSimulatorName] = useState('Joyce Gondwe (Zomba)');

  // Modal 5: PIN Verification Check
  const [pinCheckFarmer, setPinCheckFarmer] = useState<OfflineFarmer | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinVerificationResult, setPinVerificationResult] = useState<string | null>(null);

  // Modal 6: Commodity Removal Confirmation
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [commodityToDelete, setCommodityToDelete] = useState<Commodity | null>(null);
  const [deleteReason, setDeleteReason] = useState('Stock sold out or withdrawn by farmer');
  const [deletingCommodity, setDeletingCommodity] = useState(false);
  const [expandedFarmerId, setExpandedFarmerId] = useState<string | null>(null);

  // Fetch Workspace Data
  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agent/workspace?district=${encodeURIComponent(activeDistrict)}`);
      if (res.ok) {
        const data = await safeParseJson(res, null);
        if (data) {
          setDistrictAgents(data.agents || []);
          setDistrictFarmers(data.farmers || []);
          setDistrictCommodities(data.commodities || []);
          setDistrictOrders(data.orders || []);
          setDistrictSmsLogs(data.smsLogs || []);
        }
      }

      // Also fetch market benchmark prices for this district
      const priceRes = await fetch(`/api/market-prices?district=${encodeURIComponent(activeDistrict)}`);
      if (priceRes.ok) {
        const prices = await safeParseJson(priceRes, []);
        setMarketPrices(prices);
      }
    } catch (err) {
      console.error('Failed to load agent workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [activeDistrict]);

  // Realtime listeners
  useEffect(() => {
    const unsubFarmer = subscribe('OFFLINE_FARMER_REGISTERED', () => fetchWorkspaceData());
    const unsubComm = subscribe('COMMODITY_CREATED', () => fetchWorkspaceData());
    const unsubSms = subscribe('SMS_DELIVERED', () => fetchWorkspaceData());
    const unsubOrder = subscribe('order_updated', () => fetchWorkspaceData());
    return () => {
      unsubFarmer();
      unsubComm();
      unsubSms();
      unsubOrder();
    };
  }, [subscribe, activeDistrict]);

  // Handle Register Farmer
  const handleRegisterFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterFarmerError(null);
    if (!farmerFullName.trim() || !farmerPhone.trim() || !farmerTA.trim() || !farmerVillage.trim()) {
      setRegisterFarmerError('Full name, phone number, T/A, and village are required.');
      return;
    }
    if (!farmerConsent) {
      setRegisterFarmerError('You must obtain the farmer\'s informed consent before registering their details.');
      return;
    }

    setRegisteringFarmer(true);
    try {
      const payload = {
        fullName: farmerFullName.trim(),
        phoneNumber: farmerPhone.trim(),
        altPhoneNumber: farmerAltPhone.trim(),
        district: activeDistrict,
        traditionalAuthority: farmerTA.trim(),
        village: farmerVillage.trim(),
        preferredLanguage: farmerLanguage,
        agentUid: currentUser?.uid,
        agentName: currentUser?.fullName || 'District Agent',
        agentPhone: currentUser?.phoneNumber || '+265 888 777 111',
        notes: farmerNotes.trim(),
      };

      const res = await fetch('/api/agent/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setShowRegisterFarmerModal(false);
        const welcomeText = parsed.data?.sms?.messageText || `MBEWALINK: Mwalandiridwa ${farmerFullName}! Nambala yanu ndi ${parsed.data?.farmer?.farmerId}.`;
        const smsUri = createDeviceSmsUri(parsed.data?.farmer?.phoneNumber || farmerPhone, welcomeText);

        setFeedback({
          type: 'success',
          message: `Farmer ${farmerFullName} successfully registered with Mbewalink Farmer ID: ${parsed.data.farmer.farmerId}. Welcome credentials generated.`,
          actionLink: smsUri,
          actionLabel: 'Send via Phone Messages App',
        });
        setTimeout(() => setFeedback(null), 10000);
        // Reset form
        setFarmerFullName('');
        setFarmerPhone('+265 ');
        setFarmerAltPhone('');
        setFarmerNotes('');
        fetchWorkspaceData();
      } else {
        setRegisterFarmerError(parsed.error || 'Failed to register farmer');
      }
    } catch (err: any) {
      setRegisterFarmerError(err.message || 'Error submitting farmer registration');
    } finally {
      setRegisteringFarmer(false);
    }
  };

  // Handle Add Produce
  const handleOpenAddProduce = (farmer?: OfflineFarmer) => {
    if (farmer) {
      setSelectedFarmerForProduce(farmer);
      setProduceLocation(`${farmer.traditionalAuthority}, ${farmer.village}`);
    } else if (districtFarmers.length > 0) {
      setSelectedFarmerForProduce(districtFarmers[0]);
      setProduceLocation(`${districtFarmers[0].traditionalAuthority}, ${districtFarmers[0].village}`);
    }
    setAddProduceError(null);
    setShowAddProduceModal(true);
  };

  const handleProduceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1024, quality: 0.85 });
      setProduceImage(compressed);
    } catch (err) {
      console.warn('Image compression fallback:', err);
    }
  };

  const handleSubmitProduce = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddProduceError(null);
    if (!selectedFarmerForProduce) {
      setAddProduceError('Please select a registered farmer.');
      return;
    }
    if (!produceCommodityName.trim() || !produceQuantity || !producePrice) {
      setAddProduceError('Commodity name, quantity, and unit price are required.');
      return;
    }

    setSubmittingProduce(true);
    try {
      const payload = {
        offlineFarmerId: selectedFarmerForProduce.farmerId,
        commodityName: produceCommodityName.trim(),
        category: produceCategory,
        quantity: produceQuantity,
        unit: produceUnit,
        pricePerUnit: producePrice,
        district: activeDistrict,
        location: produceLocation || `${selectedFarmerForProduce.traditionalAuthority}, ${selectedFarmerForProduce.village}`,
        quality: produceQuality,
        availabilityDate: produceDate,
        description: produceDescription || `Managed by Mbewalink Agent ${currentUser?.fullName} on behalf of ${selectedFarmerForProduce.fullName}.`,
        imageUrl: produceImage,
        agentUid: currentUser?.uid,
        agentName: currentUser?.fullName || 'District Agent',
        agentPhone: currentUser?.phoneNumber,
      };

      const res = await fetch('/api/agent/commodities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setShowAddProduceModal(false);
        const listText = parsed.data?.sms?.messageText || `MBEWALINK: Zikomo ${selectedFarmerForProduce.fullName}. Mbewu zanu: ${produceQuantity} ${produceUnit} a ${produceCommodityName} zalembedwa pa msika wa Mbewalink pa mtengo wa MWK ${producePrice}/${produceUnit}.`;
        const smsUri = createDeviceSmsUri(selectedFarmerForProduce.phoneNumber, listText);

        setFeedback({
          type: 'success',
          message: `Produce for ${selectedFarmerForProduce.fullName} (${produceQuantity} ${produceUnit} of ${produceCommodityName}) is now live on the marketplace! Notification generated.`,
          actionLink: smsUri,
          actionLabel: 'Send via Phone Messages App',
        });
        setTimeout(() => setFeedback(null), 10000);
        setProduceImage(null);
        fetchWorkspaceData();
      } else {
        setAddProduceError(parsed.error || 'Failed to publish produce');
      }
    } catch (err: any) {
      setAddProduceError(err.message || 'Error listing produce');
    } finally {
      setSubmittingProduce(false);
    }
  };

  // Handle Commodity Removal
  const handleInitiateRemove = (commodity: Commodity) => {
    setCommodityToDelete(commodity);
    setDeleteReason('Stock sold out or withdrawn by farmer');
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!commodityToDelete) return;
    setDeletingCommodity(true);
    try {
      const res = await fetch(
        `/api/commodities/${commodityToDelete.id}?userUid=${encodeURIComponent(currentUser?.uid || '')}&reason=${encodeURIComponent(deleteReason)}`,
        { method: 'DELETE' }
      );
      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setShowDeleteConfirmModal(false);
        setFeedback({
          type: 'success',
          message: `Product "${commodityToDelete.commodityName}" was removed from the database and marketplace successfully.`,
        });
        setTimeout(() => setFeedback(null), 8000);
        setCommodityToDelete(null);
        fetchWorkspaceData();
      } else {
        alert(parsed.error || 'Failed to remove commodity');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting commodity');
    } finally {
      setDeletingCommodity(false);
    }
  };

  // Handle Transporter Coordination
  const handleOpenCoordinateTransport = async (order: Order) => {
    setCoordinatingOrder(order);
    try {
      // Find transporters active in this district or route
      const res = await fetch('/api/transporters');
      if (res.ok) {
        const data = await safeParseJson(res, []);
        const matched = data.filter(
          (t: any) =>
            t.district?.toLowerCase() === activeDistrict.toLowerCase() ||
            t.currentRoute?.toLowerCase().includes(activeDistrict.toLowerCase())
        );
        setAvailableTransporters(matched.length > 0 ? matched : data.slice(0, 5));
        if (matched.length > 0) setSelectedTransporter(matched[0]);
      }
    } catch (err) {
      console.error('Failed to load transporters:', err);
    }
  };

  const handleConfirmTransportArrangement = async () => {
    if (!coordinatingOrder || !selectedTransporter) return;
    setCoordinatingTransport(true);
    try {
      const res = await fetch(`/api/orders/${coordinatingOrder.id}/coordinate-transport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transporterUid: selectedTransporter.uid,
          transporterName: selectedTransporter.fullName,
          transporterPhone: selectedTransporter.phoneNumber,
          vehicleRegistration: selectedTransporter.vehicleRegistration || selectedTransporter.plateNumber || 'BW 4920',
          quotedPrice: transportQuotedFee,
          pickupDate: transportPickupDate,
          agentUid: currentUser?.uid,
          agentName: currentUser?.fullName,
        }),
      });

      if (res.ok) {
        setCoordinatingOrder(null);
        setFeedback({
          type: 'success',
          message: `Transport coordinated with ${selectedTransporter.fullName}. Driver dispatched and farmer notified via SMS!`,
        });
        setTimeout(() => setFeedback(null), 5000);
        fetchWorkspaceData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to coordinate transport');
    } finally {
      setCoordinatingTransport(false);
    }
  };

  // Launch USSD Simulator with specific farmer's number
  const handleLaunchUssdForFarmer = (farmer: OfflineFarmer) => {
    setSimulatorPhone(farmer.phoneNumber);
    setSimulatorName(`${farmer.fullName} (${farmer.district})`);
    setShowUssdSimulator(true);
  };

  // Benchmark Price Matcher
  const benchmarkMatch = marketPrices.find(
    (p) =>
      p.commodityName.toLowerCase().includes(produceCommodityName.toLowerCase()) ||
      produceCommodityName.toLowerCase().includes(p.commodityName.toLowerCase())
  );

  // Filtered Farmers
  const filteredFarmers = districtFarmers.filter((f) => {
    if (!farmerSearch.trim()) return true;
    const q = farmerSearch.toLowerCase();
    return (
      f.fullName.toLowerCase().includes(q) ||
      f.farmerId.toLowerCase().includes(q) ||
      f.phoneNumber.includes(q) ||
      f.traditionalAuthority.toLowerCase().includes(q) ||
      f.village.toLowerCase().includes(q)
    );
  });

  // Filtered Listings
  const filteredCommodities = districtCommodities.filter((c) => {
    if (!listingSearch.trim()) return true;
    const q = listingSearch.toLowerCase();
    return (
      c.commodityName.toLowerCase().includes(q) ||
      c.farmerName.toLowerCase().includes(q) ||
      (c.offlineFarmerId || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q)
    );
  });

  // Calculate Agent Earnings from Completed Orders
  const completedOrders = districtOrders.filter((o) => o.status === 'completed');
  const totalSalesMwk = completedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const agentIncentiveMwk = Math.round(totalSalesMwk * (currentUser?.agentIncentiveRate || 0.01));

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 sm:px-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 border shadow-md ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="leading-snug">{feedback.message}</span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            {feedback.actionLink && (
              <a
                href={feedback.actionLink}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
                <span>{feedback.actionLabel || 'Send via Phone Messages App'}</span>
              </a>
            )}
            <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Bar with District Workspace Information */}
      <div className="bg-gradient-to-r from-emerald-950 via-green-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <Users className="w-3.5 h-3.5" />
              <span>District Agricultural Agent Network &bull; Digital Inclusion</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {activeDistrict} District Agent Workspace
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Empowering farmers without smartphones or internet connectivity across {activeDistrict} District ({getDistrictRegion(activeDistrict)} Region). Register offline farmers, publish produce to the marketplace, coordinate transport, and dispatch automated personalized SMS notifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* District Workspace Switcher */}
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-3 py-2 rounded-2xl border border-white/10 text-xs">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <select
                value={activeDistrict}
                onChange={(e) => setActiveDistrict(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                {MALAWI_DISTRICTS.map((d) => (
                  <option key={d} value={d} className="bg-stone-900 text-white">
                    {d} District
                  </option>
                ))}
              </select>
            </div>

            {/* Launch USSD Simulator Button */}
            <button
              onClick={() => setShowUssdSimulator(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-md flex items-center gap-2 transition-all active:scale-95"
              title="Test Keypad Phone USSD (*265#)"
            >
              <Smartphone className="w-4 h-4" />
              <span>Keypad Phone USSD</span>
            </button>

            {/* Register Farmer Quick Action */}
            <button
              onClick={() => setShowRegisterFarmerModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-xs shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Register Offline Farmer</span>
            </button>
          </div>
        </div>

        {/* Workspace Statistical Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-emerald-800/60 text-xs">
          <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">Active District Agents</div>
            <div className="text-2xl font-black text-white mt-1">{districtAgents.length}</div>
            <div className="text-[10px] text-stone-300">Shared {activeDistrict} workspace</div>
          </div>
          <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">Registered Offline Farmers</div>
            <div className="text-2xl font-black text-white mt-1">{districtFarmers.length}</div>
            <div className="text-[10px] text-stone-300">Keypad phones / SMS active</div>
          </div>
          <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">Managed Market Listings</div>
            <div className="text-2xl font-black text-white mt-1">{districtCommodities.length}</div>
            <div className="text-[10px] text-stone-300">Live on Mbewalink</div>
          </div>
          <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">Total Farmer Sales</div>
            <div className="text-xl font-black text-white mt-1">MWK {totalSalesMwk.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-300 font-bold">{completedOrders.length} completed transactions</div>
          </div>
        </div>
      </div>

      {/* Colleague Agents Strip: Shows fellow agents coordinating in this district */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-700" />
          <span className="font-bold text-stone-900">
            {activeDistrict} Shared Agent Team ({districtAgents.length}):
          </span>
          <span className="text-stone-500">
            All agents in {activeDistrict} share farmer records, orders, and logistics coordination.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {districtAgents.map((ag) => (
            <div
              key={ag.uid}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{ag.fullName}</span>
              <span className="text-[10px] text-stone-400 font-mono">({ag.agentCode || 'AGT'})</span>
              {ag.phoneNumber && (
                <a href={`tel:${ag.phoneNumber}`} className="text-emerald-700 hover:underline text-[10px] ml-1">
                  {ag.phoneNumber}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab('farmers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition-all shrink-0 ${
            activeTab === 'farmers'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Offline Farmers ({districtFarmers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition-all shrink-0 ${
            activeTab === 'listings'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Managed Produce Listings ({districtCommodities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition-all shrink-0 ${
            activeTab === 'orders'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Orders & Transport ({districtOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sms_log')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition-all shrink-0 ${
            activeTab === 'sms_log'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>SMS Dispatch Log ({districtSmsLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('earnings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition-all shrink-0 ${
            activeTab === 'earnings'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Agent Incentives (MWK {agentIncentiveMwk.toLocaleString()})</span>
        </button>
      </div>

      {/* TAB 1: REGISTERED OFFLINE FARMERS */}
      {activeTab === 'farmers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search farmers by name, Farmer ID, phone, T/A, or village..."
                value={farmerSearch}
                onChange={(e) => setFarmerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRegisterFarmerModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Register Farmer</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-xs text-stone-500">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
              Loading {activeDistrict} offline farmers...
            </div>
          ) : filteredFarmers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-stone-900 text-sm">No offline farmers found in {activeDistrict}</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Farmers who rely on basic keypad phones can be registered here by any authorized district agent.
              </p>
              <button
                onClick={() => setShowRegisterFarmerModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
              >
                Register First Farmer
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFarmers.map((f) => (
                <div
                  key={f.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4.5 hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          {f.farmerId}
                        </span>
                        <h3 className="text-base font-bold text-stone-900 mt-1">{f.fullName}</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {f.preferredLanguage === 'ch' ? 'Chichewa' : 'English'}
                      </span>
                    </div>

                    {/* Phone & Location */}
                    <div className="mt-2.5 space-y-1 text-xs text-stone-600">
                      <div className="flex items-center gap-1.5 font-mono text-emerald-800 font-bold">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{f.phoneNumber}</span>
                        {f.altPhoneNumber && <span className="text-stone-400 font-normal">/ {f.altPhoneNumber}</span>}
                      </div>

                      <div className="flex items-center gap-1.5 text-stone-600">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>
                          {f.traditionalAuthority}, Village {f.village} ({f.district})
                        </span>
                      </div>
                    </div>

                    {/* Registered Agent & Verification PIN */}
                    <div className="mt-3 p-2.5 rounded-xl bg-stone-50 border border-stone-150 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-stone-500">
                        <span>Registered By:</span>
                        <span className="font-semibold text-stone-800">{f.registeredByAgentName}</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-500">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Farmer PIN:
                        </span>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 rounded">
                          {f.verificationPin || '1234'}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {f.notes && <p className="mt-2 text-[11px] text-stone-500 line-clamp-2">{f.notes}</p>}
                  </div>

                    {/* Actions Bar */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenAddProduce(f)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all flex-1 justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>List Produce</span>
                      </button>

                      <button
                        onClick={() => setExpandedFarmerId(expandedFarmerId === f.farmerId ? null : f.farmerId)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1 ${
                          expandedFarmerId === f.farmerId
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                        title="View active produce for this farmer"
                      >
                        <span>Produce</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedFarmerId === f.farmerId ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleLaunchUssdForFarmer(f)}
                        className="p-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                        title="Test USSD (*265#) as this farmer"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Expandable Produce Drawer for this farmer */}
                    {expandedFarmerId === f.farmerId && (
                      <div className="mt-3 pt-3 border-t border-dashed border-stone-200 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                          <span>Active Produce in Database</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
                            {districtCommodities.filter((c) => c.offlineFarmerId === f.farmerId).length} listed
                          </span>
                        </div>

                        {districtCommodities.filter((c) => c.offlineFarmerId === f.farmerId).length === 0 ? (
                          <div className="p-3 bg-stone-50 rounded-xl text-center text-[11px] text-stone-500">
                            No active produce listed for this farmer yet.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {districtCommodities
                              .filter((c) => c.offlineFarmerId === f.farmerId)
                              .map((c) => (
                                <div
                                  key={c.id}
                                  className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <div className="font-bold text-stone-900">{c.commodityName}</div>
                                    <div className="text-[10px] text-stone-500">
                                      {c.quantity} {c.unit} • MWK {Number(c.pricePerUnit).toLocaleString()}/{c.unit}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleInitiateRemove(c)}
                                    className="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors"
                                    title="Remove this produce from database & marketplace"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAGED PRODUCE LISTINGS */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search produce listings by crop name, farmer, or location..."
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
              />
            </div>

            <button
              onClick={() => handleOpenAddProduce()}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>List New Commodity</span>
            </button>
          </div>

          {filteredCommodities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-stone-400 mx-auto" />
              <h3 className="font-bold text-stone-900 text-sm">No agent-managed produce listings in {activeDistrict}</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Register produce for keypad farmers so buyers across Malawi can purchase their stock directly through Mbewalink.
              </p>
              <button
                onClick={() => handleOpenAddProduce()}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
              >
                List First Commodity
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCommodities.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          {c.category}
                        </span>
                        <h3 className="text-base font-bold text-stone-900 mt-0.5">{c.commodityName}</h3>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'reserved'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Quantity & Unit Price */}
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-150 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-stone-400 font-semibold uppercase">Quantity Available</div>
                        <div className="text-sm font-black text-stone-900">
                          {c.quantity.toLocaleString()} {c.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-stone-400 font-semibold uppercase">Asking Price</div>
                        <div className="text-sm font-black text-emerald-800">
                          MWK {Number(c.pricePerUnit).toLocaleString()}
                          <span className="text-[10px] text-stone-500 font-normal">/{c.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Farmer Attribution */}
                    <div className="space-y-1 text-xs text-stone-600">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Farmer: {c.farmerName}</span>
                        {c.offlineFarmerId && (
                          <span className="text-[10px] font-mono font-normal text-emerald-700 bg-emerald-50 px-1 rounded">
                            {c.offlineFarmerId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{c.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Agent attribution & status & Removal button */}
                  <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span>Agent: {c.agentName || 'Mbewalink Team'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-emerald-700">Marketplace Active</span>
                      <button
                        onClick={() => handleInitiateRemove(c)}
                        className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        title="Remove produce listing from database and marketplace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DISTRICT ORDERS & TRANSPORT COORDINATION */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 text-xs text-stone-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-stone-900">Assisting Farmers with Logistics & Transporters:</span>
              <span>When offline farmers receive orders, agents coordinate verified transporters on their behalf.</span>
            </div>
          </div>

          {districtOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center space-y-2">
              <Truck className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-bold text-stone-800 text-sm">No pending orders in {activeDistrict}</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Orders placed by buyers for {activeDistrict} farmers will appear here for transport coordination.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {districtOrders.map((o) => (
                <div
                  key={o.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4.5 shadow-xs hover:shadow-md transition-shadow space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-stone-900">{o.orderNumber}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            o.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.status === 'accepted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        {o.commodityName} &bull; {o.quantity} {o.unit}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-stone-400 uppercase font-semibold">Total Escrow Value</div>
                      <div className="text-base font-black text-emerald-800">
                        MWK {Number(o.totalAmount).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-600">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-semibold">Offline Farmer</span>
                      <span className="font-bold text-stone-900">{o.farmerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-semibold">Buyer</span>
                      <span className="font-bold text-stone-900">{o.buyerName}</span>
                      <span className="text-[11px] text-stone-500 block">{o.deliveryLocation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-semibold">Net Farmer Payout</span>
                      <span className="font-bold text-emerald-700">
                        MWK {Number(o.commoditySubtotal).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Transport Coordination Action */}
                  <div className="pt-2 flex items-center justify-between border-t border-stone-100 text-xs">
                    <span className="text-stone-500 text-[11px]">
                      Buyer Escrow Paid &bull; Requires Driver Dispatch
                    </span>
                    <button
                      onClick={() => handleOpenCoordinateTransport(o)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Coordinate Transporter</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUTOMATED PERSONALIZED SMS LOG (SMSActivityLog Sub-Component) */}
      {activeTab === 'sms_log' && (
        <SMSActivityLog
          district={activeDistrict}
          smsLogs={districtSmsLogs}
          farmers={districtFarmers}
          onRefreshLogs={fetchWorkspaceData}
          onOpenKeypadSimulator={() => setShowUssdSimulator(true)}
        />
      )}

      {/* TAB 5: AGENT INCENTIVES & EARNINGS */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-900 to-green-950 rounded-3xl p-6 text-white space-y-4 shadow-md border border-emerald-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                  Agent Incentive & Remuneration Transparency
                </span>
                <h3 className="text-xl sm:text-2xl font-black mt-1">
                  MWK {agentIncentiveMwk.toLocaleString()}
                </h3>
                <p className="text-xs text-stone-300 mt-1">
                  Commission earned at 1.0% service rate for successfully assisted and completed transactions in {activeDistrict}.
                </p>
              </div>

              <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-center shrink-0">
                <span className="text-[10px] text-stone-300 block">Completed Sales</span>
                <span className="text-lg font-black text-white">{completedOrders.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3 text-xs">
            <h4 className="font-bold text-stone-900 text-sm">Agent Remuneration Policy (Mbewalink Fair Trade)</h4>
            <p className="text-stone-600 leading-relaxed">
              Mbewalink agents receive a transparent service incentive paid from the platform operations fee for onboarding rural farmers, verifying grain conditions, and coordinating logistics. There are <strong>zero secret deductions</strong> from farmers' payments; all proceeds are recorded and verifiable via SMS receipts.
            </p>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTER OFFLINE FARMER */}
      {showRegisterFarmerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Register Offline Farmer</h3>
                  <p className="text-[11px] text-stone-500">
                    District: <strong>{activeDistrict}</strong> &bull; Generates Mbewalink Farmer ID &amp; Welcome SMS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterFarmerModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {registerFarmerError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{registerFarmerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterFarmer} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-bold mb-1">Farmer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Joyce Gondwe"
                  value={farmerFullName}
                  onChange={(e) => setFarmerFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Mobile Phone Number * (Keypad Phone)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+265 999 123 456"
                    value={farmerPhone}
                    onChange={(e) => setFarmerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Alternative Contact Phone</label>
                  <input
                    type="text"
                    placeholder="Optional secondary number"
                    value={farmerAltPhone}
                    onChange={(e) => setFarmerAltPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Traditional Authority (T/A) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. T/A Mwambo"
                    value={farmerTA}
                    onChange={(e) => setFarmerTA(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Village Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Songani Village"
                    value={farmerVillage}
                    onChange={(e) => setFarmerVillage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Preferred SMS Language</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFarmerLanguage('ch')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      farmerLanguage === 'ch'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    Chichewa (National)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFarmerLanguage('en')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      farmerLanguage === 'en'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Farmer Agricultural Profile &amp; Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Produces 80 bags of Kilombero rice; harvested in May."
                  value={farmerNotes}
                  onChange={(e) => setFarmerNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              {/* Informed Consent Checkbox */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="farmerConsentCheckbox"
                  checked={farmerConsent}
                  onChange={(e) => setFarmerConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="farmerConsentCheckbox" className="text-[11px] text-stone-600 leading-snug">
                  I confirm that I have explained Mbewalink terms and received the farmer's permission to register their agricultural information and send automated transaction SMS notifications.
                </label>
              </div>

              <div className="pt-3 border-t border-stone-150 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterFarmerModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registeringFarmer}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {registeringFarmer ? 'Registering...' : 'Register & Dispatch SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PRODUCE FOR OFFLINE FARMER */}
      {showAddProduceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">List Produce on Behalf of Farmer</h3>
                  <p className="text-[11px] text-stone-500">
                    Will appear live on Mbewalink marketplace &bull; Dispatches SMS to farmer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddProduceModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addProduceError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{addProduceError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitProduce} className="space-y-4 text-xs">
              {/* Select Farmer */}
              <div>
                <label className="block text-stone-700 font-bold mb-1">Select Registered Farmer *</label>
                <select
                  value={selectedFarmerForProduce?.farmerId || ''}
                  onChange={(e) => {
                    const match = districtFarmers.find((f) => f.farmerId === e.target.value);
                    if (match) {
                      setSelectedFarmerForProduce(match);
                      setProduceLocation(`${match.traditionalAuthority}, ${match.village}`);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-semibold text-stone-800"
                >
                  {districtFarmers.map((f) => (
                    <option key={f.id} value={f.farmerId}>
                      {f.fullName} ({f.farmerId}) &bull; {f.traditionalAuthority}, {f.village}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commodity Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Commodity Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kilombero Aromatic Rice"
                    value={produceCommodityName}
                    onChange={(e) => setProduceCommodityName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Category</label>
                  <select
                    value={produceCategory}
                    onChange={(e) => setProduceCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  >
                    <option value="Grains & Cereals">Grains & Cereals</option>
                    <option value="Legumes & Pulses">Legumes & Pulses</option>
                    <option value="Oilseeds & Nuts">Oilseeds & Nuts</option>
                    <option value="Roots & Tubers">Roots & Tubers</option>
                    <option value="Horticulture & Vegetables">Horticulture & Vegetables</option>
                  </select>
                </div>
              </div>

              {/* Quantity, Unit & Asking Price */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Available Quantity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={produceQuantity}
                      onChange={(e) => setProduceQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Unit *</label>
                    <select
                      value={produceUnit}
                      onChange={(e) => setProduceUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-bold text-emerald-800"
                    >
                      {COMMODITY_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Proposed Price (MWK) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={producePrice}
                      onChange={(e) => setProducePrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-bold text-emerald-800"
                    />
                  </div>
                </div>

                {/* Benchmark Comparison Tool */}
                {benchmarkMatch ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] flex items-center justify-between">
                    <span className="text-emerald-900">
                      Standard {activeDistrict} Benchmark: <strong>MWK {Number(benchmarkMatch.priceAvg).toLocaleString()} /{benchmarkMatch.unit}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setProducePrice(Number(benchmarkMatch.priceAvg))}
                      className="text-emerald-800 underline font-bold"
                    >
                      Apply Benchmark
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-stone-400">
                    Total Estimated Value: MWK {(produceQuantity * producePrice).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-stone-700 font-bold mb-1">Produce Photograph (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 cursor-pointer font-semibold flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>Upload Produce Photo</span>
                    <input type="file" accept="image/*" onChange={handleProduceImageUpload} className="hidden" />
                  </label>
                  {produceImage && <span className="text-emerald-700 font-semibold text-[11px]">Photo attached</span>}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-150 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProduceModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProduce}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {submittingProduce ? 'Publishing...' : 'Publish Produce to Market'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: COORDINATE TRANSPORTER FOR ORDER */}
      {coordinatingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Arrange Transporter for Farmer</h3>
                  <p className="text-[11px] text-stone-500">Order #{coordinatingOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setCoordinatingOrder(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1">
              <div>
                <strong>Produce:</strong> {coordinatingOrder.quantity} {coordinatingOrder.unit} {coordinatingOrder.commodityName}
              </div>
              <div>
                <strong>Farmer:</strong> {coordinatingOrder.farmerName} ({activeDistrict})
              </div>
              <div>
                <strong>Buyer Delivery:</strong> {coordinatingOrder.deliveryLocation}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-stone-700 font-bold">Select Available District Transporter</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableTransporters.map((tr) => (
                  <div
                    key={tr.uid}
                    onClick={() => setSelectedTransporter(tr)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedTransporter?.uid === tr.uid
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{tr.fullName}</div>
                      <div className="text-[11px] text-stone-500">
                        {tr.vehicleType || '5-Ton Truck'} &bull; {tr.plateNumber || 'BW 4920'}
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      {tr.phoneNumber || '+265 999 ...'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Agreed Transport Fee (MWK)</label>
                  <input
                    type="number"
                    value={transportQuotedFee}
                    onChange={(e) => setTransportQuotedFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Pickup Date</label>
                  <input
                    type="date"
                    value={transportPickupDate}
                    onChange={(e) => setTransportPickupDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-150 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCoordinatingOrder(null)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={coordinatingTransport || !selectedTransporter}
                onClick={handleConfirmTransportArrangement}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs disabled:opacity-50"
              >
                {coordinatingTransport ? 'Dispatching...' : 'Confirm Transport & Send SMS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: REMOVE COMMODITY CONFIRMATION */}
      {showDeleteConfirmModal && commodityToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="p-1 rounded-xl text-stone-400 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-stone-900">
                Remove Produce from Database & Marketplace?
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                You are about to remove <strong>{commodityToDelete.commodityName}</strong> ({commodityToDelete.quantity} {commodityToDelete.unit}) listed for farmer <strong>{commodityToDelete.farmerName}</strong>.
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl text-xs space-y-1.5 border border-stone-200">
              <div className="flex justify-between text-stone-600">
                <span>Commodity ID:</span>
                <span className="font-mono font-bold text-stone-900">CMD-{commodityToDelete.id}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Farmer ID:</span>
                <span className="font-mono font-bold text-emerald-800">{commodityToDelete.offlineFarmerId || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Asking Price:</span>
                <span className="font-bold text-stone-900">MWK {Number(commodityToDelete.pricePerUnit).toLocaleString()}/{commodityToDelete.unit}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Reason for Removal:
              </label>
              <select
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Stock sold out or withdrawn by farmer">Stock sold out or withdrawn by farmer</option>
                <option value="Quality grading failure or moisture exceeded">Quality grading failure or moisture exceeded</option>
                <option value="Duplicate listing or incorrect quantity entered">Duplicate listing or incorrect quantity entered</option>
                <option value="Offline private farmgate purchase completed">Offline private farmgate purchase completed</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingCommodity}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingCommodity ? (
                  <span>Removing from Database...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Removal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: USSD KEYPAD PHONE SIMULATOR */}
      <UssdKeypadSimulator
        isOpen={showUssdSimulator}
        onClose={() => setShowUssdSimulator(false)}
        defaultPhone={simulatorPhone}
        defaultFarmerName={simulatorName}
      />
    </div>
  );
};
