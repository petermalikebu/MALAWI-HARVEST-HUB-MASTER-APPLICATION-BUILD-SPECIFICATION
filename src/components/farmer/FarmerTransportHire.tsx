import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { TransportJob, User, MALAWI_DISTRICTS } from '../../types/index.ts';
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
} from 'lucide-react';

interface FarmerTransportHireProps {
  onJobCreated?: () => void;
}

export const FarmerTransportHire: React.FC<FarmerTransportHireProps> = ({ onJobCreated }) => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [activeSubTab, setActiveSubTab] = useState<'book' | 'my_bookings' | 'drivers'>('book');
  const [transportJobs, setTransportJobs] = useState<TransportJob[]>([]);
  const [transportersList, setTransportersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [form, setForm] = useState({
    commodityName: 'White Maize Grain (Grade 1)',
    quantityKg: 2500,
    pickupLocation: currentUser?.tradingArea || 'Kapiri Trading Centre Depot',
    pickupDistrict: currentUser?.district || 'Mchinji',
    destinationLocation: 'Kanengo Industrial Agro-Depot',
    destinationDistrict: 'Lilongwe',
    requiredVehicleType: 'Medium Truck (5-7 Ton)',
    preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    specialRequirements: 'Waterproof tarpaulin required for grain moisture protection',
    transportFee: 45000,
    paymentMethod: 'Airtel Money Escrow',
    paymentRef: `MP-${Math.floor(100000 + Math.random() * 900000)}`,
    requestedDriverId: '',
  });

  const [platformCommissionRate, setPlatformCommissionRate] = useState<number>(0.04);

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
    const unsubSetting = subscribe('setting_updated', (data: any) => {
      if (data?.key === 'commission_rate' && !isNaN(parseFloat(data?.value))) {
        setPlatformCommissionRate(parseFloat(data.value));
      }
    });
    return () => {
      unsub();
      unsubReq();
      unsubSetting();
    };
  }, [subscribe]);

  const handleSubmitHire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/transport/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerUid: currentUser.uid,
          farmerName: currentUser.fullName,
          farmerPhone: currentUser.phoneNumber || '+265 888 123 456',
          ...form,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        const created = parsed.data || {};
        setSuccessMsg(`Transport request #${created.orderNumber || 'CONFIRMED'} submitted! Payment of MK ${Number(created.transportFee || 0).toLocaleString()} is in escrow awaiting Finance Admin verification and driver recommendation.`);
        setActiveSubTab('my_bookings');
        fetchData();
        if (onJobCreated) onJobCreated();
      } else {
        setErrorMsg(parsed.error || 'Failed to submit transport hire request');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const platformFee = Math.round(Number(form.transportFee) * platformCommissionRate);
  const totalEscrowFee = Number(form.transportFee) + platformFee;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-800/60 text-blue-200 border border-blue-700/40">
              <Truck className="w-3.5 h-3.5" />
              <span>Smallholder Farmer Logistics &bull; Guaranteed Cargo Transit</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Hire Agricultural Transporter & Driver
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Book vetted freight for your harvested maize, soya, groundnuts, or tobacco. 
              The <strong className="text-white">Finance Administrator verifies your transport fee payment in escrow</strong> and <strong className="text-white">recommends the safest vetted driver</strong> for your route.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('book')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeSubTab === 'book'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'bg-blue-800/50 hover:bg-blue-800 text-blue-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5 inline mr-1.5" />
              Book New Transport
            </button>
            <button
              onClick={() => setActiveSubTab('my_bookings')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all relative ${
                activeSubTab === 'my_bookings'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'bg-blue-800/50 hover:bg-blue-800 text-blue-100'
              }`}
            >
              <span>My Bookings ({transportJobs.length})</span>
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-blue-800/40 hover:bg-blue-800 text-blue-200"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Transport Request Submitted Successfully</div>
            <div>{successMsg}</div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Error Processing Request</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* SUB TABS NAVIGATION */}
      <div className="flex border-b border-stone-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('book')}
          className={`pb-3 border-b-2 transition-colors ${
            activeSubTab === 'book'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          1. Book Transport & Pay Fee
        </button>
        <button
          onClick={() => setActiveSubTab('my_bookings')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'my_bookings'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <span>2. My Bookings & Recommended Drivers</span>
          {transportJobs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">
              {transportJobs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('drivers')}
          className={`pb-3 border-b-2 transition-colors ${
            activeSubTab === 'drivers'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          3. Verified Malawi Transporters Directory ({transportersList.length})
        </button>
      </div>

      {/* TAB 1: BOOK TRANSPORT FORM */}
      {activeSubTab === 'book' && (
        <form onSubmit={handleSubmitHire} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form fields */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="border-b border-stone-100 pb-4">
                <h3 className="font-bold text-stone-900 text-base">Cargo & Corridor Details</h3>
                <p className="text-stone-500 text-xs mt-0.5">
                  Provide origin, destination, and commodity specifications for driver dispatch.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Commodity to Transport *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.commodityName}
                    onChange={(e) => setForm({ ...form, commodityName: e.target.value })}
                    placeholder="e.g. White Maize Grain (Grade 1)"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Estimated Cargo Weight (Kg) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={form.quantityKg}
                    onChange={(e) => setForm({ ...form, quantityKg: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 font-medium"
                  />
                  <span className="text-[10px] text-stone-400">
                    ≈ {(form.quantityKg / 50).toFixed(0)} standard 50-kg bags
                  </span>
                </div>
              </div>

              {/* Pickup & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>Origin / Pickup Location</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Pickup District *
                    </label>
                    <select
                      value={form.pickupDistrict}
                      onChange={(e) => setForm({ ...form, pickupDistrict: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-blue-600"
                    >
                      {MALAWI_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Pickup Village / Trading Depot *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.pickupLocation}
                      onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
                      placeholder="e.g. Kapiri Trading Centre, Mphunzi"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                    <MapPin className="w-4 h-4 text-rose-700" />
                    <span>Destination / Delivery Point</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Destination District *
                    </label>
                    <select
                      value={form.destinationDistrict}
                      onChange={(e) => setForm({ ...form, destinationDistrict: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-blue-600"
                    >
                      {MALAWI_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Destination Facility / Market *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.destinationLocation}
                      onChange={(e) => setForm({ ...form, destinationLocation: e.target.value })}
                      placeholder="e.g. Kanengo Industrial Grain Depot, Lilongwe"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule and Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Preferred Loading Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.preferredDate}
                    onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Required Vehicle Specification *
                  </label>
                  <select
                    value={form.requiredVehicleType}
                    onChange={(e) => setForm({ ...form, requiredVehicleType: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white"
                  >
                    <option value="Light Truck (3-5 Ton)">Light Truck (3-5 Ton) - e.g. Canter</option>
                    <option value="Medium Truck (5-7 Ton)">Medium Truck (5-7 Ton) - e.g. Isuzu Forward</option>
                    <option value="Heavy Freight (10-15 Ton)">Heavy Freight (10-15 Ton)</option>
                    <option value="Tractor Trailer (Farm to Depot)">Tractor Trailer (Local Farm to Depot)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Optional Preferred Driver (Or leave for Finance Admin to recommend best driver)
                </label>
                <select
                  value={form.requestedDriverId}
                  onChange={(e) => setForm({ ...form, requestedDriverId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white"
                >
                  <option value="">-- Let Finance Administrator Recommend the Best Available Driver --</option>
                  {transportersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} &bull; {t.vehicleType || 'Truck'} ({t.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Cargo Instructions & Special Requirements
                </label>
                <textarea
                  rows={2}
                  value={form.specialRequirements}
                  onChange={(e) => setForm({ ...form, specialRequirements: e.target.value })}
                  placeholder="e.g. Driver should provide 2 tarpaulins. Loading assistance required at farm depot."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                />
              </div>
            </div>

            {/* Right 1 Col: Escrow & Upfront Payment Verification */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-5 shadow-xs">
                <div className="border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Escrow & Finance Verification</span>
                  </div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Funds are secured by the platform until delivery is confirmed.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Transport Fee Offer (MWK) *
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="10000"
                      required
                      value={form.transportFee}
                      onChange={(e) => setForm({ ...form, transportFee: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold text-stone-900 focus:outline-blue-600"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                    <div className="flex justify-between text-stone-600">
                      <span>Transporter Base Fee:</span>
                      <span className="font-semibold text-stone-900">
                        MK {Number(form.transportFee).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Transit Insurance & Escrow ({(platformCommissionRate * 100).toFixed(1)}%):</span>
                      <span className="font-semibold text-stone-900">
                        MK {platformFee.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-stone-900">
                      <span>Total Escrow Amount:</span>
                      <span className="text-blue-900 font-extrabold text-sm">
                        MK {totalEscrowFee.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Payment Escrow Method *
                    </label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white focus:outline-blue-600 text-xs"
                    >
                      <option value="Airtel Money Escrow">Airtel Money Escrow (+265 99...)</option>
                      <option value="TNM Mpamba Escrow">TNM Mpamba Escrow (+265 88...)</option>
                      <option value="National Bank of Malawi Escrow">National Bank of Malawi Mo626</option>
                      <option value="Standard Bank Escrow">Standard Bank 247</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Transaction Reference / Proof Ref *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.paymentRef}
                      onChange={(e) => setForm({ ...form, paymentRef: e.target.value })}
                      placeholder="e.g. MP-829104"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-xs focus:outline-blue-600"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      The Finance Administrator checks this transaction reference before dispatching the recommended driver.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Workflow Guarantee:</span>
                  </div>
                  <p className="leading-relaxed">
                    Once submitted, <strong className="text-amber-950">Finance Administrator Chisomo Mwale / Lead Admin</strong> verifies the fee in the central ledger and recommends a vetted, inspected driver who accepts the route.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Coins className="w-4 h-4 text-blue-200" />
                  <span>
                    {submitting
                      ? 'Submitting Request...'
                      : `Pay MK ${totalEscrowFee.toLocaleString()} & Submit to Finance`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: MY BOOKINGS & RECOMMENDED DRIVERS */}
      {activeSubTab === 'my_bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base">
              My Transport Bookings & Driver Recommendations ({transportJobs.length})
            </h3>
            <button
              onClick={() => setActiveSubTab('book')}
              className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book Another Trip</span>
            </button>
          </div>

          {transportJobs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <Truck className="w-12 h-12 text-stone-300 mx-auto" />
              <h4 className="font-bold text-stone-800 text-sm">No Transport Bookings Yet</h4>
              <p className="text-stone-500 text-xs max-w-sm mx-auto">
                Need to move harvested crops from your farm to market? Book verified freight with secured escrow payment.
              </p>
              <button
                onClick={() => setActiveSubTab('book')}
                className="px-5 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800"
              >
                Book First Transport Request
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {transportJobs.map((job) => {
                const isPendingFinance = job.status === 'pending_finance_approval';
                const isApprovedWithDriver = job.status === 'driver_assigned' || job.status === 'in_transit' || job.status === 'delivered';

                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-sm">
                            {job.commodityName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-100 text-stone-700">
                            #{job.orderNumber}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span>
                            {job.pickupLocation} ({job.pickupDistrict}) &rarr; {job.destinationLocation} ({job.destinationDistrict})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-bold text-stone-900">
                            MK {Number(job.transportFee).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {job.quantityKg.toLocaleString()} Kg ({job.requiredVehicleType})
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isPendingFinance ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Awaiting Finance Approval</span>
                          </span>
                        ) : isApprovedWithDriver ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="capitalize">{job.status.replace('_', ' ')}</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-800">
                            {job.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Finance Approval & Recommended Driver Card */}
                    {job.recommendedDriverName || job.transporterName ? (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span>Recommended & Approved Driver by Finance Administrator</span>
                          </div>
                          {job.financeApprovedBy && (
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              Verified by: {job.financeApprovedBy}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 backdrop-blur p-3.5 rounded-xl border border-emerald-100 text-xs">
                          <div>
                            <div className="text-stone-400 text-[10px] font-semibold">Driver Name</div>
                            <div className="font-bold text-stone-900 mt-0.5">
                              {job.recommendedDriverName || job.transporterName}
                            </div>
                          </div>
                          <div>
                            <div className="text-stone-400 text-[10px] font-semibold">Driver Phone & Direct Contact</div>
                            <div className="font-bold text-emerald-800 mt-0.5 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{job.transporterPhone || '+265 882 776 543'}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-stone-400 text-[10px] font-semibold">Escrow Fee Status</div>
                            <div className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified in Escrow</span>
                            </div>
                          </div>
                        </div>

                        {job.financeRecommendationNotes && (
                          <div className="text-[11px] text-emerald-900 bg-white/60 p-2.5 rounded-lg border border-emerald-100/60">
                            <span className="font-bold">Finance Admin Recommendation: </span>
                            <span>{job.financeRecommendationNotes}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-700" />
                          <span>Finance Administrator Queue:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Your escrow payment (Ref: <span className="font-mono font-bold">{job.paymentRef || 'ESCROW'}</span>) is currently being reconciled by the Finance Administrator. Once verified, the optimal driver will be assigned and recommended here.
                        </p>
                      </div>
                    )}

                    {/* Progress tracking */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                      <div className="text-stone-500">
                        <span className="text-[10px] text-stone-400 block">Preferred Date</span>
                        <span className="font-semibold text-stone-800">{job.preferredDate}</span>
                      </div>
                      <div className="text-stone-500">
                        <span className="text-[10px] text-stone-400 block">Payment Method</span>
                        <span className="font-semibold text-stone-800">{job.paymentMethod}</span>
                      </div>
                      <div className="text-stone-500">
                        <span className="text-[10px] text-stone-400 block">Payment Reference</span>
                        <span className="font-mono text-stone-800 text-[11px]">{job.paymentRef}</span>
                      </div>
                      <div className="text-stone-500">
                        <span className="text-[10px] text-stone-400 block">Current Status</span>
                        <span className="font-semibold text-blue-900 capitalize">
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VERIFIED DRIVERS DIRECTORY */}
      {activeSubTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base">
              Verified Freight Transporters in Malawi ({transportersList.length})
            </h3>
            <span className="text-xs text-stone-500">
              Inspected & registered on the Malawi Harvest Hub network
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transportersList.map((driver) => (
              <div
                key={driver.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 hover:border-blue-300 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                    {driver.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-900 text-xs truncate">{driver.fullName}</h4>
                    <p className="text-[11px] text-stone-500 truncate">
                      {driver.district} &bull; {driver.region} Region
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Verified
                  </span>
                </div>

                <div className="space-y-1 text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <div className="flex justify-between">
                    <span className="text-stone-400 text-[11px]">Vehicle:</span>
                    <span className="font-semibold">{driver.vehicleType || 'Medium Truck'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400 text-[11px]">Registration:</span>
                    <span className="font-mono font-semibold">{driver.vehicleRegistration || 'BW 4921'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400 text-[11px]">Max Payload:</span>
                    <span className="font-semibold text-blue-800">{driver.vehicleCapacityKg || 5000} Kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400 text-[11px]">Phone Contact:</span>
                    <span className="font-semibold">{driver.phoneNumber || '+265 882 776 543'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setForm({ ...form, requestedDriverId: String(driver.id) });
                    setActiveSubTab('book');
                  }}
                  className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Select & Request This Driver</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
