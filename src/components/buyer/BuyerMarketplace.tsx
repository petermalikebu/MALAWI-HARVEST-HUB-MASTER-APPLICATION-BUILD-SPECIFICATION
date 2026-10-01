import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { Commodity, Category, MALAWI_DISTRICTS } from '../../types/index.ts';
import {
  Search,
  Filter,
  ShoppingCart,
  MapPin,
  Calendar,
  CheckCircle2,
  Sparkles,
  Truck,
  ShieldCheck,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface BuyerMarketplaceProps {
  onOrderPlaced?: () => void;
}

export const BuyerMarketplace: React.FC<BuyerMarketplaceProps> = ({ onOrderPlaced }) => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedQuality, setSelectedQuality] = useState('All');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'qty_desc'>('qty_desc');

  // Order modal state
  const [orderingCommodity, setOrderingCommodity] = useState<Commodity | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(500);
  const [deliveryLocation, setDeliveryLocation] = useState(
    currentUser?.tradingArea || 'Area 25 Central Wholesale Market, Lilongwe'
  );
  const [deliveryDistrict, setDeliveryDistrict] = useState(currentUser?.district || 'Lilongwe');
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [includeTransport, setIncludeTransport] = useState(true);
  const [transportEstimate, setTransportEstimate] = useState(30000);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const fetchCommodities = async () => {
    try {
      setLoading(true);
      const [commRes, catRes] = await Promise.all([
        fetch('/api/commodities?status=available'),
        fetch('/api/categories'),
      ]);
      if (commRes.ok) setCommodities(await commRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      console.error('Failed to load marketplace commodities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommodities();
  }, []);

  // Listen to realtime stock updates
  useEffect(() => {
    const unsubCreated = subscribe('commodity_created', () => fetchCommodities());
    const unsubUpdated = subscribe('commodity_updated', () => fetchCommodities());
    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, [subscribe]);

  const handleOpenOrderModal = (c: Commodity) => {
    setOrderingCommodity(c);
    setOrderQuantity(Math.min(500, c.quantity));
    setOrderSuccess(null);
    setOrderError(null);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderingCommodity || !currentUser) return;

    setSubmittingOrder(true);
    setOrderError(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerUid: currentUser.uid,
          commodityId: orderingCommodity.id,
          quantity: orderQuantity,
          deliveryLocation,
          deliveryDistrict,
          deliveryDate,
          notes,
          includeTransportEstimate: includeTransport,
          transportFee: includeTransport ? transportEstimate : 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to place order');
      }

      const orderData = await res.json();
      setOrderSuccess(
        `Order #${orderData.orderNumber} successfully submitted to ${orderingCommodity.farmerName}! Stock reserved.`
      );
      fetchCommodities();
      if (onOrderPlaced) onOrderPlaced();
    } catch (err: any) {
      setOrderError(err.message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Filter and sort commodities
  const filteredCommodities = commodities
    .filter((c) => {
      if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
      if (selectedDistrict !== 'All' && c.district !== selectedDistrict) return false;
      if (selectedQuality !== 'All' && !c.quality.includes(selectedQuality)) return false;
      if (searchTerm.trim() !== '') {
        const s = searchTerm.toLowerCase();
        return (
          c.commodityName.toLowerCase().includes(s) ||
          c.district.toLowerCase().includes(s) ||
          c.farmerName.toLowerCase().includes(s) ||
          c.location.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return Number(a.pricePerUnit) - Number(b.pricePerUnit);
      if (sortBy === 'price_desc') return Number(b.pricePerUnit) - Number(a.pricePerUnit);
      return b.quantity - a.quantity;
    });

  // Calculate pricing breakdown in modal
  const unitPrice = orderingCommodity ? Number(orderingCommodity.pricePerUnit) : 0;
  const commoditySubtotal = orderQuantity * unitPrice;
  const platformFee = Math.round(commoditySubtotal * 0.04); // 4%
  const transportFee = includeTransport ? transportEstimate : 0;
  const grandTotal = commoditySubtotal + transportFee;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-700/60 text-amber-200 border border-amber-600/40">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Commercial Buyer Marketplace &bull; Malawi National Harvest</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Direct Farmgate Produce Sourcing
          </h1>
          <p className="text-amber-100 text-sm leading-relaxed">
            Purchase verified agricultural commodities directly from smallholder farmers across Mchinji, Kasungu, Dedza, Salima, and all 28 districts of Malawi. Guaranteed transparent pricing with integrated 4% escrow protection.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-amber-700/60 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>4% Capped Escrow Commission</span>
          </div>
          <div className="flex items-center gap-2 text-amber-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Grade & Moisture Verified</span>
          </div>
          <div className="flex items-center gap-2 text-amber-200">
            <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Integrated Transporter Logistics</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search commodity (e.g. Rice, Maize, Beans) or district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 focus:outline-amber-600"
            />
          </div>

          {/* Category filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-amber-600 bg-white"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* District filter */}
          <div className="md:col-span-2">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-amber-600 bg-white"
            >
              <option value="All">All Districts</option>
              {MALAWI_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-amber-600 bg-white"
            >
              <option value="qty_desc">Stock: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Quality Quick Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-stone-100 flex-wrap text-xs">
          <span className="text-stone-400 font-semibold text-[11px] uppercase tracking-wider">
            Quality Grade:
          </span>
          {['All', 'Grade A', 'Grade B', 'Grade C'].map((q) => (
            <button
              key={q}
              onClick={() => setSelectedQuality(q)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                selectedQuality === q
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {q}
            </button>
          ))}
          <span className="ml-auto text-xs text-stone-500 font-medium">
            Showing {filteredCommodities.length} available commodity listings
          </span>
        </div>
      </div>

      {/* Commodity Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-stone-400">Loading marketplace produce...</div>
      ) : filteredCommodities.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <ShoppingCart className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-3" />
          <h3 className="font-bold text-stone-900 text-base">No matching commodities found</h3>
          <p className="text-stone-500 text-xs mt-1">
            Try adjusting your search criteria, category, or district filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCommodities.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="h-44 relative bg-stone-100">
                  <img
                    src={c.imageUrl || 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80'}
                    alt={c.commodityName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white px-2.5 py-0.5 rounded text-[11px] font-medium">
                    {c.category}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-stone-900 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs">
                    {c.district}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-stone-900 text-base leading-tight">
                      {c.commodityName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">
                      {c.location}, {c.district} ({c.region} Region)
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                    {c.quality}
                  </div>

                  <div className="mt-2 text-xs text-stone-600 line-clamp-2">
                    {c.description || 'Verified farmgate produce ready for immediate dispatch.'}
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span>Farmer: <strong className="text-stone-800">{c.farmerName}</strong></span>
                    <span>Ready: {c.availabilityDate}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 flex items-end justify-between mb-3">
                  <div>
                    <div className="text-[10px] text-stone-400 font-semibold uppercase">
                      Stock Remaining
                    </div>
                    <div className="text-base font-extrabold text-stone-900">
                      {c.quantity.toLocaleString()} {c.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-stone-400 font-semibold uppercase">
                      Unit Price
                    </div>
                    <div className="text-lg font-extrabold text-amber-800">
                      MWK {Number(c.pricePerUnit).toLocaleString()}
                      <span className="text-xs font-medium text-stone-500">/{c.unit}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenOrderModal(c)}
                  className="w-full py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Purchase & Reserve Stock</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: PLACE ORDER */}
      {orderingCommodity && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Place Order & Reserve Escrow
                </h3>
                <p className="text-xs text-stone-500">
                  {orderingCommodity.commodityName} &bull; Farmer {orderingCommodity.farmerName}
                </p>
              </div>
              <button
                onClick={() => setOrderingCommodity(null)}
                className="text-stone-400 hover:text-stone-700 text-lg p-1"
              >
                &times;
              </button>
            </div>

            {orderSuccess ? (
              <div className="py-6 space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-stone-900">Order Confirmed!</h4>
                <p className="text-xs text-stone-600 max-w-sm mx-auto">{orderSuccess}</p>
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => setOrderingCommodity(null)}
                    className="px-6 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                  >
                    Done & Return to Market
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-4 mt-4">
                {orderError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                    {orderError}
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-stone-700">
                      Purchase Quantity ({orderingCommodity.unit}) *
                    </label>
                    <span className="text-[11px] text-stone-500">
                      Max available: {orderingCommodity.quantity.toLocaleString()} {orderingCommodity.unit}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={orderingCommodity.quantity}
                    required
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-amber-600 font-bold"
                  />
                </div>

                {/* Delivery Location & District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Delivery District *
                    </label>
                    <select
                      value={deliveryDistrict}
                      onChange={(e) => setDeliveryDistrict(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-amber-600 bg-white"
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
                      Delivery Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Specific Delivery Address / Warehouse *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Area 25 Industrial Site, Central Grain Silo 4"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-amber-600"
                  />
                </div>

                {/* Transport facilitation toggle */}
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-blue-950 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTransport}
                        onChange={(e) => setIncludeTransport(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Include Transport Matching Facilitation</span>
                    </label>
                    {includeTransport && (
                      <span className="font-bold text-blue-800">
                        +MWK {transportEstimate.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Automatically matches verified trucks between {orderingCommodity.district} and {deliveryDistrict}.
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Special Packaging or Handling Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Moisture test certificate required on arrival"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-amber-600"
                  />
                </div>

                {/* Financial Ledger Calculation Summary */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1.5 text-xs">
                  <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Order Financial Calculation
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>
                      Produce Value ({orderQuantity.toLocaleString()} {orderingCommodity.unit} &times; MWK {unitPrice}):
                    </span>
                    <span className="font-semibold text-stone-900">
                      MWK {commoditySubtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Platform Commission (4% included):</span>
                    <span className="font-medium text-emerald-700">
                      MWK {platformFee.toLocaleString()}
                    </span>
                  </div>
                  {includeTransport && (
                    <div className="flex justify-between text-stone-600">
                      <span>Logistics & Transport Estimate:</span>
                      <span className="font-semibold text-stone-900">
                        MWK {transportFee.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-stone-200 flex justify-between font-extrabold text-stone-900 text-sm">
                    <span>Grand Total (in Escrow):</span>
                    <span className="text-amber-800">MWK {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderingCommodity(null)}
                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{submittingOrder ? 'Submitting...' : 'Confirm & Reserve Stock'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
