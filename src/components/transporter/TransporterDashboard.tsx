import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { TransportJob, VEHICLE_TYPES } from '../../types/index.ts';
import { safeParseJson, safeParseResponse } from '../../lib/api.ts';
import {
  Truck,
  Package,
  MapPin,
  Calendar,
  CheckCircle,
  Navigation,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  HelpCircle,
  MessageSquare,
  DollarSign,
  Send,
  Edit3,
  Award,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Gauge,
} from 'lucide-react';
import { SupportQueriesDesk } from '../support/SupportQueriesDesk.tsx';

export const TransporterDashboard: React.FC = () => {
  const { currentUser, refreshUser } = useAuth();
  const { subscribe } = useRealtime();

  const [jobs, setJobs] = useState<TransportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quotes' | 'available' | 'active' | 'completed' | 'profile' | 'queries'>('quotes');

  // Location update modal
  const [updatingJobId, setUpdatingJobId] = useState<number | null>(null);
  const [currentLocationInput, setCurrentLocationInput] = useState('');
  const [estimatedArrivalInput, setEstimatedArrivalInput] = useState('2 hours');

  // Quoting state
  const [quotingJobId, setQuotingJobId] = useState<number | null>(null);
  const [quotedAmount, setQuotedAmount] = useState<number>(0);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState('');
  const [quoteErrorMsg, setQuoteErrorMsg] = useState('');

  // Profile edit modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileForm, setProfileForm] = useState({
    vehicleType: currentUser?.vehicleType || 'Light Truck (3-5 Ton)',
    plateNumber: currentUser?.plateNumber || currentUser?.vehicleRegistration || 'BW 4921',
    licenseType: currentUser?.licenseType || 'Class C (Heavy Commercial Vehicle)',
    yearsExperience: currentUser?.yearsExperience || '5 years commercial haulage',
    vehicleCapacityKg: currentUser?.vehicleCapacityKg || 5000,
    phoneNumber: currentUser?.phoneNumber || '+265 ',
    district: currentUser?.district || 'Lilongwe',
    tradingArea: currentUser?.tradingArea || 'Kanengo Transport Depot',
    currentRoute: currentUser?.currentRoute || 'Available in Lilongwe',
  });

  // Toggling availability state
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const fetchJobs = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/transport/jobs?transporterUid=${currentUser.uid}`);
      if (res.ok) {
        setJobs(await safeParseJson(res, []));
      }
    } catch (err) {
      console.error('Failed to fetch transport jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        vehicleType: currentUser.vehicleType || 'Light Truck (3-5 Ton)',
        plateNumber: currentUser.plateNumber || currentUser.vehicleRegistration || 'BW 4921',
        licenseType: currentUser.licenseType || 'Class C (Heavy Commercial Vehicle)',
        yearsExperience: currentUser.yearsExperience || '5 years commercial haulage',
        vehicleCapacityKg: currentUser.vehicleCapacityKg || 5000,
        phoneNumber: currentUser.phoneNumber || '+265 ',
        district: currentUser.district || 'Lilongwe',
        tradingArea: currentUser.tradingArea || 'Kanengo Transport Depot',
        currentRoute: currentUser.currentRoute || 'Available in Lilongwe',
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubReq = subscribe('transport_requested', () => fetchJobs());
    const unsubUp = subscribe('transport_updated', () => fetchJobs());
    const unsubAvail = subscribe('transporter_availability_changed', () => {
      fetchJobs();
      if (refreshUser) refreshUser();
    });
    return () => {
      unsubReq();
      unsubUp();
      unsubAvail();
    };
  }, [subscribe]);

  const handleToggleAvailability = async (newAvailability: boolean) => {
    if (!currentUser) return;
    setTogglingAvailability(true);
    try {
      const defaultRoute = newAvailability
        ? `Available in ${currentUser.district || 'Lilongwe'}`
        : 'In Transit / Unavailable on another route';

      const res = await fetch('/api/users/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          isAvailable: newAvailability,
          currentRoute: defaultRoute,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        if (refreshUser) await refreshUser();
      } else {
        alert(parsed.error || 'Failed to update availability');
      }
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    } finally {
      setTogglingAvailability(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingProfile(true);
    setProfileMsg('');

    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          ...profileForm,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setProfileMsg('Transporter profile and vehicle credentials updated successfully in Cloud Firestore!');
        if (refreshUser) await refreshUser();
        setTimeout(() => setShowProfileModal(false), 1500);
      } else {
        setProfileMsg(parsed.error || 'Failed to save profile');
      }
    } catch (err: any) {
      setProfileMsg(err.message || 'Network error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitQuote = async (jobId: number) => {
    if (!currentUser) return;
    if (quotedAmount <= 0) {
      setQuoteErrorMsg('Please enter a valid quoted fee in MWK.');
      return;
    }

    setSubmittingQuote(true);
    setQuoteErrorMsg('');
    setQuoteSuccessMsg('');

    try {
      const job = jobs.find((j) => j.id === jobId);
      const dist = job?.distanceKm || 0;
      const rateKm = dist > 0 ? Math.round(quotedAmount / dist) : undefined;

      const res = await fetch(`/api/transport/jobs/${jobId}/submit-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transporterUid: currentUser.uid,
          quotedPrice: quotedAmount,
          pricePerKm: rateKm,
          quoteNotes: quoteNotes.trim() || `Quote of MWK ${quotedAmount.toLocaleString()} submitted by driver ${currentUser.fullName} (${currentUser.vehicleType || 'Truck'})`,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setQuoteSuccessMsg(`Price quote of MWK ${quotedAmount.toLocaleString()} successfully sent to the farmer and administrator!`);
        fetchJobs();
        setTimeout(() => {
          setQuotingJobId(null);
          setQuoteSuccessMsg('');
        }, 1800);
      } else {
        setQuoteErrorMsg(parsed.error || 'Failed to submit price quote');
      }
    } catch (err: any) {
      setQuoteErrorMsg(err.message || 'Error occurred while submitting quote');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleAcceptJob = async (jobId: number) => {
    try {
      const res = await fetch(`/api/transport/jobs/${jobId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transporterUid: currentUser?.uid }),
      });
      if (res.ok) {
        fetchJobs();
        setActiveTab('active');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to accept job');
      }
    } catch (err) {
      console.error('Failed to accept transport job:', err);
    }
  };

  const handleUpdateStatus = async (
    jobId: number,
    status: 'picked_up' | 'in_transit' | 'delivered',
    location?: string
  ) => {
    try {
      const res = await fetch(`/api/transport/jobs/${jobId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          currentLocation: location,
          userUid: currentUser?.uid,
        }),
      });
      if (res.ok) {
        fetchJobs();
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      console.error('Failed to update transport status:', err);
    }
  };

  // Job Filters
  const quoteInquiryJobs = jobs.filter(
    (j) =>
      ['quote_requested', 'quote_submitted', 'price_agreed'].includes(j.status) ||
      (j.priceStatus && ['pending_quote', 'quoted', 'confirmed_by_farmer', 'confirmed_by_admin', 'agreed'].includes(j.priceStatus))
  );

  const availableJobs = jobs.filter((j) => j.status === 'requested');
  
  const myActiveJobs = jobs.filter(
    (j) =>
      (j.transporterUid === currentUser?.uid || j.recommendedDriverId === currentUser?.id) &&
      ['accepted', 'driver_assigned', 'picked_up', 'in_transit'].includes(j.status)
  );

  const myCompletedJobs = jobs.filter(
    (j) =>
      (j.transporterUid === currentUser?.uid || j.recommendedDriverId === currentUser?.id) &&
      ['delivered', 'completed'].includes(j.status)
  );

  const totalEarnings = myCompletedJobs.reduce((sum, j) => sum + Number(j.quotedPrice || j.transportFee || 0), 0);

  const isDriverAvailable = currentUser?.isAvailable !== false;

  return (
    <div className="space-y-6">
      {/* Transporter Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-800/60 text-blue-200 border border-blue-700/40">
                <Truck className="w-3.5 h-3.5" />
                <span>Commercial Freight Haulage &bull; Malawi Network</span>
              </span>

              {/* Real-time Availability Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  isDriverAvailable
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isDriverAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isDriverAvailable ? 'Available for Hire' : 'In Transit / Unavailable on another route'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Moni, {currentUser?.fullName}!
            </h1>

            <div className="text-blue-100 text-xs sm:text-sm leading-relaxed space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-stone-200">
                <span>Vehicle: <strong className="text-white">{currentUser?.vehicleType || 'Truck'}</strong></span>
                <span>&bull;</span>
                <span>Plate: <strong className="text-amber-300 font-mono">{currentUser?.plateNumber || currentUser?.vehicleRegistration || 'BW 4921'}</strong></span>
                <span>&bull;</span>
                <span>License: <strong className="text-white">{currentUser?.licenseType || 'Class C'}</strong></span>
                <span>&bull;</span>
                <span>Experience: <strong className="text-white">{currentUser?.yearsExperience || '5 years'}</strong></span>
              </div>
              <p className="text-blue-200/80 text-xs">
                Current Status: <span className="font-semibold text-white">{currentUser?.currentRoute || (isDriverAvailable ? 'Available for dispatch' : 'On delivery route')}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Availability Toggle Button */}
            <button
              onClick={() => handleToggleAvailability(!isDriverAvailable)}
              disabled={togglingAvailability}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 ${
                isDriverAvailable
                  ? 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>
                {togglingAvailability
                  ? 'Updating...'
                  : isDriverAvailable
                  ? 'Set In Transit (Unavailable)'
                  : 'Set Available for Hire (Trip Ended)'}
              </span>
            </button>

            {/* Edit Profile Credentials */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-1.5 border border-white/10"
            >
              <Edit3 className="w-4 h-4" />
              <span>Driver Credentials</span>
            </button>

            <button
              onClick={fetchJobs}
              className="p-2.5 rounded-xl bg-blue-800/50 hover:bg-blue-800 text-blue-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-blue-800/60">
          <div>
            <div className="text-xs text-blue-200 font-medium">Route Quote Inquiries</div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-300 mt-0.5">
              {quoteInquiryJobs.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-blue-200 font-medium">Open Transport Jobs</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              {availableJobs.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-blue-200 font-medium">Active In-Transit</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              {myActiveJobs.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-blue-200 font-medium">Haulage Earnings</div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 mt-0.5">
              MWK {totalEarnings.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'quotes'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Price Quote Inquiries ({quoteInquiryJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'available'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Available Fixed Jobs ({availableJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Active In-Transit ({myActiveJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Completed &amp; Settled ({myCompletedJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>My Vehicle &amp; License Credentials</span>
        </button>

        <button
          onClick={() => setActiveTab('queries')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'queries'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Queries &amp; Suggestions Desk</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PRICE QUOTE INQUIRIES & NEGOTIATION WORKFLOW      */}
      {/* ======================================================== */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-950">
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-900">
                <DollarSign className="w-4 h-4 text-blue-700" />
                <span>Dynamic Price Negotiation Workflow</span>
              </div>
              <p className="text-blue-800 leading-relaxed">
                Smallholder farmers request quotes based on road corridor and distance to be covered.
                You can review cargo weight, calculate fuel and distance expenses, and quote your price. 
                Once the farmer and administrator confirm the price, funds are deposited into escrow.
              </p>
            </div>
          </div>

          {quoteInquiryJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <DollarSign className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No pending quote inquiries</h3>
              <p className="text-stone-500 text-xs mt-1">
                When farmers or buyers request route pricing for their harvest, inquiries will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {quoteInquiryJobs.map((job) => {
                const isQuoted = job.status === 'quote_submitted' || Boolean(job.quotedPrice && Number(job.quotedPrice) > 0);
                const isAgreed = job.status === 'price_agreed' || job.priceStatus === 'agreed';
                const isPendingMyQuote = job.status === 'quote_requested';

                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-stone-500">
                          {job.orderNumber}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isAgreed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isQuoted
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isAgreed
                            ? 'Price Agreed & Escrow Pending'
                            : isQuoted
                            ? 'Quote Submitted • Awaiting Confirmation'
                            : 'Quote Inquiry from Farmer'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-stone-900 text-base">
                          {job.quantityKg.toLocaleString()} kg &bull; {job.commodityName}
                        </h3>
                        <div className="text-xs text-stone-600 mt-1">
                          Client: <strong className="text-stone-900">{job.farmerName || 'Farmer'}</strong>{' '}
                          {job.farmerPhone && <span>({job.farmerPhone})</span>}
                        </div>
                      </div>

                      {/* Route & Distance Card */}
                      <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] text-stone-400 font-bold uppercase">Pickup Depot</div>
                            <div className="font-semibold text-stone-900">
                              {job.pickupLocation}, {job.pickupDistrict}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 pt-1 border-t border-stone-200/60">
                          <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] text-stone-400 font-bold uppercase">Destination Warehouse</div>
                            <div className="font-semibold text-stone-900">
                              {job.destinationLocation}, {job.destinationDistrict}
                            </div>
                          </div>
                        </div>

                        {job.distanceKm ? (
                          <div className="pt-1 border-t border-stone-200/60 flex items-center justify-between text-blue-900 font-bold text-[11px]">
                            <span className="flex items-center gap-1">
                              <Gauge className="w-3.5 h-3.5 text-blue-700" />
                              <span>Distance to Cover:</span>
                            </span>
                            <span>~{job.distanceKm} km</span>
                          </div>
                        ) : null}
                      </div>

                      {job.specialRequirements && (
                        <div className="text-[11px] text-stone-600 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
                          <span className="font-bold text-amber-900">Farmer Requirements: </span>
                          <span>{job.specialRequirements}</span>
                        </div>
                      )}

                      {/* Display current quote if already submitted */}
                      {isQuoted && (
                        <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs space-y-1">
                          <div className="flex justify-between items-center text-blue-950 font-bold">
                            <span>Your Submitted Quote:</span>
                            <span className="text-base text-blue-900 font-extrabold">
                              MWK {Number(job.quotedPrice || job.transportFee).toLocaleString()}
                            </span>
                          </div>
                          {job.pricePerKm && (
                            <div className="text-[11px] text-blue-800">
                              Approx Rate: MWK {Number(job.pricePerKm).toLocaleString()}/km
                            </div>
                          )}
                          {job.quoteNotes && (
                            <div className="text-[11px] text-stone-600 pt-1 border-t border-blue-200/60 italic">
                              &quot;{job.quoteNotes}&quot;
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      {isPendingMyQuote ? (
                        <button
                          onClick={() => {
                            setQuotingJobId(job.id);
                            setQuotedAmount(Number(job.distanceKm ? job.distanceKm * 500 : 35000));
                            setQuoteNotes('');
                            setQuoteErrorMsg('');
                            setQuoteSuccessMsg('');
                          }}
                          className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Quote Your Price for this Route</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setQuotingJobId(job.id);
                            setQuotedAmount(Number(job.quotedPrice || job.transportFee || 35000));
                            setQuoteNotes(job.quoteNotes || '');
                            setQuoteErrorMsg('');
                            setQuoteSuccessMsg('');
                          }}
                          className="w-full py-2 rounded-xl border border-blue-300 text-blue-800 hover:bg-blue-50 font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Adjust Quoted Price</span>
                        </button>
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
      {/* TAB 2: AVAILABLE FIXED JOBS                              */}
      {/* ======================================================== */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Open Fixed Freight Requests</h2>
            <span className="text-xs text-stone-500 font-medium">
              Accept jobs matching your vehicle capacity and preferred delivery corridor.
            </span>
          </div>

          {availableJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <Truck className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No open fixed transport requests</h3>
              <p className="text-stone-500 text-xs mt-1">
                Check the &quot;Price Quote Inquiries&quot; tab for route inquiries from farmers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {availableJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-stone-500">
                        {job.orderNumber}
                      </span>
                      <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        Requested
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-stone-900 text-base">
                        {job.quantityKg.toLocaleString()} kg &bull; {job.commodityName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-stone-600 mt-1">
                        <span>Required: <strong className="text-stone-800">{job.requiredVehicleType}</strong></span>
                      </div>
                    </div>

                    {/* Route card */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-stone-400 font-bold uppercase">Pickup Depot</div>
                          <div className="font-semibold text-stone-900">
                            {job.pickupLocation}, {job.pickupDistrict}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-1 border-t border-stone-200/60">
                        <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-stone-400 font-bold uppercase">Destination Warehouse</div>
                          <div className="font-semibold text-stone-900">
                            {job.destinationLocation}, {job.destinationDistrict}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-stone-500">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Target Date: {job.preferredDate}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-stone-400 font-semibold uppercase">Offered Fee</div>
                      <div className="text-xl font-extrabold text-blue-900">
                        MWK {Number(job.transportFee).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-98 transition-all"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Accept Transport Job</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ACTIVE IN-TRANSIT MISSIONS                        */}
      {/* ======================================================== */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Active Delivery Missions</h2>
            <span className="text-xs text-stone-500 font-medium">
              Update delivery milestones to notify the farmer, buyer, and finance admin in real time.
            </span>
          </div>

          {myActiveJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <Navigation className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No active delivery jobs</h3>
              <p className="text-stone-500 text-xs mt-1">
                Quote prices on open requests or accept jobs to start moving freight.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myActiveJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-500">
                        {job.orderNumber}
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full capitalize">
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-blue-900">
                      Agreed Fee: MWK {Number(job.quotedPrice || job.transportFee).toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-stone-900 text-base">
                        {job.quantityKg.toLocaleString()} kg &bull; {job.commodityName}
                      </h4>
                      <div className="text-xs text-stone-600 mt-2 space-y-1">
                        {job.farmerName && (
                          <div className="text-xs font-bold text-stone-900">
                            Client: {job.farmerName} {job.farmerPhone ? `(${job.farmerPhone})` : ''}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Pickup: {job.pickupLocation}, {job.pickupDistrict}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Destination: {job.destinationLocation}, {job.destinationDistrict}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2 text-xs">
                      <div className="text-[11px] font-bold text-blue-950 uppercase">
                        Current Checkpoint Location
                      </div>
                      <div className="font-semibold text-stone-900">
                        {job.currentLocation || 'Kanengo Transport Depot, Lilongwe'}
                      </div>
                      <div className="text-[11px] text-blue-800">
                        Estimated arrival: {job.estimatedArrival || 'On schedule'}
                      </div>
                    </div>
                  </div>

                  {/* Milestone Progression Buttons */}
                  <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
                    {job.status === 'driver_assigned' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'picked_up', 'Picked up from Farmgate Depot')}
                        className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>1. Mark Goods Loaded &amp; Picked Up</span>
                      </button>
                    )}

                    {job.status === 'picked_up' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'in_transit', 'En route on Highway')}
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>2. Mark In Transit on Road (Sets Status Busy)</span>
                      </button>
                    )}

                    {job.status === 'in_transit' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'delivered', 'Arrived at Destination Warehouse')}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>3. Mark Delivered (Resets Status to Available)</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setUpdatingJobId(job.id);
                        setCurrentLocationInput(job.currentLocation || '');
                      }}
                      className="px-3 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold text-xs ml-auto"
                    >
                      Update Checkpoint Location
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: COMPLETED DELIVERIES HISTORY                      */}
      {/* ======================================================== */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-stone-900">Completed Haulage History</h2>
          {myCompletedJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <CheckCircle className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No completed deliveries yet</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {myCompletedJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-500">
                        {job.orderNumber}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        Delivered &amp; Settled
                      </span>
                    </div>
                    <div className="font-bold text-stone-900 text-sm">
                      {job.quantityKg.toLocaleString()} kg {job.commodityName}
                    </div>
                    <div className="text-xs text-stone-500">
                      {job.pickupDistrict} &rarr; {job.destinationDistrict}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-stone-400 font-semibold uppercase">Earned Fee</div>
                    <div className="text-lg font-extrabold text-emerald-700">
                      MWK {Number(job.quotedPrice || job.transportFee).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: MY VEHICLE & DRIVER CREDENTIALS                   */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs max-w-2xl">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-lg font-bold text-stone-900">
              My Vehicle &amp; Professional Driving License
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Farmers and platform administrators view these credentials when considering your transport quotes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-stone-400 font-bold uppercase text-[10px]">Driving License Class</span>
              <div className="text-sm font-bold text-stone-900">
                {currentUser?.licenseType || 'Class C (Heavy Commercial Vehicle)'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-stone-400 font-bold uppercase text-[10px]">Driving Experience</span>
              <div className="text-sm font-bold text-stone-900">
                {currentUser?.yearsExperience || '5 years commercial haulage'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-stone-400 font-bold uppercase text-[10px]">Registered Vehicle Type</span>
              <div className="text-sm font-bold text-stone-900">
                {currentUser?.vehicleType || 'Light Truck (3-5 Ton)'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-stone-400 font-bold uppercase text-[10px]">Vehicle Number Plate</span>
              <div className="text-sm font-mono font-bold text-blue-900">
                {currentUser?.plateNumber || currentUser?.vehicleRegistration || 'BW 4921'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-stone-400 font-bold uppercase text-[10px]">Payload Capacity</span>
              <div className="text-sm font-bold text-stone-900">
                {(currentUser?.vehicleCapacityKg || 5000).toLocaleString()} kg
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-stone-400 font-bold uppercase text-[10px]">Live Availability Status</span>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isDriverAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={isDriverAvailable ? 'text-emerald-700' : 'text-amber-700'}>
                  {isDriverAvailable ? 'Available for Hire' : 'In Transit / On Delivery'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowProfileModal(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Vehicle &amp; License Credentials</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: SUPPORT & QUERIES DESK                            */}
      {/* ======================================================== */}
      {activeTab === 'queries' && <SupportQueriesDesk />}

      {/* ======================================================== */}
      {/* MODAL: SUBMIT CUSTOM PRICE QUOTE                         */}
      {/* ======================================================== */}
      {quotingJobId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <DollarSign className="w-5 h-5 text-blue-700" />
                <span>Submit Custom Price Quote</span>
              </div>
              <button
                onClick={() => setQuotingJobId(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quoteSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{quoteSuccessMsg}</span>
              </div>
            )}

            {quoteErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{quoteErrorMsg}</span>
              </div>
            )}

            {(() => {
              const currentJob = jobs.find((j) => j.id === quotingJobId);
              if (!currentJob) return null;

              const distance = currentJob.distanceKm || 0;
              const ratePerKm = distance > 0 && quotedAmount > 0 ? Math.round(quotedAmount / distance) : null;

              return (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <div className="font-bold text-stone-900 text-sm">
                      {currentJob.quantityKg.toLocaleString()} kg &bull; {currentJob.commodityName}
                    </div>
                    <div className="text-stone-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Route: {currentJob.pickupDistrict} ({currentJob.pickupLocation}) &rarr; {currentJob.destinationDistrict}</span>
                    </div>
                    {distance > 0 && (
                      <div className="text-blue-900 font-semibold">
                        Estimated Distance: <strong>{distance} km</strong>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Your Quoted Transport Fee (MWK) *
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="5000"
                      required
                      value={quotedAmount}
                      onChange={(e) => setQuotedAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-900 text-sm focus:outline-blue-600"
                    />
                    {ratePerKm ? (
                      <p className="text-[11px] text-blue-700 font-medium mt-1">
                        Equivalent to approximately <strong>MWK {ratePerKm.toLocaleString()}/km</strong> for {distance} km.
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Notes on Price Quote &amp; Service Inclusions
                    </label>
                    <textarea
                      rows={2}
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      placeholder="e.g. Rate covers diesel, tarpaulins against rain, and 2 offloading assistants at warehouse."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setQuotingJobId(null)}
                      className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingQuote}
                      onClick={() => handleSubmitQuote(currentJob.id)}
                      className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingQuote ? 'Submitting Quote...' : 'Submit Quote to Farmer & Admin'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT VEHICLE & DRIVER CREDENTIALS                 */}
      {/* ======================================================== */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <Truck className="w-5 h-5 text-blue-700" />
                <span>Update Driver &amp; Vehicle Profile</span>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl">
                {profileMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Driving License Type *
                  </label>
                  <select
                    value={profileForm.licenseType}
                    onChange={(e) => setProfileForm({ ...profileForm, licenseType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white"
                  >
                    <option value="Class C (Heavy Commercial Vehicle)">Class C (Heavy Commercial Vehicle)</option>
                    <option value="Class CE (Articulated Freight Trailer)">Class CE (Articulated Freight Trailer)</option>
                    <option value="Class C1 (Medium Truck 3-16 Ton)">Class C1 (Medium Truck 3-16 Ton)</option>
                    <option value="Class B (Light Truck / Pickup)">Class B (Light Truck / Pickup)</option>
                    <option value="Class D (Passenger / Utility)">Class D (Passenger / Utility)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Driving Experience *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.yearsExperience}
                    onChange={(e) => setProfileForm({ ...profileForm, yearsExperience: e.target.value })}
                    placeholder="e.g. 8 years commercial haulage"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Vehicle Type *
                  </label>
                  <select
                    value={profileForm.vehicleType}
                    onChange={(e) => setProfileForm({ ...profileForm, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white"
                  >
                    {VEHICLE_TYPES.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Number Plate / Registration *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.plateNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, plateNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. BW 4921 / LL 8392"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 font-mono font-bold focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Max Payload Capacity (kg) *
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={profileForm.vehicleCapacityKg}
                    onChange={(e) => setProfileForm({ ...profileForm, vehicleCapacityKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Phone Number (Airtel / TNM) *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Current Route / Availability Note
                </label>
                <input
                  type="text"
                  value={profileForm.currentRoute}
                  onChange={(e) => setProfileForm({ ...profileForm, currentRoute: e.target.value })}
                  placeholder="e.g. Available at Lilongwe Depot or In Transit to Blantyre"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingProfile ? 'Saving to Cloud Firestore...' : 'Save Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: UPDATE CHECKPOINT LOCATION                        */}
      {/* ======================================================== */}
      {updatingJobId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-stone-900">Update Checkpoint GPS / Milestone</h3>
            <p className="text-xs text-stone-500 mt-1">
              Broadcasts current transit coordinates to the cargo owner and administrator.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Current Landmark / Highway Roadblock
                </label>
                <input
                  type="text"
                  placeholder="e.g. Linthipe Trading Centre, M1 Road"
                  value={currentLocationInput}
                  onChange={(e) => setCurrentLocationInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Estimated Arrival Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 hour 30 mins"
                  value={estimatedArrivalInput}
                  onChange={(e) => setEstimatedArrivalInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setUpdatingJobId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (updatingJobId) {
                    await handleUpdateStatus(
                      updatingJobId,
                      'in_transit',
                      currentLocationInput || 'In transit'
                    );
                    setUpdatingJobId(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
              >
                Broadcast Location Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
