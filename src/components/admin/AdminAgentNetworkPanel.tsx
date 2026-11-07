import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  MALAWI_DISTRICTS,
  NORTHERN_DISTRICTS,
  CENTRAL_DISTRICTS,
  SOUTHERN_DISTRICTS,
  getDistrictRegion,
  User,
  SmsBroadcast,
} from '../../types/index.ts';
import { safeParseJson, safeParseResponse } from '../../lib/api.ts';
import {
  Users,
  MessageSquare,
  Smartphone,
  Plus,
  Send,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  ShieldCheck,
  Building,
  Coins,
  Package,
  X,
  Phone,
} from 'lucide-react';

interface DistrictStat {
  district: string;
  region: string;
  agentCount: number;
  offlineFarmerCount: number;
  commodityCount: number;
  completedOrdersCount: number;
  totalSalesMwk: number;
}

export const AdminAgentNetworkPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'districts' | 'agents' | 'sms_broadcast'>('districts');
  const [loading, setLoading] = useState(true);

  // Data State
  const [districtsOverview, setDistrictsOverview] = useState<DistrictStat[]>([]);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [potentialApplicants, setPotentialApplicants] = useState<User[]>([]);
  const [broadcastsList, setBroadcastsList] = useState<SmsBroadcast[]>([]);

  // Feedback Notification Banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [districtSearch, setDistrictSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'all' | 'Northern' | 'Central' | 'Southern'>('all');

  // Modal: Assign User as District Agent
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState('');
  const [assignDistrict, setAssignDistrict] = useState('Zomba');
  const [assignAgentCode, setAssignAgentCode] = useState('AGT-ZOM-01');
  const [assignIncentiveRate, setAssignIncentiveRate] = useState<number>(0.01);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Modal / Form: Dispatch SMS Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState('Market Price & Seasonal Harvesting Update');
  const [broadcastDistrict, setBroadcastDistrict] = useState('All Districts');
  const [broadcastAudience, setBroadcastAudience] = useState<'all_farmers' | 'offline_farmers' | 'agents' | 'all'>('all_farmers');
  const [broadcastLanguage, setBroadcastLanguage] = useState<'ch' | 'en'>('ch');
  const [broadcastMessage, setBroadcastMessage] = useState(
    'MBERALINK CHIDZIWITSO: Mitengo ya msika ya mbewu za m\'chaka chino yasinthidwa. Funsani mlangizi wanu wa m\'boma kuti mudziwe mitengo yovomerezeka ya chimanga, mtedza, ndi mpunga.'
  );
  const [dispatchingBroadcast, setDispatchingBroadcast] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Fetch all overview data
  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Districts Overview
      const distRes = await fetch('/api/admin/districts-overview');
      if (distRes.ok) {
        const d = await safeParseJson(distRes, []);
        setDistrictsOverview(d);
      }

      // 2. Agents list & applicants
      const agentsRes = await fetch('/api/admin/agents');
      if (agentsRes.ok) {
        const a = await safeParseJson(agentsRes, { agents: [], potentialApplicants: [] });
        setAgentsList(a.agents || []);
        setPotentialApplicants(a.potentialApplicants || []);
        if (a.potentialApplicants?.length > 0 && !selectedUserUid) {
          setSelectedUserUid(a.potentialApplicants[0].uid);
        }
      }

      // 3. Broadcasts list
      const bRes = await fetch('/api/admin/sms-broadcasts');
      if (bRes.ok) {
        const b = await safeParseJson(bRes, []);
        setBroadcastsList(b);
      }
    } catch (err) {
      console.error('Failed to load admin agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const unsubUser = subscribe('USER_UPDATED', () => fetchData());
    const unsubFarmer = subscribe('OFFLINE_FARMER_REGISTERED', () => fetchData());
    const unsubBcast = subscribe('SMS_BROADCAST_SENT', () => fetchData());
    return () => {
      unsubUser();
      unsubFarmer();
      unsubBcast();
    };
  }, [subscribe]);

  // Handle Assign Agent
  const handleAssignAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);
    if (!selectedUserUid || !assignDistrict) {
      setAssignError('Please select a user and assign a district.');
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch('/api/admin/agents/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: selectedUserUid,
          assignedDistrict: assignDistrict,
          agentCode: assignAgentCode.trim() || `AGT-${assignDistrict.slice(0, 3).toUpperCase()}-01`,
          agentIncentiveRate: assignIncentiveRate,
          adminUid: currentUser?.uid,
          adminName: currentUser?.fullName,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setShowAssignModal(false);
        setFeedback({
          type: 'success',
          message: parsed.data.message || 'Agent assigned successfully!',
        });
        setTimeout(() => setFeedback(null), 5000);
        fetchData();
      } else {
        setAssignError(parsed.error || 'Failed to assign agent');
      }
    } catch (err: any) {
      setAssignError(err.message || 'Error assigning agent');
    } finally {
      setAssigning(false);
    }
  };

  // Handle Dispatch Broadcast
  const handleDispatchBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastError(null);
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setBroadcastError('Title and SMS message text are required.');
      return;
    }

    setDispatchingBroadcast(true);
    try {
      const res = await fetch('/api/admin/sms-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          targetDistrict: broadcastDistrict,
          targetAudience: broadcastAudience,
          messageText: broadcastMessage.trim(),
          language: broadcastLanguage,
          adminUid: currentUser?.uid,
          adminName: currentUser?.fullName,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setFeedback({
          type: 'success',
          message: parsed.data.message || 'SMS broadcast dispatched successfully!',
        });
        setTimeout(() => setFeedback(null), 6000);
        fetchData();
      } else {
        setBroadcastError(parsed.error || 'Failed to dispatch broadcast');
      }
    } catch (err: any) {
      setBroadcastError(err.message || 'Error dispatching broadcast');
    } finally {
      setDispatchingBroadcast(false);
    }
  };

  // Filtered Districts
  const filteredDistricts = districtsOverview.filter((d) => {
    if (regionFilter !== 'all' && d.region !== regionFilter) return false;
    if (districtSearch.trim() && !d.district.toLowerCase().includes(districtSearch.toLowerCase())) return false;
    return true;
  });

  // Calculate totals
  const totalAgents = districtsOverview.reduce((acc, d) => acc + d.agentCount, 0);
  const totalOfflineFarmers = districtsOverview.reduce((acc, d) => acc + d.offlineFarmerCount, 0);
  const totalProduceListed = districtsOverview.reduce((acc, d) => acc + d.commodityCount, 0);
  const totalSalesVolume = districtsOverview.reduce((acc, d) => acc + d.totalSalesMwk, 0);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 border shadow-md ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-stone-900 rounded-3xl p-6 text-white shadow-md border border-emerald-800/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <Users className="w-3.5 h-3.5" />
              <span>National Rural Agent Network &bull; Digital Inclusion Command</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              District Agricultural Agent Network &amp; SMS Console
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Supervise all 28 districts of Malawi. Verify and appoint district agents, monitor offline farmer registrations, oversee agent-managed produce, and broadcast administrative SMS announcements to keypad phone users nationwide.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Refresh Network Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-stone-950" />
              <span>Assign District Agent</span>
            </button>
          </div>
        </div>

        {/* Statistical Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-800/60 text-xs">
          <div className="bg-emerald-900/40 p-3 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase">Total Appointed Agents</div>
            <div className="text-xl font-black text-white mt-0.5">{totalAgents}</div>
            <div className="text-[10px] text-stone-300">Across 28 districts</div>
          </div>
          <div className="bg-emerald-900/40 p-3 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase">Keypad Farmers Onboarded</div>
            <div className="text-xl font-black text-white mt-0.5">{totalOfflineFarmers}</div>
            <div className="text-[10px] text-stone-300">Unique Farmer IDs active</div>
          </div>
          <div className="bg-emerald-900/40 p-3 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase">Agent-Managed Listings</div>
            <div className="text-xl font-black text-white mt-0.5">{totalProduceListed}</div>
            <div className="text-[10px] text-stone-300">Live on marketplace</div>
          </div>
          <div className="bg-emerald-900/40 p-3 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase">Total Offline Farmer Sales</div>
            <div className="text-xl font-black text-white mt-0.5">MWK {totalSalesVolume.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-300 font-bold">100% Escrow protected</div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab('districts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'districts'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>All 28 Malawi Districts ({districtsOverview.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'agents'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Appointed Agents Directory ({agentsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sms_broadcast')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'sms_broadcast'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>SMS Broadcast Console ({broadcastsList.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: ALL 28 DISTRICTS OVERVIEW */}
      {activeTab === 'districts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search district name..."
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-semibold"
              >
                <option value="all">All Regions</option>
                <option value="Northern">Northern Region</option>
                <option value="Central">Central Region</option>
                <option value="Southern">Southern Region</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">District</th>
                    <th className="py-3 px-4">Region</th>
                    <th className="py-3 px-4 text-center">Active Agents</th>
                    <th className="py-3 px-4 text-center">Offline Farmers</th>
                    <th className="py-3 px-4 text-center">Listed Produce</th>
                    <th className="py-3 px-4 text-right">Total Farmer Sales (MWK)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredDistricts.map((d) => (
                    <tr key={d.district} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-900 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{d.district}</span>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{d.region}</td>
                      <td className="py-3 px-4 text-center font-bold">
                        {d.agentCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px]">
                            {d.agentCount} Agent{d.agentCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">0 (Needs Agent)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-stone-800">
                        {d.offlineFarmerCount}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-stone-800">
                        {d.commodityCount}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-800">
                        MWK {d.totalSalesMwk.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setAssignDistrict(d.district);
                            setShowAssignModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-bold transition-colors"
                        >
                          + Assign Agent
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: APPOINTED AGENTS DIRECTORY */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex items-center justify-between text-xs">
            <span className="text-stone-600">
              Authorized Mberalink District Agents assisting rural farmers without smartphones across Malawi.
            </span>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Assign New Agent</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentsList.map((ag) => (
              <div
                key={ag.uid}
                className="bg-white rounded-2xl border border-stone-200 p-4.5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        {ag.agentCode || 'AGT'}
                      </span>
                      <h3 className="text-base font-bold text-stone-900 mt-1">{ag.fullName}</h3>
                      <p className="text-xs text-stone-500">{ag.email}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVE
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5 font-bold text-stone-800">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Assigned District: <strong>{ag.assignedDistrict || ag.district}</strong>
                      </span>
                    </div>

                    {ag.phoneNumber && (
                      <div className="flex items-center gap-1.5 font-mono text-stone-700">
                        <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{ag.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span>Incentive: {(Number(ag.agentIncentiveRate || 0.01) * 100).toFixed(1)}%</span>
                  <span className="font-semibold text-emerald-700">Authorized Agent</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SMS BROADCAST CONSOLE */}
      {activeTab === 'sms_broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Create Broadcast */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4 text-xs">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-700" />
                <span>Dispatch Administrator SMS Announcement</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Send official alerts to keypad farmers and district agents without internet access.
              </p>
            </div>

            {broadcastError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{broadcastError}</span>
              </div>
            )}

            <form onSubmit={handleDispatchBroadcast} className="space-y-4">
              <div>
                <label className="block text-stone-700 font-bold mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zomba District Kilombero Rice Market Surge"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Target District *</label>
                  <select
                    value={broadcastDistrict}
                    onChange={(e) => setBroadcastDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-semibold"
                  >
                    <option value="All Districts">All 28 Districts (Nationwide)</option>
                    {MALAWI_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d} District only
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">Recipient Group *</label>
                  <select
                    value={broadcastAudience}
                    onChange={(e) => setBroadcastAudience(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-semibold"
                  >
                    <option value="all_farmers">All Registered Farmers</option>
                    <option value="offline_farmers">Offline (Keypad) Farmers Only</option>
                    <option value="agents">Authorized District Agents Only</option>
                    <option value="all">Everyone in Target District</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">SMS Language</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBroadcastLanguage('ch')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      broadcastLanguage === 'ch'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    Chichewa (National)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastLanguage('en')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      broadcastLanguage === 'en'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-700 font-bold">SMS Message Body *</label>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {broadcastMessage.length} characters (approx {Math.ceil(broadcastMessage.length / 160)} SMS)
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type official SMS announcement text..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-mono text-xs"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: 'Price Surge Alert',
                      text: `MBERALINK CHIDZIWITSO: Mtengo wa Mpunga wa Kilombero m'boma la Zomba wafika pa MWK 1,850/kg sabata ino. Alimi omwe ali ndi mpunga wokonzeka akambirane ndi alangizi awo a Mberalink.`,
                    },
                    {
                      label: 'Moisture Standard Reminder',
                      text: `MBERALINK ANNOUNCEMENT: Maintain grain moisture below 13% for maize and 7.5% for groundnuts to qualify for Grade A buyer premium prices at commercial depots.`,
                    },
                    {
                      label: 'Commission Rate Update',
                      text: `MBERALINK NOTICE: Platform transaction commission fee has been synchronized. Payouts to farmer accounts remain 100% transparent with zero hidden deductions.`,
                    },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBroadcastMessage(preset.text)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-50 text-[10px] font-semibold text-stone-700 hover:text-emerald-800 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={dispatchingBroadcast}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>{dispatchingBroadcast ? 'Dispatching Broadcast...' : 'Broadcast SMS Announcement'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right List: Broadcast History */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4 text-xs">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900">SMS Broadcast History</h3>
              <span className="text-[11px] text-stone-500">{broadcastsList.length} broadcasts</span>
            </div>

            {broadcastsList.length === 0 ? (
              <div className="text-center py-12 text-stone-400">No broadcasts dispatched yet.</div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {broadcastsList.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                          {b.broadcastId}
                        </span>
                        <h4 className="font-bold text-stone-900 text-xs mt-1">{b.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {b.recipientCount} Recipients
                      </span>
                    </div>

                    <p className="font-mono text-[11px] text-stone-700 bg-white p-2 rounded-xl border border-stone-150 leading-relaxed">
                      {b.messageText}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span>Target: {b.targetDistrict}</span>
                      <span>By: {b.sentByAdminName}</span>
                      <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN USER AS DISTRICT AGENT */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Assign District Agent</h3>
                  <p className="text-[11px] text-stone-500">Appoint authorized representative for district</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignAgent} className="space-y-4">
              <div>
                <label className="block text-stone-700 font-bold mb-1">Select User (Applicant / Transporter) *</label>
                <select
                  value={selectedUserUid}
                  onChange={(e) => setSelectedUserUid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-semibold"
                >
                  {potentialApplicants.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.fullName} ({u.role.toUpperCase()}) &bull; {u.email || u.phoneNumber} &bull; {u.district}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Assign to District *</label>
                <select
                  value={assignDistrict}
                  onChange={(e) => {
                    setAssignDistrict(e.target.value);
                    setAssignAgentCode(`AGT-${e.target.value.slice(0, 3).toUpperCase()}-01`);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-semibold"
                >
                  {MALAWI_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d} District ({getDistrictRegion(d)} Region)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Agent Identification Code</label>
                  <input
                    type="text"
                    value={assignAgentCode}
                    onChange={(e) => setAssignAgentCode(e.target.value)}
                    placeholder="e.g. AGT-ZOM-01"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Incentive Rate (Commission)</label>
                  <select
                    value={assignIncentiveRate}
                    onChange={(e) => setAssignIncentiveRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold"
                  >
                    <option value={0.01}>1.0% per completed sale</option>
                    <option value={0.015}>1.5% per completed sale</option>
                    <option value={0.02}>2.0% per completed sale</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-150 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Approve & Assign Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
