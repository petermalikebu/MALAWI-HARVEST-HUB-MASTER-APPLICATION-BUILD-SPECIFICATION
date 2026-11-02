import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import {
  TransportJob,
  User,
  MALAWI_DISTRICTS,
  NORTHERN_DISTRICTS,
  CENTRAL_DISTRICTS,
  SOUTHERN_DISTRICTS,
  getDistrictRegion,
  getRegionColorClass,
} from '../../types/index.ts';
import { safeParseJson, safeParseResponse } from '../../lib/api.ts';
import {
  Truck,
  ShieldCheck,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Coins,
  Phone,
  RefreshCw,
  Plus,
  ArrowRight,
  Info,
  Sparkles,
  DollarSign,
  Send,
  Navigation,
  Gauge,
  Award,
  Package,
  CheckCircle2,
  X,
  CreditCard,
} from 'lucide-react';

interface FarmerTransportHireProps {
  onJobCreated?: () => void;
}

// Distance helper between typical Malawian transport hubs
const ESTIMATED_DISTANCES: Record<string, Record<string, number>> = {
  Lilongwe: {
    Mchinji: 110,
    Dedza: 85,
    Kasungu: 130,
    Dowa: 55,
    Salima: 110,
    Blantyre: 315,
    Mzuzu: 360,
    Zomba: 290,
    Mangochi: 190,
    Ntcheu: 145,
  },
  Mchinji: {
    Lilongwe: 110,
    Kasungu: 145,
    Dedza: 195,
    Blantyre: 425,
  },
  Blantyre: {
    Lilongwe: 315,
    Zomba: 70,
    Mangochi: 195,
    Chikwawa: 50,
    Thyolo: 40,
    Mulanje: 65,
    Dedza: 230,
    Mchinji: 425,
  },
  Kasungu: {
    Lilongwe: 130,
    Mzuzu: 230,
    Mzimba: 170,
    Mchinji: 145,
    Nkhotakota: 120,
  },
};

function getApproxDistanceKm(fromDistrict: string, toDistrict: string): number {
  if (fromDistrict === toDistrict) return 35; // Local district transit
  if (ESTIMATED_DISTANCES[fromDistrict]?.[toDistrict]) {
    return ESTIMATED_DISTANCES[fromDistrict][toDistrict];
  }
  if (ESTIMATED_DISTANCES[toDistrict]?.[fromDistrict]) {
    return ESTIMATED_DISTANCES[toDistrict][fromDistrict];
  }
  return 120; // Default average road distance
}

export const FarmerTransportHire: React.FC<FarmerTransportHireProps> = ({ onJobCreated }) => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [activeSubTab, setActiveSubTab] = useState<'quote_request' | 'my_bookings' | 'drivers'>('quote_request');
  const [transportJobs, setTransportJobs] = useState<TransportJob[]>([]);
  const [transportersList, setTransportersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State for Quote Inquiry
  const [quoteForm, setQuoteForm] = useState({
    commodityName: 'White Maize Grain (Grade 1)',
    quantityKg: 2500,
    pickupLocation: currentUser?.tradingArea || 'Kapiri Trading Centre Depot',
    pickupDistrict: currentUser?.district || 'Mchinji',
    destinationLocation: 'Kanengo Industrial Agro-Depot',
    destinationDistrict: 'Lilongwe',
    distanceKm: 110,
    requiredVehicleType: 'Medium Truck (5-7 Ton)',
    preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    specialRequirements: 'Waterproof tarpaulin required for grain protection against rain',
    requestedDriverId: '',
  });

  // Escrow Funding Modal for Agreed Price
  const [fundingJob, setFundingJob] = useState<TransportJob | null>(null);
  const [escrowPaymentMethod, setEscrowPaymentMethod] = useState('Airtel Money Escrow (+265 999 036 912)');
  const [escrowPaymentRef, setEscrowPaymentRef] = useState(`ESC-${Math.floor(100000 + Math.random() * 900000)}`);
  const [submittingEscrow, setSubmittingEscrow] = useState(false);
  const [escrowError, setEscrowError] = useState('');

  const [platformCommissionRate, setPlatformCommissionRate] = useState<number>(0.04);

  // Auto update estimated distance when districts change
  useEffect(() => {
    const dist = getApproxDistanceKm(quoteForm.pickupDistrict, quoteForm.destinationDistrict);
    setQuoteForm((prev) => ({ ...prev, distanceKm: dist }));
  }, [quoteForm.pickupDistrict, quoteForm.destinationDistrict]);

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [jobsRes, driversRes, setRes] = await Promise.all([
        fetch(`/api/transport/jobs?farmerUid=${currentUser.uid}`),
        fetch('/api/users?role=transporter'),
        fetch('/api/settings'),
      ]);

      if (jobsRes.ok) setTransportJobs(await safeParseJson(jobsRes, []));
      if (driversRes.ok) setTransportersList(await safeParseJson(driversRes, []));
      if (setRes.ok) {
        const settingsList = await safeParseJson<any[]>(setRes, []);
        const cr = settingsList.find((s: any) => s.key === 'commission_rate');
        if (cr && !isNaN(parseFloat(cr.value))) {
          setPlatformCommissionRate(parseFloat(cr.value));
        }
      }
    } catch (err) {
      console.error('Failed to load transport hire data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.uid]);

  useEffect(() => {
    const unsub = subscribe('transport_updated', () => fetchData());
    const unsubReq = subscribe('transport_requested', () => fetchData());
    const unsubAvail = subscribe('transporter_availability_changed', () => fetchData());
    const unsubSetting = subscribe('setting_updated', (data: any) => {
      if (data?.key === 'commission_rate' && !isNaN(parseFloat(data?.value))) {
        setPlatformCommissionRate(parseFloat(data.value));
      }
    });
    return () => {
      unsub();
      unsubReq();
      unsubAvail();
      unsubSetting();
    };
  }, [subscribe]);

  // Submit quote request
  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/transport/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerUid: currentUser.uid,
          farmerName: currentUser.fullName,
          farmerPhone: currentUser.phoneNumber || '+265 888 123 456',
          ...quoteForm,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        const created = parsed.data || {};
        setSuccessMsg(
          `Transport quote request #${created.orderNumber || 'CONFIRMED'} submitted! The driver / available transporters will review your ${quoteForm.distanceKm} km route and reply with their price quote.`
        );
        setActiveSubTab('my_bookings');
        fetchData();
        if (onJobCreated) onJobCreated();
      } else {
        setErrorMsg(parsed.error || 'Failed to submit transport quote request');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Farmer accepts transporter's price quote
  const handleAcceptQuote = async (jobId: number) => {
    try {
      const res = await fetch(`/api/transport/jobs/${jobId}/confirm-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser?.uid,
          userRole: 'farmer',
          action: 'confirm',
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        const targetJob = transportJobs.find((j) => j.id === jobId);
        if (targetJob) {
          setFundingJob(targetJob);
          setEscrowPaymentRef(`ESC-${Math.floor(100000 + Math.random() * 900000)}`);
        }
        fetchData();
      } else {
        alert(parsed.error || 'Failed to confirm price quote');
      }
    } catch (err) {
      console.error('Error confirming quote:', err);
    }
  };

  // Farmer declines transporter's price quote
  const handleDeclineQuote = async (jobId: number) => {
    const reason = prompt('Please specify why this price quote is declined (e.g. Rate too high for distance):');
    if (!reason) return;

    try {
      const res = await fetch(`/api/transport/jobs/${jobId}/confirm-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser?.uid,
          userRole: 'farmer',
          action: 'reject',
          notes: reason,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error declining quote:', err);
    }
  };

  // Farmer deposits escrow payment for confirmed price quote
  const handleDepositEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundingJob || !currentUser) return;

    setSubmittingEscrow(true);
    setEscrowError('');

    try {
      const res = await fetch(`/api/transport/jobs/${fundingJob.id}/deposit-escrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerUid: currentUser.uid,
          paymentMethod: escrowPaymentMethod,
          paymentRef: escrowPaymentRef,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setFundingJob(null);
        fetchData();
        alert('Escrow payment submitted! Financial Administrator Chisomo Mwale has been notified to verify the deposit and authorize driver dispatch.');
      } else {
        setEscrowError(parsed.error || 'Failed to deposit escrow payment');
      }
    } catch (err: any) {
      setEscrowError(err.message || 'Network error');
    } finally {
      setSubmittingEscrow(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-800/60 text-blue-200 border border-blue-700/40">
              <Truck className="w-3.5 h-3.5" />
              <span>Smallholder Farmer Freight &bull; Route-Based Dynamic Pricing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hire Agricultural Transporter &amp; Driver
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Amounts are <strong className="text-amber-300">not fixed upfront</strong>: request a price quote for your road route and distance to be covered.
              The transporter provides their custom quote, you and the administrator confirm the price, and funds are held securely in platform escrow until goods are delivered.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-blue-800/50 hover:bg-blue-800 text-blue-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-blue-800/60">
          <button
            onClick={() => setActiveSubTab('quote_request')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'quote_request'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'bg-blue-800/40 text-blue-100 hover:bg-blue-800/70'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Route Price Quote</span>
          </button>

          <button
            onClick={() => setActiveSubTab('my_bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'my_bookings'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'bg-blue-800/40 text-blue-100 hover:bg-blue-800/70'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My Route Quotes &amp; Bookings ({transportJobs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('drivers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'drivers'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'bg-blue-800/40 text-blue-100 hover:bg-blue-800/70'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Verified Transporters Directory ({transportersList.length})</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 1: REQUEST ROUTE PRICE QUOTE                      */}
      {/* ======================================================== */}
      {activeSubTab === 'quote_request' && (
        <form onSubmit={handleRequestQuote} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Route, Distance & Cargo */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 space-y-5 shadow-xs">
              <div className="border-b border-stone-100 pb-3">
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-700" />
                  <span>Route, Road Corridor &amp; Distance to be Covered</span>
                </h3>
                <p className="text-stone-500 text-xs mt-0.5">
                  Transporters calculate their price per trip and distance based on these road specifics.
                </p>
              </div>

              {/* Route Disticts & Distance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Pickup District *
                  </label>
                  <select
                    value={quoteForm.pickupDistrict}
                    onChange={(e) => setQuoteForm({ ...quoteForm, pickupDistrict: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white font-medium"
                  >
                    <optgroup label="Northern Region">
                      {NORTHERN_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d} (Northern Region)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Central Region">
                      {CENTRAL_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d} (Central Region)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Southern Region">
                      {SOUTHERN_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d} (Southern Region)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Destination District *
                  </label>
                  <select
                    value={quoteForm.destinationDistrict}
                    onChange={(e) => setQuoteForm({ ...quoteForm, destinationDistrict: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white font-medium"
                  >
                    <optgroup label="Northern Region">
                      {NORTHERN_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d} (Northern Region)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Central Region">
                      {CENTRAL_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d} (Central Region)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Southern Region">
                      {SOUTHERN_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d} (Southern Region)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>Distance to Cover (km) *</span>
                    <span className="text-[10px] text-blue-700 font-semibold">Auto-estimated</span>
                  </label>
                  <div className="relative">
                    <Gauge className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      required
                      min="1"
                      value={quoteForm.distanceKm}
                      onChange={(e) => setQuoteForm({ ...quoteForm, distanceKm: Number(e.target.value) })}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 font-bold text-blue-950 focus:outline-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Specific Depots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Specific Pickup Depot / Farm Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteForm.pickupLocation}
                    onChange={(e) => setQuoteForm({ ...quoteForm, pickupLocation: e.target.value })}
                    placeholder="e.g. Kamwendo Cooperative Depot"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Delivery Warehouse / Buyer Dropoff *
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteForm.destinationLocation}
                    onChange={(e) => setQuoteForm({ ...quoteForm, destinationLocation: e.target.value })}
                    placeholder="e.g. Kanengo Industrial Area Warehouse"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                  />
                </div>
              </div>

              {/* Cargo Details */}
              <div className="pt-2 border-t border-stone-100 space-y-4">
                <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-700" />
                  <span>Harvest Cargo &amp; Vehicle Requirements</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Commodity to Transport *
                    </label>
                    <input
                      type="text"
                      required
                      value={quoteForm.commodityName}
                      onChange={(e) => setQuoteForm({ ...quoteForm, commodityName: e.target.value })}
                      placeholder="e.g. White Maize, Soya, Groundnuts"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Total Weight (kg) *
                    </label>
                    <input
                      type="number"
                      required
                      min="100"
                      step="50"
                      value={quoteForm.quantityKg}
                      onChange={(e) => setQuoteForm({ ...quoteForm, quantityKg: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Required Vehicle Size *
                    </label>
                    <select
                      value={quoteForm.requiredVehicleType}
                      onChange={(e) => setQuoteForm({ ...quoteForm, requiredVehicleType: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white"
                    >
                      <option value="Pickup (1-2 Ton)">Pickup (1-2 Ton)</option>
                      <option value="Light Truck (3-5 Ton)">Light Truck (3-5 Ton)</option>
                      <option value="Medium Truck (5-7 Ton)">Medium Truck (5-7 Ton)</option>
                      <option value="Heavy Freight (10-15 Ton)">Heavy Freight (10-15 Ton)</option>
                      <option value="Articulated Trailer (20-30 Ton)">Articulated Trailer (20-30 Ton)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Preferred Transit Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={quoteForm.preferredDate}
                      onChange={(e) => setQuoteForm({ ...quoteForm, preferredDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Select Preferred Available Driver (Optional)
                    </label>
                    <select
                      value={quoteForm.requestedDriverId}
                      onChange={(e) => setQuoteForm({ ...quoteForm, requestedDriverId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white"
                    >
                      <option value="">-- Open to All Available Transporters &amp; Finance Admin --</option>
                      {transportersList.map((driver) => {
                        const isAvail = driver.isAvailable !== false;
                        return (
                          <option key={driver.id} value={driver.id}>
                            {isAvail ? '🟢 Available' : '🟠 In Transit'} &bull; {driver.fullName} &bull;{' '}
                            {driver.vehicleType || 'Truck'} ({driver.plateNumber || driver.vehicleRegistration || 'BW 4921'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Special Cargo Handling or Road Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={quoteForm.specialRequirements}
                    onChange={(e) => setQuoteForm({ ...quoteForm, specialRequirements: e.target.value })}
                    placeholder="e.g. Tarpaulin cover mandatory. Assist with grain offloading at depot."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Right 1 Col: Process Explanation & Submission */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs text-xs">
                <div className="border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>How Quotations Work</span>
                  </div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Safe, negotiated freight pricing for Malawian smallholders.
                  </p>
                </div>

                <div className="space-y-3 text-stone-600 leading-relaxed">
                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      <strong>You request a quote:</strong> You submit the pickup, destination, and distance (~{quoteForm.distanceKm} km).
                    </p>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      <strong>Driver provides custom price:</strong> The driver inputs their rate per trip or per km based on fuel and road terrain.
                    </p>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      <strong>You &amp; Admin Confirm:</strong> You review the driver&apos;s quote and either accept or negotiate. If accepted, you deposit the agreed fee to escrow.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200/80 text-blue-900 space-y-1">
                  <span className="font-bold">No Upfront Payment Required!</span>
                  <p className="text-[11px] text-blue-800">
                    You only pay into escrow after you and the transporter have mutually agreed on the fee.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 text-blue-200" />
                  <span>
                    {submitting ? 'Submitting Inquiry...' : 'Submit Route Inquiry for Quote'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: MY ROUTE QUOTES & BOOKINGS                     */}
      {/* ======================================================== */}
      {activeSubTab === 'my_bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base">
              My Transport Quotations &amp; Transit Bookings ({transportJobs.length})
            </h3>
            <span className="text-xs text-stone-500">
              Review quotes submitted by drivers, confirm prices, and track live haulage
            </span>
          </div>

          {transportJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
              <Truck className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
              <h4 className="font-bold text-stone-900 text-sm">No transport bookings or quotes yet</h4>
              <p className="text-stone-500 text-xs mt-1">
                Click &quot;Request Route Price Quote&quot; to request pricing from vetted transporters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transportJobs.map((job) => {
                const hasQuote = Boolean(job.quotedPrice && Number(job.quotedPrice) > 0);
                const isAgreed = job.status === 'price_agreed' || job.priceStatus === 'agreed';
                const isPendingQuote = job.status === 'quote_requested';
                const isEscrowPending = job.status === 'pending_finance_approval';
                const isDispatched = ['driver_assigned', 'picked_up', 'in_transit'].includes(job.status);
                const isCompleted = ['delivered', 'completed'].includes(job.status);

                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-500">
                          {job.orderNumber}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDispatched
                              ? 'bg-blue-100 text-blue-800'
                              : isEscrowPending
                              ? 'bg-purple-100 text-purple-800'
                              : isAgreed
                              ? 'bg-indigo-100 text-indigo-800'
                              : hasQuote
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {isCompleted
                            ? 'Delivered & Completed'
                            : isDispatched
                            ? `In Transit (${job.status.replace('_', ' ')})`
                            : isEscrowPending
                            ? 'Escrow Funded • Verifying with Finance Admin'
                            : isAgreed
                            ? 'Price Agreed • Escrow Deposit Required'
                            : hasQuote
                            ? 'Driver Price Quote Received!'
                            : 'Awaiting Driver Price Quote'}
                        </span>
                      </div>

                      <div className="text-xs text-stone-500">
                        Date: <span className="font-semibold text-stone-900">{job.preferredDate}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="font-bold text-stone-900 text-base">
                          {job.quantityKg.toLocaleString()} kg &bull; {job.commodityName}
                        </div>
                        <div className="text-stone-600 mt-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Pickup: {job.pickupLocation}, {job.pickupDistrict}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Destination: {job.destinationLocation}, {job.destinationDistrict}</span>
                          </div>
                          {job.distanceKm ? (
                            <div className="text-blue-900 font-semibold">
                              Road Distance: ~{job.distanceKm} km
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Driver & Quote Information */}
                      <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                        {hasQuote ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-stone-500 font-medium">Quoted Transport Fee:</span>
                              <span className="text-base font-extrabold text-blue-900">
                                MWK {Number(job.quotedPrice || job.transportFee).toLocaleString()}
                              </span>
                            </div>
                            {job.transporterName && (
                              <div className="text-stone-700">
                                Transporter: <strong className="text-stone-900">{job.transporterName}</strong>{' '}
                                {job.transporterPhone && <span>({job.transporterPhone})</span>}
                              </div>
                            )}
                            {job.quoteNotes && (
                              <div className="text-[11px] text-stone-600 bg-white p-2 rounded-xl border border-stone-200 italic">
                                &quot;{job.quoteNotes}&quot;
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1 text-stone-500">
                            <div className="font-semibold text-stone-800">
                              Quote Inquiry Sent to Transporter Network
                            </div>
                            <p className="text-[11px]">
                              Drivers are reviewing your {job.distanceKm || 'route'} km distance and cargo.
                              You will see their quoted price here once submitted.
                            </p>
                          </div>
                        )}

                        {job.currentLocation && isDispatched && (
                          <div className="pt-2 border-t border-stone-200 text-blue-900 font-medium text-[11px]">
                            Last GPS Checkpoint: <strong>{job.currentLocation}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                      {hasQuote && !isAgreed && !isEscrowPending && !isDispatched && !isCompleted && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleAcceptQuote(job.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Accept Quote &amp; Proceed to Escrow Deposit</span>
                          </button>

                          <button
                            onClick={() => handleDeclineQuote(job.id)}
                            className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs"
                          >
                            <span>Decline Quote</span>
                          </button>
                        </div>
                      )}

                      {isAgreed && !isEscrowPending && !isDispatched && !isCompleted && (
                        <button
                          onClick={() => {
                            setFundingJob(job);
                            setEscrowPaymentRef(`ESC-${Math.floor(100000 + Math.random() * 900000)}`);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-md active:scale-95"
                        >
                          <Coins className="w-4 h-4" />
                          <span>Deposit MWK {Number(job.quotedPrice || job.transportFee).toLocaleString()} into Escrow</span>
                        </button>
                      )}

                      {isEscrowPending && (
                        <div className="text-xs text-purple-900 font-semibold flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-purple-700 animate-spin" />
                          <span>
                            Escrow payment received (Ref: {job.paymentRef}). Financial Administrator Chisomo Mwale is verifying before dispatch!
                          </span>
                        </div>
                      )}

                      {isDispatched && (
                        <div className="text-xs text-blue-900 font-semibold flex items-center gap-1.5">
                          <Navigation className="w-4 h-4 text-blue-700 animate-pulse" />
                          <span>Driver {job.transporterName || 'Transporter'} is currently on route to destination!</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 3: VERIFIED TRANSPORTERS DIRECTORY                */}
      {/* ======================================================== */}
      {activeSubTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base">
              Verified Freight Transporters in Malawi ({transportersList.length})
            </h3>
            <span className="text-xs text-stone-500">
              Real-time driver availability, license type, experience, and vehicle plates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {transportersList.map((driver) => {
              const isAvail = driver.isAvailable !== false;

              return (
                <div
                  key={driver.id}
                  className="bg-white rounded-3xl border border-stone-200 p-5 space-y-4 hover:border-blue-300 transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-base shadow-2xs">
                        {driver.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-stone-900 text-sm truncate">{driver.fullName}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-stone-500 truncate">{driver.district}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRegionColorClass(getDistrictRegion(driver.district))}`}>
                            {getDistrictRegion(driver.district)} Region
                          </span>
                        </div>
                      </div>

                      {/* Real-time availability badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isAvail
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isAvail ? '🟢 Available' : '🟠 In Transit'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                      <div className="flex justify-between">
                        <span className="text-stone-400 text-[11px]">Vehicle:</span>
                        <span className="font-semibold text-stone-900">{driver.vehicleType || 'Truck'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 text-[11px]">Plate Number:</span>
                        <span className="font-mono font-bold text-blue-900">
                          {driver.plateNumber || driver.vehicleRegistration || 'BW 4921'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 text-[11px]">License Class:</span>
                        <span className="font-semibold text-stone-800">
                          {driver.licenseType || 'Class C (Heavy Commercial)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 text-[11px]">Experience:</span>
                        <span className="font-semibold text-stone-800">
                          {driver.yearsExperience || '5 years commercial'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 text-[11px]">Payload Capacity:</span>
                        <span className="font-semibold text-blue-800">
                          {(driver.vehicleCapacityKg || 5000).toLocaleString()} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 text-[11px]">Phone Contact:</span>
                        <span className="font-semibold text-stone-800">{driver.phoneNumber || '+265 '}</span>
                      </div>
                      {driver.currentRoute && (
                        <div className="pt-1 border-t border-stone-200/60 text-[11px] text-stone-500">
                          Status: <span className="font-semibold text-stone-700">{driver.currentRoute}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setQuoteForm({
                        ...quoteForm,
                        requestedDriverId: String(driver.id),
                        requiredVehicleType: driver.vehicleType || quoteForm.requiredVehicleType,
                      });
                      setActiveSubTab('quote_request');
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs ${
                      isAvail
                        ? 'bg-blue-700 hover:bg-blue-800 text-white'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-950'
                    }`}
                  >
                    <span>{isAvail ? 'Request Quote from This Driver' : 'Request Future Quote (Driver Busy)'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ESCROW PAYMENT DEPOSIT FOR AGREED PRICE           */}
      {/* ======================================================== */}
      {fundingJob !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                <span>Deposit Agreed Transport Escrow</span>
              </div>
              <button
                onClick={() => setFundingJob(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {escrowError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {escrowError}
              </div>
            )}

            <form onSubmit={handleDepositEscrow} className="space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex justify-between text-blue-950">
                  <span>Agreed Transporter Fee:</span>
                  <span className="font-bold text-sm">
                    MWK {Number(fundingJob.quotedPrice || fundingJob.transportFee).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>Route:</span>
                  <span>{fundingJob.pickupDistrict} &rarr; {fundingJob.destinationDistrict} (~{fundingJob.distanceKm} km)</span>
                </div>
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>Transporter:</span>
                  <span className="font-semibold">{fundingJob.transporterName || 'Verified Driver'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Escrow Payment Channel *
                </label>
                <select
                  value={escrowPaymentMethod}
                  onChange={(e) => setEscrowPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-blue-600 font-medium"
                >
                  <option value="Airtel Money Escrow (+265 999 036 912)">
                    Airtel Money Escrow (+265 999 036 912 - Peter Malikebu)
                  </option>
                  <option value="TNM Mpamba Escrow (+265 895 357 535)">
                    TNM Mpamba Escrow (+265 895 357 535)
                  </option>
                  <option value="National Bank of Malawi (Peter Adrian Malikebu - 1011619688)">
                    National Bank of Malawi (1011619688 - Peter Adrian Malikebu)
                  </option>
                  <option value="National Bank of Malawi (Joshua Malikebu - 1013388772)">
                    National Bank of Malawi (1013388772 - Joshua Malikebu)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Sender Reference / SMS Confirmation Code *
                </label>
                <input
                  type="text"
                  required
                  value={escrowPaymentRef}
                  onChange={(e) => setEscrowPaymentRef(e.target.value)}
                  placeholder="e.g. MP-829104 / AT-7721"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 font-mono font-bold focus:outline-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setFundingJob(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEscrow}
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{submittingEscrow ? 'Submitting Escrow...' : 'Confirm Escrow Deposit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
