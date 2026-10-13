import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { Commodity, Order, Category, MALAWI_DISTRICTS, getDistrictRegion } from '../../types/index.ts';
import { safeParseJson, safeParseResponse } from '../../lib/api.ts';
import {
  Sprout,
  Plus,
  Package,
  CheckCircle,
  XCircle,
  Truck,
  TrendingUp,
  MapPin,
  Calendar,
  AlertCircle,
  ChevronRight,
  Archive,
  RefreshCw,
  Upload,
  Image,
  HelpCircle,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { FarmerTransportHire } from './FarmerTransportHire.tsx';
import { compressImageFile } from '../../lib/imageCompressor.ts';
import { SupportQueriesDesk } from '../support/SupportQueriesDesk.tsx';

export const FarmerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commodities' | 'orders' | 'earnings' | 'hire_transport' | 'queries'>('commodities');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [newCommodity, setNewCommodity] = useState({
    commodityName: '',
    category: 'Maize',
    quantity: 1000,
    unit: 'kg',
    pricePerUnit: 650,
    district: currentUser?.district || 'Mchinji',
    location: currentUser?.tradingArea || 'Kapiri Trading Centre',
    quality: 'Grade A - Premium Cleaned & Dried',
    availabilityDate: new Date().toISOString().split('T')[0],
    description: '',
    imageUrl: '', // Farmer adds picture of what they are selling
  });

  // Decline order dialog state
  const [declineOrderId, setDeclineOrderId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState('Stock committed to local community harvest');

  // Transport request dialog state
  const [transportOrderId, setTransportOrderId] = useState<number | null>(null);
  const [transportFeeOffer, setTransportFeeOffer] = useState(30000);
  const [vehicleTypeNeeded, setVehicleTypeNeeded] = useState('Medium Truck (5-7 Ton)');

  // Delete commodity dialog state
  const [deletingCommodity, setDeletingCommodity] = useState<Commodity | null>(null);
  const [isDeletingComm, setIsDeletingComm] = useState(false);

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [commRes, ordRes, catRes] = await Promise.all([
        fetch(`/api/commodities?farmerUid=${currentUser.uid}`),
        fetch(`/api/orders?farmerUid=${currentUser.uid}`),
        fetch('/api/categories'),
      ]);

      if (commRes.ok) setCommodities(await safeParseJson(commRes, []));
      if (ordRes.ok) setOrders(await safeParseJson(ordRes, []));
      if (catRes.ok) setCategories(await safeParseJson(catRes, []));
    } catch (err) {
      console.error('Error fetching farmer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Real-time listener for orders and commodities
  useEffect(() => {
    const unsubOrder = subscribe('order_created', () => fetchData());
    const unsubOrderUp = subscribe('order_updated', () => fetchData());
    const unsubComm = subscribe('commodity_updated', () => fetchData());

    return () => {
      unsubOrder();
      unsubOrderUp();
      unsubComm();
    };
  }, [subscribe]);

  const handleAddCommodity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    setErrorMessage('');

    if (!newCommodity.imageUrl.trim()) {
      setErrorMessage('Please add or upload a picture of the commodity you are selling.');
      setSubmitting(false);
      return;
    }

    try {
      const commodityRegion = currentUser.region || getDistrictRegion(newCommodity.district) || 'Central';
      const res = await fetch('/api/commodities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerUid: currentUser.uid,
          region: commodityRegion,
          ...newCommodity,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to list commodity');
      }

      setShowAddModal(false);
      // Reset form
      setNewCommodity({
        commodityName: '',
        category: 'Maize',
        quantity: 1000,
        unit: 'kg',
        pricePerUnit: 650,
        district: currentUser.district || 'Mchinji',
        location: currentUser.tradingArea || 'Kapiri Trading Centre',
        quality: 'Grade A - Premium Cleaned & Dried',
        availabilityDate: new Date().toISOString().split('T')[0],
        description: '',
        imageUrl: '',
      });
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPurchase = async (orderId: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/farmer-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerUid: currentUser?.uid,
          farmerName: currentUser?.fullName,
        }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to confirm purchase:', err);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerUid: currentUser?.uid }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Failed to accept order:', err);
    }
  };

  const handleDeclineOrder = async () => {
    if (!declineOrderId) return;
    try {
      const res = await fetch(`/api/orders/${declineOrderId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerUid: currentUser?.uid,
          reason: declineReason,
        }),
      });
      if (res.ok) {
        setDeclineOrderId(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to decline order:', err);
    }
  };

  const handleRequestTransport = async () => {
    if (!transportOrderId) return;
    try {
      const res = await fetch(`/api/orders/${transportOrderId}/request-transport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser?.uid,
          requiredVehicleType: vehicleTypeNeeded,
          transportFee: transportFeeOffer,
        }),
      });
      if (res.ok) {
        setTransportOrderId(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to request transport:', err);
    }
  };

  const handleArchiveListing = async (commId: number) => {
    if (!confirm('Are you sure you want to deactivate and close this commodity listing?')) return;
    try {
      const res = await fetch(`/api/commodities/${commId}?userUid=${currentUser?.uid}&action=archive`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      } else {
        const parsed = await safeParseResponse(res);
        alert(parsed.error || 'Failed to archive listing');
      }
    } catch (err) {
      console.error('Failed to archive listing:', err);
    }
  };

  const handleDeleteCommodity = async () => {
    if (!deletingCommodity || !currentUser) return;
    setIsDeletingComm(true);
    try {
      const res = await fetch(`/api/commodities/${deletingCommodity.id}?userUid=${currentUser.uid}`, {
        method: 'DELETE',
      });
      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to remove product');
      }
      setDeletingCommodity(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error removing product');
    } finally {
      setIsDeletingComm(false);
    }
  };

  // Financial metrics
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const totalGrossEarnings = completedOrders.reduce((sum, o) => sum + Number(o.commoditySubtotal), 0);
  const totalCommissionPaid = completedOrders.reduce((sum, o) => sum + Number(o.platformCommissionFee), 0);
  const totalNetEarnings = totalGrossEarnings - totalCommissionPaid;
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Farmer Intro */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/60 text-emerald-200 border border-emerald-600/40">
              <Sprout className="w-3.5 h-3.5" />
              <span>Smallholder Farmer Portal &bull; Direct Farmgate Trade</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Moni, {currentUser?.fullName}!
            </h1>
            <p className="text-emerald-100 text-sm leading-relaxed">
              District: <span className="font-semibold text-white">{currentUser?.district}</span> &bull; Trading Center: <span className="font-semibold text-white">{currentUser?.tradingArea || 'Central Market'}</span>. Your commodities are broadcast live to commercial buyers across Malawi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-sm shadow-md hover:bg-emerald-50 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>List New Commodity</span>
            </button>
            <button
              onClick={() => setActiveTab('hire_transport')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-sm shadow-md hover:bg-blue-800 transition-all active:scale-95"
            >
              <Truck className="w-4 h-4 text-blue-200" />
              <span>Hire Transporter</span>
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-emerald-700/50 hover:bg-emerald-700 text-emerald-100 transition-colors"
              title="Refresh from PostgreSQL"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-emerald-700/60">
          <div>
            <div className="text-xs text-emerald-200 font-medium">Active Listings</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              {commodities.filter((c) => c.status === 'available').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-emerald-200 font-medium">Pending Orders</div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-300 mt-0.5">
              {pendingOrdersCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-emerald-200 font-medium">Total Net Earnings</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              MWK {totalNetEarnings.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-emerald-200 font-medium">Fixed Commission</div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 mt-0.5">
              4.0%
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('commodities')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'commodities'
              ? 'bg-emerald-100 text-emerald-900'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>My Commodity Listings ({commodities.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 relative shrink-0 ${
            activeTab === 'orders'
              ? 'bg-emerald-100 text-emerald-900'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Incoming Buyer Orders ({orders.length})</span>
          {pendingOrdersCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('hire_transport')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'hire_transport'
              ? 'bg-blue-100 text-blue-900'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Truck className="w-4 h-4 text-blue-700" />
          <span>Hire Transporter & Driver Escrow</span>
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'earnings'
              ? 'bg-emerald-100 text-emerald-900'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <span>Sales & Wallet Settlement</span>
        </button>
        <button
          onClick={() => setActiveTab('queries')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'queries'
              ? 'bg-emerald-100 text-emerald-900 font-extrabold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-700" />
          <span>Queries &amp; Suggestions to Admin</span>
        </button>
      </div>

      {/* TAB 1: COMMODITIES LISTING */}
      {activeTab === 'commodities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Your Agricultural Inventory</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Listing</span>
            </button>
          </div>

          {commodities.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <Package className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No commodities listed yet</h3>
              <p className="text-stone-500 text-xs mt-1 max-w-sm mx-auto">
                Add your harvested crops (Maize, Rice, Groundnuts, Beans, Potatoes) to begin receiving verified purchase offers.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800"
              >
                Create First Listing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {commodities.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="h-44 relative bg-stone-100">
                    <img
                      src={c.imageUrl || 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80'}
                      alt={c.commodityName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          c.status === 'available'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : c.status === 'sold_out'
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-500 text-white'
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[11px] font-medium">
                      {c.category}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-stone-900 text-base leading-tight">
                        {c.commodityName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          {c.location}, {c.district}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-emerald-800 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                        {c.quality}
                      </div>
                      {c.description && (
                        <p className="text-xs text-stone-600 mt-2 line-clamp-2 leading-relaxed">
                          {c.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-end justify-between">
                      <div>
                        <div className="text-[11px] text-stone-400 font-medium">Available Quantity</div>
                        <div className="text-lg font-extrabold text-stone-900">
                          {c.quantity.toLocaleString()} <span className="text-xs font-semibold text-stone-500">{c.unit}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-stone-400 font-medium">Unit Price</div>
                        <div className="text-lg font-extrabold text-emerald-700">
                          MWK {Number(c.pricePerUnit).toLocaleString()}
                          <span className="text-xs font-medium text-stone-500">/{c.unit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="text-stone-400 text-[11px]">
                        Available: {c.availabilityDate}
                      </span>
                      <div className="flex items-center gap-2">
                        {c.status === 'available' && (
                          <button
                            type="button"
                            onClick={() => handleArchiveListing(c.id)}
                            className="text-stone-500 hover:text-stone-800 hover:bg-stone-100 px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition-colors text-xs"
                            title="Deactivate listing temporarily"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Close</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeletingCommodity(c)}
                          className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all text-xs"
                          title="Permanently remove this product from the marketplace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Product</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INCOMING ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Incoming Buyer Orders & Contracts</h2>
            <span className="text-xs text-stone-500 font-medium">
              Accepting reserves inventory; declining immediately releases stock.
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <TrendingUp className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No orders received yet</h3>
              <p className="text-stone-500 text-xs mt-1 max-w-sm mx-auto">
                When wholesale buyers purchase from your inventory, their order details will appear here with delivery location and escrow details.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const isPending = o.status === 'pending';
                const isAccepted = o.status === 'accepted';
                const isCompleted = o.status === 'completed';
                const isDeclined = o.status === 'declined' || o.status === 'cancelled';

                return (
                  <div
                    key={o.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-stone-500">
                          {o.orderNumber}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                            isPending
                              ? 'bg-amber-100 text-amber-800'
                              : isAccepted
                              ? 'bg-blue-100 text-blue-800'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDeclined
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {o.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-stone-400">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-stone-900 text-base">
                          {o.quantity.toLocaleString()} {o.unit} &bull; {o.commodityName}
                        </h4>
                        <p className="text-xs text-stone-600 mt-0.5">
                          Buyer: <span className="font-semibold text-stone-800">{o.buyerName}</span> ({o.buyerPhone || 'Contact on file'})
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600 pt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>Delivery to: {o.deliveryLocation}, {o.deliveryDistrict}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>Required by: {o.deliveryDate}</span>
                        </div>
                      </div>

                      {o.cancellationReason && (
                        <div className="text-xs bg-rose-50 text-rose-700 p-2 rounded-lg border border-rose-100">
                          <strong>Cancellation Reason:</strong> {o.cancellationReason}
                        </div>
                      )}
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 min-w-[220px] text-right space-y-1">
                      <div className="text-[11px] text-stone-500">Gross Commodity Value</div>
                      <div className="text-lg font-extrabold text-stone-900">
                        MWK {Number(o.commoditySubtotal).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Platform Fee (4%):{' '}
                        <span className="text-rose-600 font-medium">
                          -MWK {Number(o.platformCommissionFee).toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-stone-200 text-xs font-bold text-emerald-800">
                        Net Farmer Payout: MWK {(Number(o.commoditySubtotal) - Number(o.platformCommissionFee)).toLocaleString()}
                      </div>
                    </div>

                    {/* Escrow Status & Action Buttons */}
                    <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 min-w-[200px]">
                      {/* Payment Verification by Finance Alert */}
                      {o.paymentStatus === 'escrow_pending_finance_approval' && (
                        <div className="text-[11px] p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-tight">
                          <span className="font-bold block text-amber-800 mb-0.5">Payment Verification Pending</span>
                          Financial Admin is verifying buyer deposit on {o.paymentMethod || 'Escrow'}.
                        </div>
                      )}

                      {/* Escrow Verified - Farmer Confirmation Step */}
                      {o.paymentStatus === 'escrow_held' && !o.farmerConfirmedAt && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Payment Verified in Escrow!</span>
                          </div>
                          <button
                            onClick={() => handleConfirmPurchase(o.id)}
                            className="w-full px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Confirm Purchase</span>
                          </button>
                        </div>
                      )}

                      {o.farmerConfirmedAt && o.paymentStatus !== 'disbursed_to_farmer' && (
                        <div className="text-[11px] px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                          <span>Fulfillment Confirmed &bull; Payout Pending Transit/Delivery</span>
                        </div>
                      )}

                      {o.paymentStatus === 'disbursed_to_farmer' && (
                        <div className="text-[11px] p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-medium space-y-1">
                          <div className="font-extrabold text-emerald-800 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>🎉 Payout Disbursed to You!</span>
                          </div>
                          <div>
                            Financial Administrator sent <strong>MWK {(Number(o.commoditySubtotal) - Number(o.platformCommissionFee)).toLocaleString()}</strong> (Ref: {o.disbursedRef || 'Settled'}).
                          </div>
                        </div>
                      )}

                      {isPending && o.paymentStatus !== 'escrow_held' && (
                        <>
                          <button
                            onClick={() => handleAcceptOrder(o.id)}
                            className="flex-1 lg:flex-initial px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Accept Order</span>
                          </button>
                          <button
                            onClick={() => setDeclineOrderId(o.id)}
                            className="flex-1 lg:flex-initial px-4 py-2 rounded-xl bg-white border border-stone-300 text-rose-700 font-bold text-xs hover:bg-rose-50 flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Decline</span>
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <button
                          onClick={() => setTransportOrderId(o.id)}
                          className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Request Transporter</span>
                        </button>
                      )}

                      {o.paymentStatus === 'disbursed_to_farmer' && (
                        <div className="text-xs font-bold text-emerald-800 bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-300 text-center flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-emerald-700" />
                            <span>Funds Disbursed to You</span>
                          </div>
                          {o.disbursedRef && (
                            <span className="text-[10px] text-emerald-700 font-mono mt-0.5">Ref: {o.disbursedRef}</span>
                          )}
                        </div>
                      )}

                      {isCompleted && o.paymentStatus !== 'disbursed_to_farmer' && (
                        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 text-center flex items-center justify-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>Settled & Paid</span>
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

      {/* TAB 3: EARNINGS & SETTLEMENT */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                Gross Completed Sales
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-2">
                MWK {totalGrossEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-stone-500 mt-1">Total commodity value across completed trades</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs text-rose-600 font-bold uppercase tracking-wider">
                Platform Commission (4%)
              </div>
              <div className="text-2xl font-extrabold text-rose-600 mt-2">
                MWK {totalCommissionPaid.toLocaleString()}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                4% facilitation fee supporting quality verification & escrow
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
                Net Disbursed to Farmer
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-2">
                MWK {totalNetEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-stone-500 mt-1">Paid directly via Airtel Money / TNM Mpamba</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-700" />
              <span>Smallholder Farmer Economic Advantage</span>
            </h3>
            <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
              Traditional vendors and informal middlemen in rural districts routinely deduct 25% to 35% from farmgate prices. By trading on Malawi Harvest Hub with transparent grade standards and a capped 4% platform commission, you retain an estimated <strong>+22% extra net surplus</strong> on every bag of produce sold.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: HIRE TRANSPORTER & DRIVER ESCROW */}
      {activeTab === 'hire_transport' && (
        <FarmerTransportHire onJobCreated={fetchData} />
      )}

      {/* TAB 5: QUERIES & SUGGESTIONS DESK */}
      {activeTab === 'queries' && (
        <SupportQueriesDesk />
      )}

      {/* MODAL: ADD COMMODITY LISTING */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">List New Commodity</h3>
                  <p className="text-xs text-stone-500">Post crops to Malawi Harvest Hub</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg p-1"
              >
                &times;
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAddCommodity} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Commodity Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kilombero Super Rice"
                    value={newCommodity.commodityName}
                    onChange={(e) =>
                      setNewCommodity({ ...newCommodity, commodityName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newCommodity.category}
                    onChange={(e) =>
                      setNewCommodity({ ...newCommodity, category: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  >
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Maize">Maize</option>
                        <option value="Rice">Rice</option>
                        <option value="Beans">Beans</option>
                        <option value="Groundnuts">Groundnuts</option>
                        <option value="Soybeans">Soybeans</option>
                        <option value="Tomatoes">Tomatoes</option>
                        <option value="Potatoes">Potatoes</option>
                        <option value="Cassava">Cassava</option>
                        <option value="Vegetables">Vegetables</option>
                        <option value="Fruits">Fruits</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCommodity.quantity}
                    onChange={(e) =>
                      setNewCommodity({ ...newCommodity, quantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Unit</label>
                  <select
                    value={newCommodity.unit}
                    onChange={(e) =>
                      setNewCommodity({ ...newCommodity, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="50kg bag">50kg Bag</option>
                    <option value="Ton">Metric Ton</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Price (MWK/{newCommodity.unit}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCommodity.pricePerUnit}
                    onChange={(e) =>
                      setNewCommodity({ ...newCommodity, pricePerUnit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    District *
                  </label>
                  <select
                    value={newCommodity.district}
                    onChange={(e) =>
                      setNewCommodity({ ...newCommodity, district: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  >
                    {MALAWI_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Pickup Location / Depot *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kapiri Grain Depot"
                    value={newCommodity.location}
                    onChange={(e) =>
                      setNewCommodity({ ...newCommodity, location: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Quality / Grade
                  </label>
                  <select
                    value={newCommodity.quality}
                    onChange={(e) =>
                      setNewCommodity({ ...newCommodity, quality: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  >
                    <option value="Grade A - Premium Cleaned & Dried">Grade A - Premium Cleaned & Dried</option>
                    <option value="Grade B - Standard Market Produce">Grade B - Standard Market Produce</option>
                    <option value="Grade C - Processing / Feed Stock">Grade C - Processing / Feed Stock</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Availability Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newCommodity.availabilityDate}
                    onChange={(e) =>
                      setNewCommodity({ ...newCommodity, availabilityDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Upload Picture of Produce Being Sold */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Produce Picture (Photo of what you are selling) *
                </label>
                {newCommodity.imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 group">
                    <img
                      src={newCommodity.imageUrl}
                      alt="Crop Preview"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCommodity({ ...newCommodity, imageUrl: '' })}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all"
                      >
                        Remove / Replace Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-stone-50/50 hover:bg-emerald-50/30 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
                            setNewCommodity({
                              ...newCommodity,
                              imageUrl: compressed,
                            });
                          } catch {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setNewCommodity({
                                ...newCommodity,
                                imageUrl: reader.result as string,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 mb-1.5">
                        <Upload className="w-5 h-5 text-emerald-700" />
                      </div>
                      <span className="text-xs font-bold text-stone-800">
                        Choose photo of your produce
                      </span>
                      <span className="text-[11px] text-stone-400">
                        Take or select a picture of your harvest from phone or computer
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-stone-400">Or Image URL:</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newCommodity.imageUrl}
                        onChange={(e) =>
                          setNewCommodity({ ...newCommodity, imageUrl: e.target.value })
                        }
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Description & Storage Conditions
                </label>
                <textarea
                  rows={2}
                  placeholder="Details on moisture content, bagging, harvest date..."
                  value={newCommodity.description}
                  onChange={(e) =>
                    setNewCommodity({ ...newCommodity, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                />
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish to Marketplace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DECLINE ORDER */}
      {declineOrderId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-stone-900">Decline Order</h3>
            <p className="text-xs text-stone-500 mt-1">
              Stock will be immediately returned to your available inventory and the buyer notified.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Reason for Declining *
              </label>
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-rose-600"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeclineOrderId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Back
              </button>
              <button
                onClick={handleDeclineOrder}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Confirm Decline & Restore Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST TRANSPORT */}
      {transportOrderId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Truck className="w-5 h-5" />
              <h3 className="text-base font-bold text-stone-900">Request Transporter</h3>
            </div>
            <p className="text-xs text-stone-500">
              Broadcasts transport job to verified transporters across the delivery route.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Required Vehicle Type
                </label>
                <select
                  value={vehicleTypeNeeded}
                  onChange={(e) => setVehicleTypeNeeded(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600 bg-white"
                >
                  <option value="Pickup (1-2 Ton)">Pickup (1-2 Ton)</option>
                  <option value="Light Truck (3-5 Ton)">Light Truck (3-5 Ton)</option>
                  <option value="Medium Truck (5-7 Ton)">Medium Truck (5-7 Ton)</option>
                  <option value="Heavy Truck (10-15 Ton)">Heavy Truck (10-15 Ton)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Offered Transport Fee (MWK)
                </label>
                <input
                  type="number"
                  min="5000"
                  step="1000"
                  value={transportFeeOffer}
                  onChange={(e) => setTransportFeeOffer(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-blue-600"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setTransportOrderId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestTransport}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl"
              >
                Broadcast Transport Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Commodity Confirmation Modal */}
      {deletingCommodity && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-stone-900 text-base">Remove Product Listing</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Are you sure you want to permanently remove <strong className="text-stone-900">{deletingCommodity.commodityName}</strong> ({deletingCommodity.quantity} {deletingCommodity.unit}) from your inventory and the live marketplace?
              </p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl text-stone-600 text-xs space-y-1.5 border border-stone-200/80">
              <div className="flex justify-between">
                <span className="text-stone-500">Commodity:</span>
                <span className="font-bold text-stone-900">{deletingCommodity.commodityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Unit Price:</span>
                <span className="font-semibold text-emerald-800">MWK {Number(deletingCommodity.pricePerUnit).toLocaleString()}/{deletingCommodity.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Location:</span>
                <span>{deletingCommodity.district} &bull; {deletingCommodity.region}</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
              Notice: This action will completely remove this product from wholesale buyers' view across all 28 districts on Malawi Harvest Hub.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingCommodity(null)}
                disabled={isDeletingComm}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCommodity}
                disabled={isDeletingComm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingComm ? 'Removing Product...' : 'Confirm Remove Product'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
