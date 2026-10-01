import React, { useState, useEffect } from 'react';
import { ImpactMetrics } from '../../types/index.ts';
import {
  HeartHandshake,
  Sprout,
  Truck,
  ShoppingCart,
  TrendingUp,
  Info,
  CheckCircle,
  RefreshCw,
  Users,
} from 'lucide-react';

export const ImpactDashboard: React.FC = () => {
  const [impact, setImpact] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchImpact = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/impact');
      if (res.ok) {
        setImpact(await res.json());
      }
    } catch (err) {
      console.error('Failed to load socio-economic impact metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpact();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/60 text-emerald-200 border border-emerald-600/40">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Socio-Economic Development & Food Security &bull; Malawi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Socio-Economic Impact Overview
            </h1>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Real-time measurement of wealth generation, rural livelihood enhancement, and supply-chain efficiency delivered directly to Malawian communities.
            </p>
          </div>

          <button
            onClick={fetchImpact}
            className="p-2.5 rounded-xl bg-emerald-800/50 hover:bg-emerald-800 text-emerald-100 transition-colors self-start md:self-auto"
            title="Refresh database metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {impact && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-emerald-800/60">
            <div>
              <div className="text-xs text-emerald-200 font-medium">Total Beneficiaries Engaged</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                {impact.summary.totalBeneficiaries} participants
              </div>
            </div>
            <div>
              <div className="text-xs text-emerald-200 font-medium">Total Agricultural Volume</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 mt-0.5">
                MWK {impact.summary.totalMarketplaceVolume.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-emerald-200 font-medium">Middlemen Extraction Eliminated</div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-300 mt-0.5">
                &ge; 22% Margin Kept Locally
              </div>
            </div>
          </div>
        )}
      </div>

      {impact && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Smallholder Farmers */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Producers
                </span>
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-lg">Smallholder Farmers</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Rural family farmers across Central, Southern, and Northern Malawi.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Registered Farmers:</span>
                  <span className="font-bold text-stone-900">{impact.farmers.count} farmers</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Total Farmgate Sales:</span>
                  <span className="font-bold text-stone-900">
                    MWK {impact.farmers.totalSales.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Completed Transactions:</span>
                  <span className="font-bold text-stone-900">
                    {impact.farmers.completedTransactions} orders
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950">
                      Estimated Farmer Surplus:
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800">
                      MWK {impact.farmers.estimatedSurplus.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-700 flex items-start gap-1 leading-relaxed">
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      <strong>Estimate Methodology:</strong> {impact.farmers.surplusMethodology}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 2: Transporters */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  Logistics
                </span>
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-lg">Freight Transporters</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Truck owners, van operators, and rural agricultural haulage drivers.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Active Transporters:</span>
                  <span className="font-bold text-stone-900">
                    {impact.transporters.count} operators
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Completed Haulage Trips:</span>
                  <span className="font-bold text-stone-900">
                    {impact.transporters.completedDeliveries} deliveries
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Total Haulage Jobs Logged:</span>
                  <span className="font-bold text-stone-900">
                    {impact.transporters.totalJobs} jobs
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950">
                      Total Transporter Earnings:
                    </span>
                    <span className="text-xs font-extrabold text-blue-800">
                      MWK {impact.transporters.earnings.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-700 flex items-start gap-1 leading-relaxed">
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      Direct income injected into domestic transport operators, replacing empty return runs with loaded backhauls.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 3: Urban Buyers */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Commercial Buyers
                </span>
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-lg">Urban & Wholesale Buyers</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Grain millers, supermarkets, institutional food processors, and wholesalers.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Registered Buyers:</span>
                  <span className="font-bold text-stone-900">{impact.buyers.count} enterprises</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Total Commodity Purchases:</span>
                  <span className="font-bold text-stone-900">
                    MWK {impact.buyers.totalPurchases.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Completed Delivery Contracts:</span>
                  <span className="font-bold text-stone-900">
                    {impact.buyers.completedOrders} contracts
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950">
                      Estimated Buyer Savings:
                    </span>
                    <span className="text-xs font-extrabold text-amber-800">
                      MWK {impact.buyers.estimatedSavings.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-700 flex items-start gap-1 leading-relaxed">
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      <strong>Estimate Methodology:</strong> {impact.buyers.savingsMethodology}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
