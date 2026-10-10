import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { Order } from '../../types/index.ts';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Archive,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const BuyerOrders: React.FC = () => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Controlled cancel modal
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('Found alternate supply in local market');
  const [cancelling, setCancelling] = useState(false);

  // Request transport modal
  const [transportOrderId, setTransportOrderId] = useState<number | null>(null);
  const [transportFee, setTransportFee] = useState(30000);
  const [vehicleType, setVehicleType] = useState('Medium Truck (5-7 Ton)');

  const fetchOrders = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/orders?buyerUid=${currentUser.uid}`);
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch buyer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentUser]);

  useEffect(() => {
    const unsubOrder = subscribe('order_updated', () => fetchOrders());
    const unsubCreated = subscribe('order_created', () => fetchOrders());
    const unsubTransport = subscribe('transport_updated', () => fetchOrders());
    return () => {
      unsubOrder();
      unsubCreated();
      unsubTransport();
    };
  }, [subscribe]);

  const handleConfirmDelivery = async (orderId: number) => {
    if (!confirm('Confirm that all commodities arrived in good condition? This will release escrow funds to the farmer and transporter.')) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser?.uid,
          userName: currentUser?.fullName,
          userRole: currentUser?.role,
        }),
      });
      if (res.ok) fetchOrders();
    } catch (err) {
      console.error('Failed to confirm delivery:', err);
    }
  };

  const handleExecuteCancel = async () => {
    if (!cancelOrderId) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${cancelOrderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser?.uid,
          userName: currentUser?.fullName,
          userRole: currentUser?.role,
          reason: cancelReason,
        }),
      });
      if (res.ok) {
        setCancelOrderId(null);
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Failed to execute cancellation:', err);
    } finally {
      setCancelling(false);
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
          requiredVehicleType: vehicleType,
          transportFee,
        }),
      });
      if (res.ok) {
        setTransportOrderId(null);
        fetchOrders();
      }
    } catch (err) {
      console.error('Failed to request transport:', err);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-bold">Pending Farmer Acceptance</span>;
      case 'accepted':
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-bold">Order Accepted &bull; Awaiting Transport</span>;
      case 'transport_requested':
        return <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full text-xs font-bold">Transport Requested &bull; Matching Drivers</span>;
      case 'transport_assigned':
        return <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full text-xs font-bold">Driver Assigned &bull; En Route to Pickup</span>;
      case 'picked_up':
        return <span className="bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full text-xs font-bold">Goods Picked Up from Farm</span>;
      case 'in_transit':
        return <span className="bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full text-xs font-bold">In Transit to Destination</span>;
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-bold">Delivered &bull; Confirm Payout</span>;
      case 'completed':
        return <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">Completed & Settled</span>;
      case 'declined':
        return <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full text-xs font-bold">Declined by Farmer</span>;
      case 'cancelled':
        return <span className="bg-stone-200 text-stone-700 px-2.5 py-0.5 rounded-full text-xs font-bold">Cancelled & Archived</span>;
      default:
        return <span className="bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">My Purchase Contracts & Live Tracking</h2>
          <p className="text-xs text-stone-500">
            Real-time status tracking from farm harvest to warehouse delivery.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-400">Loading purchase records...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <Package className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
          <h3 className="font-bold text-stone-900 text-base">No orders placed yet</h3>
          <p className="text-stone-500 text-xs mt-1">
            Browse the marketplace to order direct farmgate produce.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const isCompleted = o.status === 'completed';
            const isCancelled = o.status === 'cancelled' || o.status === 'declined';
            const canCancel = !isCompleted && !isCancelled;
            const canConfirmDelivery = o.status === 'delivered' || o.status === 'in_transit';

            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-600">
                      {o.orderNumber}
                    </span>
                    {getStatusBadge(o.status)}
                  </div>
                  <div className="text-xs text-stone-400">
                    Placed: {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left Column: Commodity Details */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-stone-900 text-base">
                      {o.quantity.toLocaleString()} {o.unit} &bull; {o.commodityName}
                    </h3>
                    <p className="text-xs text-stone-600">
                      Farmer: <strong className="text-stone-800">{o.farmerName}</strong> ({o.farmerPhone || 'Verified farmer'})
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>To: {o.deliveryLocation}, {o.deliveryDistrict}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Target Delivery: {o.deliveryDate}</span>
                    </div>
                  </div>

                  {/* Middle Column: Status Pipeline Progress */}
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 flex flex-col justify-center space-y-2">
                    <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Fulfillment Pipeline
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-stone-600 font-medium">
                      <span className={o.status !== 'pending' ? 'text-emerald-700 font-bold' : 'text-stone-400'}>
                        Order Accepted
                      </span>
                      <ArrowRight className="w-3 h-3 text-stone-400" />
                      <span className={['transport_assigned', 'picked_up', 'in_transit', 'delivered', 'completed'].includes(o.status) ? 'text-emerald-700 font-bold' : 'text-stone-400'}>
                        Transport
                      </span>
                      <ArrowRight className="w-3 h-3 text-stone-400" />
                      <span className={['delivered', 'completed'].includes(o.status) ? 'text-emerald-700 font-bold' : 'text-stone-400'}>
                        Delivered
                      </span>
                    </div>
                    {o.cancellationReason && (
                      <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-100">
                        Reason: {o.cancellationReason}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Financial Breakdown & Escrow */}
                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 text-right space-y-1">
                    <div className="text-[10px] text-stone-400 font-semibold uppercase">
                      Escrow Total Amount
                    </div>
                    <div className="text-lg font-extrabold text-stone-900">
                      MWK {Number(o.totalAmount).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Produce: MWK {Number(o.commoditySubtotal).toLocaleString()} &bull; Transport: MWK {Number(o.transportFee).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-800 font-semibold flex items-center justify-end gap-1 pt-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Funds Held Securely in Escrow</span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs space-y-0.5">
                    <div className="text-stone-500">
                      Payment Channel: <strong className="text-stone-800">{o.paymentMethod || 'Airtel Money / TNM Mpamba'}</strong>{' '}
                      {o.paymentRef && <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-[10px]">Ref: {o.paymentRef}</span>}
                    </div>
                    <div className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                      {o.paymentStatus === 'escrow_pending_finance_approval' && (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          ⏳ Deposit awaiting Financial Administrator verification
                        </span>
                      )}
                      {o.paymentStatus === 'escrow_held' && (
                        <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          🔒 Funds Secured in Escrow {o.farmerConfirmedAt ? '• Farmer Confirmed Purchase' : '• Awaiting Farmer Confirmation'}
                        </span>
                      )}
                      {o.paymentStatus === 'disbursed_to_farmer' && (
                        <span className="text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          🎉 Completed • Funds Disbursed to Farmer
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Transport request button if accepted but no transport */}
                    {o.status === 'accepted' && (
                      <button
                        onClick={() => setTransportOrderId(o.id)}
                        className="px-3 py-1.5 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Find Transporter</span>
                      </button>
                    )}

                    {/* Delivery Confirmation */}
                    {canConfirmDelivery && (
                      <button
                        onClick={() => handleConfirmDelivery(o.id)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Confirm Delivery & Release Escrow</span>
                      </button>
                    )}

                    {/* Controlled Order Cancellation / Archive */}
                    {canCancel && (
                      <button
                        onClick={() => setCancelOrderId(o.id)}
                        className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1 transition-colors"
                        title="Controlled cancel & archive operation"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Cancel Order</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CONTROLLED CANCEL ORDER */}
      {cancelOrderId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-stone-900">
                Cancel Order (Controlled Archive)
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              In accordance with financial compliance rules, this order will be formally cancelled and archived. Stock will be restored to the farmer, escrow reservations cleared, and an immutable audit log record created.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-rose-600"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setCancelOrderId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Keep Order Active
              </button>
              <button
                onClick={handleExecuteCancel}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                {cancelling ? 'Archiving...' : 'Confirm Cancellation'}
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
              <h3 className="text-base font-bold text-stone-900">Request Logistics Driver</h3>
            </div>
            <p className="text-xs text-stone-500">
              Assign a licensed Malawi transporter to haul this commodity from the farmgate.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Required Vehicle
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
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
                  value={transportFee}
                  onChange={(e) => setTransportFee(Number(e.target.value))}
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
                Broadcast to Transporters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
