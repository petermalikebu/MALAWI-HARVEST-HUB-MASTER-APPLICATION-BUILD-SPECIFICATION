import React, { useState } from 'react';
import { Calculator, AlertCircle, TrendingUp, Sparkles, ShieldAlert, DollarSign } from 'lucide-react';

export const FeeSimulator: React.FC = () => {
  // Configurable assumptions
  const [avgTradeValue, setAvgTradeValue] = useState<number>(450000); // MWK 450,000 per trade
  const [monthlyTrades, setMonthlyTrades] = useState<number>(250); // 250 trades/month
  const [commissionRatePercent, setCommissionRatePercent] = useState<number>(4.0); // 4%
  const [avgTransportFee, setAvgTransportFee] = useState<number>(35000); // MWK 35,000 per haul
  const [transportFacilitationShare, setTransportFacilitationShare] = useState<number>(5.0); // 5% facilitation fee on transport

  // Calculations (Client-side planning simulation ONLY; does NOT touch production database)
  const grossCommodityVolume = avgTradeValue * monthlyTrades;
  const platformCommodityCommission = Math.round(grossCommodityVolume * (commissionRatePercent / 100));
  const totalTransportVolume = avgTransportFee * monthlyTrades;
  const platformTransportFacilitation = Math.round(totalTransportVolume * (transportFacilitationShare / 100));
  const totalPlatformRevenue = platformCommodityCommission + platformTransportFacilitation;
  const totalMarketplaceGrossVolume = grossCommodityVolume + totalTransportVolume;
  const farmerNetEarnings = grossCommodityVolume - platformCommodityCommission;
  const annualProjectedRevenue = totalPlatformRevenue * 12;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-800/60 text-indigo-200 border border-indigo-700/40">
            <Calculator className="w-3.5 h-3.5" />
            <span>Economic Projection & Scenario Modeling</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Fee & Revenue Scenario Simulator
          </h1>
          <p className="text-indigo-100 text-sm leading-relaxed">
            Financial planning tool for stress-testing commission tiers, transaction volume scaling, and seasonal harvest cash-flow models.
          </p>
        </div>

        {/* Critical Specification Safety Guarantee Banner */}
        <div className="mt-6 p-3.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
          <span>
            <strong>Strict Compliance Notice:</strong> This simulator operates strictly in-memory. It does <strong>NOT</strong> modify, overwrite, or touch production PostgreSQL database records.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs Panel */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
          <h3 className="font-bold text-stone-900 text-base">Model Assumptions</h3>

          {/* Average Trade Value */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-stone-700">
              <label>Average Trade Value (MWK)</label>
              <span className="text-indigo-700 font-mono">
                MWK {avgTradeValue.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="50000"
              max="5000000"
              step="50000"
              value={avgTradeValue}
              onChange={(e) => setAvgTradeValue(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>MWK 50k (Small bag)</span>
              <span>MWK 5M (Truckload)</span>
            </div>
          </div>

          {/* Monthly Trades */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-stone-700">
              <label>Projected Monthly Trade Transactions</label>
              <span className="text-indigo-700 font-mono">{monthlyTrades.toLocaleString()} trades</span>
            </div>
            <input
              type="range"
              min="10"
              max="5000"
              step="20"
              value={monthlyTrades}
              onChange={(e) => setMonthlyTrades(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>10 trades</span>
              <span>5,000 trades/mo</span>
            </div>
          </div>

          {/* Commission % */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-stone-700">
              <label>Platform Commission Rate</label>
              <span className="text-indigo-700 font-mono">{commissionRatePercent.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={commissionRatePercent}
              onChange={(e) => setCommissionRatePercent(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>1.0% (Subsidized)</span>
              <span>4.0% (Default)</span>
              <span>10.0% (Cap)</span>
            </div>
          </div>

          {/* Average Transport Fee */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-stone-700">
              <label>Average Transport Haulage Fee (MWK)</label>
              <span className="text-indigo-700 font-mono">
                MWK {avgTransportFee.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="10000"
              max="200000"
              step="5000"
              value={avgTransportFee}
              onChange={(e) => setAvgTransportFee(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>MWK 10,000 (Local)</span>
              <span>MWK 200,000 (Inter-district)</span>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <button
              onClick={() => {
                setAvgTradeValue(450000);
                setMonthlyTrades(250);
                setCommissionRatePercent(4.0);
                setAvgTransportFee(35000);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold"
            >
              Reset to Base Baseline (4%)
            </button>
          </div>
        </div>

        {/* Right Output Projections */}
        <div className="lg:col-span-7 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Monthly Gross Marketplace Volume (GMV)
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-2">
                MWK {totalMarketplaceGrossVolume.toLocaleString()}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Produce: MWK {grossCommodityVolume.toLocaleString()} + Logistics: MWK {totalTransportVolume.toLocaleString()}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                Monthly Platform Revenue ({commissionRatePercent}%)
              </div>
              <div className="text-2xl font-extrabold text-indigo-900 mt-2">
                MWK {totalPlatformRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Commissions from {monthlyTrades.toLocaleString()} trade settlements
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Farmer Net Earnings Payout
              </div>
              <div className="text-2xl font-extrabold text-emerald-800 mt-2">
                MWK {farmerNetEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                96% of produce sales directly distributed to rural producers
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Transporter Freight Payout
              </div>
              <div className="text-2xl font-extrabold text-blue-900 mt-2">
                MWK {(totalTransportVolume - platformTransportFacilitation).toLocaleString()}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Distributed to truck drivers & haulage operators
              </p>
            </div>
          </div>

          {/* Annualized Projection Card */}
          <div className="bg-gradient-to-r from-stone-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Annualized Sustainability Run-Rate
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                12 Months
              </span>
            </div>

            <div className="text-3xl font-extrabold text-white">
              MWK {annualProjectedRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Based on steady-state fulfillment of {monthlyTrades} monthly trades at MWK {avgTradeValue.toLocaleString()} average order size. Allows Malawi Harvest Hub to self-sustain platform servers, rural field inspectors, and escrow operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
