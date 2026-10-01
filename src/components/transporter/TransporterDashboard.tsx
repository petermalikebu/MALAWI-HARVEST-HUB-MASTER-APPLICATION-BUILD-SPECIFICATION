import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { TransportJob } from '../../types/index.ts';
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
} from 'lucide-react';

export const TransporterDashboard: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();
  const { subscribe } = useRealtime();

  const [jobs, setJobs] = useState<TransportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');

  // Location update modal
  const [updatingJobId, setUpdatingJobId] = useState<number | null>(null);
  const [currentLocationInput, setCurrentLocationInput] = useState('');
  const [estimatedArrivalInput, setEstimatedArrivalInput] = useState('2 hours');

  const fetchJobs = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/transport/jobs?transporterUid=${currentUser.uid}`);
      if (res.ok) {
        setJobs(await res.json());
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
    const unsubReq = subscribe('transport_requested', () => fetchJobs());
    const unsubUp = subscribe('transport_updated', () => fetchJobs());
    return () => {
      unsubReq();
      unsubUp();
    };
  }, [subscribe]);

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
      if (res.ok) fetchJobs();
    } catch (err) {
      console.error('Failed to update transport status:', err);
    }
  };

  // Filter jobs
  const availableJobs = jobs.filter((j) => j.status === 'requested');
  const myActiveJobs = jobs.filter(
    (j) =>
      j.transporterUid === currentUser?.uid &&
      ['accepted', 'driver_assigned', 'picked_up', 'in_transit'].includes(j.status)
  );
  const myCompletedJobs = jobs.filter(
    (j) =>
      j.transporterUid === currentUser?.uid &&
      ['delivered', 'completed'].includes(j.status)
  );

  const totalEarnings = myCompletedJobs.reduce((sum, j) => sum + Number(j.transportFee), 0);

  return (
    <div className="space-y-6">
      {/* Transporter Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-800/60 text-blue-200 border border-blue-700/40">
              <Truck className="w-3.5 h-3.5" />
              <span>Commercial Freight & Rural Haulage &bull; Malawi Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Moni, {currentUser?.fullName}!
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Vehicle: <span className="font-semibold text-white">{currentUser?.vehicleType || 'Light Truck'}</span> &bull; Reg:{' '}
              <span className="font-semibold text-white">{currentUser?.vehicleRegistration || 'BW 4921'}</span> &bull; Capacity:{' '}
              <span className="font-semibold text-white">{(currentUser?.vehicleCapacityKg || 5000).toLocaleString()} kg</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
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
            <div className="text-xs text-blue-200 font-medium">Available Jobs</div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-300 mt-0.5">
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
            <div className="text-xs text-blue-200 font-medium">Deliveries Completed</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              {myCompletedJobs.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-blue-200 font-medium">Total Haulage Earnings</div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 mt-0.5">
              MWK {totalEarnings.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'available'
              ? 'bg-blue-100 text-blue-900'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Available Haulage Jobs ({availableJobs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-blue-100 text-blue-900'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Active In-Transit ({myActiveJobs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'bg-blue-100 text-blue-900'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Completed & Settled ({myCompletedJobs.length})</span>
        </button>
      </div>

      {/* TAB 1: AVAILABLE JOBS */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Open Freight Requests</h2>
            <span className="text-xs text-stone-500 font-medium">
              Accept jobs matching your vehicle capacity and preferred delivery corridor.
            </span>
          </div>

          {availableJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <Truck className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No open transport requests</h3>
              <p className="text-stone-500 text-xs mt-1">
                When buyers or farmers request transport for harvested commodities, jobs will appear here in real time.
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

      {/* TAB 2: ACTIVE IN-TRANSIT JOBS */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Active Delivery Missions</h2>
            <span className="text-xs text-stone-500 font-medium">
              Update delivery milestones to notify the farmer and buyer in real time.
            </span>
          </div>

          {myActiveJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <Navigation className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No active delivery jobs</h3>
              <p className="text-stone-500 text-xs mt-1">
                Accept open freight requests from the &quot;Available Haulage Jobs&quot; tab.
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
                      Fee: MWK {Number(job.transportFee).toLocaleString()}
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
                        {job.financeRecommendationNotes && (
                          <div className="text-[11px] text-blue-900 bg-blue-50/80 p-2 rounded-lg border border-blue-200/60 mt-1">
                            <span className="font-bold">Finance Admin Instructions: </span>
                            <span>{job.financeRecommendationNotes}</span>
                          </div>
                        )}
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
                        className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>1. Mark Goods Loaded & Picked Up</span>
                      </button>
                    )}

                    {job.status === 'picked_up' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'in_transit', 'En route via M1 Highway')}
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>2. Mark In Transit on Highway</span>
                      </button>
                    )}

                    {job.status === 'in_transit' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'delivered', 'Arrived at Buyer Warehouse')}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>3. Mark Delivered at Destination</span>
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

      {/* TAB 3: COMPLETED DELIVERIES */}
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
                        Delivered & Settled
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
                      MWK {Number(job.transportFee).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: UPDATE CHECKPOINT LOCATION */}
      {updatingJobId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-stone-900">Update Checkpoint GPS / Milestone</h3>
            <p className="text-xs text-stone-500 mt-1">
              Broadcasts current transit coordinates to the cargo owner.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Current Landmark / Roadblock
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
