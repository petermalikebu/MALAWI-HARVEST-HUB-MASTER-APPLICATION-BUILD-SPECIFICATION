import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { MarketPrice, MALAWI_DISTRICTS, getDistrictRegion, COMMODITY_UNITS, Category } from '../../types/index.ts';
import { safeParseJson, safeParseResponse } from '../../lib/api.ts';
import {
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Coins,
  AlertCircle,
  X,
  Scale,
  Building,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface MarketPriceAdminProps {
  categoriesList?: Category[];
}

export const MarketPriceAdmin: React.FC<MarketPriceAdminProps> = ({ categoriesList = [] }) => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();
  const { language } = useLanguage();

  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDistrict, setFilterDistrict] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<MarketPrice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Notification and confirmation state
  const [panelFeedback, setPanelFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmPrice, setDeleteConfirmPrice] = useState<MarketPrice | null>(null);

  // Form fields
  const [formCommodityName, setFormCommodityName] = useState('');
  const [formCategory, setFormCategory] = useState('Grains & Cereals');
  const [formDistrict, setFormDistrict] = useState('Lilongwe');
  const [formMarketLocation, setFormMarketLocation] = useState('Mitundu Central Market');
  const [formPriceMin, setFormPriceMin] = useState<number>(650);
  const [formPriceMax, setFormPriceMax] = useState<number>(750);
  const [formPriceAvg, setFormPriceAvg] = useState<number>(700);
  const [formUnit, setFormUnit] = useState('kg');
  const [formEffectiveDate, setFormEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');

  const fetchPrices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/market-prices');
      if (res.ok) {
        const data = await safeParseJson(res, []);
        setPrices(data);
      }
    } catch (err) {
      console.error('Failed to load market prices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  useEffect(() => {
    const unsub = subscribe('market_price_updated', () => {
      fetchPrices();
    });
    return () => unsub();
  }, [subscribe]);

  const handleOpenAdd = () => {
    setEditingPrice(null);
    setFormError(null);
    setFormCommodityName('White Maize (Grade A)');
    setFormCategory('Grains & Cereals');
    setFormDistrict('Lilongwe');
    setFormMarketLocation('Mitundu Central Market');
    setFormPriceMin(650);
    setFormPriceMax(750);
    setFormPriceAvg(700);
    setFormUnit('kg');
    setFormEffectiveDate(new Date().toISOString().split('T')[0]);
    setFormNotes('Prevailing market benchmark compiled from local depot auctions.');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (price: MarketPrice) => {
    setEditingPrice(price);
    setFormError(null);
    setFormCommodityName(price.commodityName);
    setFormCategory(price.category || 'Grains & Cereals');
    setFormDistrict(price.district);
    setFormMarketLocation(price.marketLocation || `${price.district} Central Market`);
    setFormPriceMin(Number(price.priceMin));
    setFormPriceMax(Number(price.priceMax));
    setFormPriceAvg(Number(price.priceAvg));
    setFormUnit(price.unit || 'kg');
    setFormEffectiveDate(price.effectiveDate ? price.effectiveDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormNotes(price.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formCommodityName || !formDistrict || !formPriceAvg || !formUnit) {
      setFormError('Please fill in commodity name, district, unit of measurement, and benchmark price.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        commodityName: formCommodityName,
        category: formCategory,
        district: formDistrict,
        marketLocation: formMarketLocation,
        region: getDistrictRegion(formDistrict),
        priceMin: formPriceMin,
        priceMax: formPriceMax,
        priceAvg: formPriceAvg,
        unit: formUnit,
        effectiveDate: formEffectiveDate,
        notes: formNotes,
        adminUid: currentUser?.uid,
        adminName: currentUser?.fullName,
      };

      const url = editingPrice ? `/api/market-prices/${editingPrice.id}` : '/api/market-prices';
      const method = editingPrice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setIsModalOpen(false);
        setPanelFeedback({
          type: 'success',
          message: editingPrice
            ? `Updated market price benchmark for ${formCommodityName} in ${formDistrict} (${formUnit}).`
            : `Published new market price benchmark for ${formCommodityName} in ${formDistrict} (${formUnit}).`,
        });
        setTimeout(() => setPanelFeedback(null), 4000);
        fetchPrices();
      } else {
        setFormError(parsed.error || 'Failed to save market price');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error saving market price');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmPrice) return;
    const id = deleteConfirmPrice.id;
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/market-prices/${id}?adminUid=${currentUser?.uid}&adminName=${encodeURIComponent(currentUser?.fullName || 'Admin')}`,
        {
          method: 'DELETE',
        }
      );
      if (res.ok) {
        setDeleteConfirmPrice(null);
        setPanelFeedback({ type: 'success', message: 'Market price record removed successfully.' });
        setTimeout(() => setPanelFeedback(null), 4000);
        fetchPrices();
      } else {
        const err = await res.json();
        setPanelFeedback({ type: 'error', message: err.error || 'Failed to delete record' });
      }
    } catch (err: any) {
      setPanelFeedback({ type: 'error', message: err.message || 'Error deleting price record' });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered price list
  const filteredPrices = prices.filter((p) => {
    if (filterDistrict !== 'all' && p.district.toLowerCase() !== filterDistrict.toLowerCase()) return false;
    if (filterRegion !== 'all' && p.region.toLowerCase() !== filterRegion.toLowerCase()) return false;
    if (filterUnit !== 'all' && p.unit.toLowerCase() !== filterUnit.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = p.commodityName.toLowerCase().includes(query);
      const matchCat = (p.category || '').toLowerCase().includes(query);
      const matchLoc = (p.marketLocation || '').toLowerCase().includes(query);
      const matchNotes = (p.notes || '').toLowerCase().includes(query);
      return matchName || matchCat || matchLoc || matchNotes;
    }
    return true;
  });

  // Calculate statistics
  const totalTracked = prices.length;
  const uniqueDistricts = new Set(prices.map((p) => p.district)).size;
  const uniqueCommodities = new Set(prices.map((p) => p.commodityName)).size;

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {panelFeedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 border ${
            panelFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {panelFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{panelFeedback.message}</span>
          </div>
          <button onClick={() => setPanelFeedback(null)} className="text-stone-400 hover:text-stone-700 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-green-900 to-stone-900 rounded-3xl p-6 text-white shadow-sm border border-emerald-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Location & Unit-Based Agricultural Pricing Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Market Price Administration Desk
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Maintain standard prevailing market prices across Malawi’s districts categorized by unit of measurement (kg, 50kg bag, Ton). Farmers reference these authoritative figures as non-binding benchmarks and fair-trade guidelines when listing produce.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchPrices}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Refresh pricing"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-stone-950" />
              <span>Add Commodity Price</span>
            </button>
          </div>
        </div>

        {/* Statistical Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-emerald-800/60 text-xs">
          <div className="bg-emerald-900/40 p-3 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase">Total Benchmarks</div>
            <div className="text-xl font-black text-white mt-0.5">{totalTracked}</div>
            <div className="text-[10px] text-stone-300">Active records</div>
          </div>
          <div className="bg-emerald-900/40 p-3 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase">Districts Covered</div>
            <div className="text-xl font-black text-white mt-0.5">{uniqueDistricts} / 28</div>
            <div className="text-[10px] text-stone-300">Nationwide reach</div>
          </div>
          <div className="bg-emerald-900/40 p-3 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase">Commodities Tracked</div>
            <div className="text-xl font-black text-white mt-0.5">{uniqueCommodities}</div>
            <div className="text-[10px] text-stone-300">Varieties & grades</div>
          </div>
          <div className="bg-emerald-900/40 p-3 rounded-2xl border border-emerald-700/40">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase">Units Supported</div>
            <div className="text-xl font-black text-white mt-0.5">kg, bag, Ton</div>
            <div className="text-[10px] text-stone-300">Standardized units</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by commodity name, depot, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Unit of Measurement Filter */}
            <div className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
              >
                <option value="all">All Units</option>
                {COMMODITY_UNITS.map((u) => (
                  <option key={u} value={u}>
                    Per {u}
                  </option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
              >
                <option value="all">All Districts (28)</option>
                {MALAWI_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
            >
              <option value="all">All Regions</option>
              <option value="Northern">Northern</option>
              <option value="Central">Central</option>
              <option value="Southern">Southern</option>
            </select>
          </div>
        </div>

        {/* Filter count indicator */}
        <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1 border-t border-stone-100">
          <span>
            Showing <strong>{filteredPrices.length}</strong> of {prices.length} market prices
          </span>
          {(filterDistrict !== 'all' || filterRegion !== 'all' || filterUnit !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterDistrict('all');
                setFilterRegion('all');
                setFilterUnit('all');
                setSearchQuery('');
              }}
              className="text-emerald-700 hover:underline font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Commodity Price Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
          <div className="text-xs font-semibold text-stone-600">Loading location-based market prices...</div>
        </div>
      ) : filteredPrices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Coins className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-800 text-sm">No market price benchmarks found</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {searchQuery || filterDistrict !== 'all' || filterUnit !== 'all'
              ? 'Try adjusting your search criteria, district, or unit filter.'
              : 'Click "Add Commodity Price" to record the first location-based benchmark.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800"
          >
            Add Commodity Price
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrices.map((price) => (
            <div
              key={price.id}
              className="bg-white rounded-2xl border border-stone-200 p-4.5 hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 relative group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                      {price.category || 'Agricultural Produce'}
                    </span>
                    <h3 className="text-base font-bold text-stone-900 mt-1 leading-snug">
                      {price.commodityName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                    <button
                      onClick={() => handleOpenEdit(price)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title="Edit price"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmPrice(price)}
                      disabled={deletingId === price.id}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete price"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Location & Unit badge */}
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 p-2 rounded-xl border border-stone-150">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-stone-800">{price.district}</span>
                  <span className="text-stone-300">&bull;</span>
                  <span className="truncate text-stone-600 text-[11px]">{price.marketLocation}</span>
                  <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                    {price.region}
                  </span>
                </div>

                {/* Benchmark Pricing Display */}
                <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/80">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                      Prevailing Benchmark
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      per {price.unit}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-800">
                      MWK {Number(price.priceAvg).toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-emerald-950">/{price.unit}</span>
                  </div>

                  {/* Range indicator */}
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-950 font-medium">
                    <span>
                      Low: <strong>MWK {Number(price.priceMin).toLocaleString()}</strong>
                    </span>
                    <span className="text-stone-300">|</span>
                    <span>
                      High: <strong>MWK {Number(price.priceMax).toLocaleString()}</strong>
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {price.notes && (
                  <p className="mt-2.5 text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {price.notes}
                  </p>
                )}
              </div>

              {/* Card Footer: Update date & Admin attribution */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  <span>Effective: {price.effectiveDate}</span>
                </span>
                <span className="truncate max-w-[140px]">
                  By: {price.updatedByAdminName || 'Admin'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add / Edit Market Price */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {editingPrice ? 'Edit Commodity Price Benchmark' : 'Add New Commodity Price Benchmark'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Set location and unit-specific prevailing prices to guide farmers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Commodity Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Commodity Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. White Maize (Grade A)"
                    value={formCommodityName}
                    onChange={(e) => setFormCommodityName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Agricultural Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white"
                  >
                    {categoriesList.length > 0 ? (
                      categoriesList.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Grains & Cereals">Grains & Cereals</option>
                        <option value="Legumes & Pulses">Legumes & Pulses</option>
                        <option value="Oilseeds & Nuts">Oilseeds & Nuts</option>
                        <option value="Roots & Tubers">Roots & Tubers</option>
                        <option value="Horticulture & Vegetables">Horticulture & Vegetables</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* District & Market Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    District Location *
                  </label>
                  <select
                    value={formDistrict}
                    onChange={(e) => {
                      setFormDistrict(e.target.value);
                      if (!editingPrice) {
                        setFormMarketLocation(`${e.target.value} Central Market`);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white"
                  >
                    {MALAWI_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d} ({getDistrictRegion(d)} Region)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Specific Market / Trading Depot *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mitundu Central, Lizulu Depot"
                    value={formMarketLocation}
                    onChange={(e) => setFormMarketLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Pricing Numbers & Unit of Measurement */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <span>Price Benchmarks & Unit of Measurement</span>
                  </span>
                  <span className="text-[10px] text-stone-500">Currency: MWK</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">
                      Unit of Measure *
                    </label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white font-bold text-emerald-800"
                    >
                      {COMMODITY_UNITS.map((u) => (
                        <option key={u} value={u}>
                          per {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">
                      Min Price (MWK)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formPriceMin}
                      onChange={(e) => setFormPriceMin(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-800 font-bold mb-1">
                      Standard Benchmark *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formPriceAvg}
                      onChange={(e) => setFormPriceAvg(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border-2 border-emerald-500 focus:outline-emerald-600 text-xs bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">
                      Max Price (MWK)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formPriceMax}
                      onChange={(e) => setFormPriceMax(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 flex items-center justify-between">
                  <span>
                    Corridor: MWK {formPriceMin.toLocaleString()} &ndash; MWK {formPriceMax.toLocaleString()} /{formUnit}
                  </span>
                  <span className="font-semibold text-emerald-700">
                    Benchmark: MWK {formPriceAvg.toLocaleString()} /{formUnit}
                  </span>
                </div>
              </div>

              {/* Effective Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formEffectiveDate}
                    onChange={(e) => setFormEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Market Context & Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Inflow from harvest, buyer aggregation volume..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-150 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPrice ? 'Update Price' : 'Add Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteConfirmPrice && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">Delete Commodity Price</h3>
                <p className="text-xs text-stone-500">This action will unpublish this benchmark.</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-3 border border-stone-150 text-xs text-stone-700 space-y-1">
              <div className="font-bold text-stone-900">{deleteConfirmPrice.commodityName}</div>
              <div className="text-stone-500">
                {deleteConfirmPrice.district} &bull; {deleteConfirmPrice.marketLocation}
              </div>
              <div className="text-emerald-700 font-extrabold">
                MWK {Number(deleteConfirmPrice.priceAvg).toLocaleString()} /{deleteConfirmPrice.unit}
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to remove this prevailing price benchmark? Farmers in {deleteConfirmPrice.district} will no longer see this reference.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPrice(null)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId === deleteConfirmPrice.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
              >
                {deletingId === deleteConfirmPrice.id ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
