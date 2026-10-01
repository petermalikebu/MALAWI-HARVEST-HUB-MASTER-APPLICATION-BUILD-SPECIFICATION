import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { RevenueMetrics, RevenueLedgerEntry, Transaction, TransportJob, User } from '../../types/index.ts';
import {
  Coins,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  Truck,
  Phone,
  MapPin,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const FinanceDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<RevenueLedgerEntry[]>([]);
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);
  const [transportJobs, setTransportJobs] = useState<TransportJob[]>([]);
  const [transportersList, setTransportersList] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'ledger' | 'transactions' | 'transport_approvals'>('metrics');
  const [loading, setLoading] = useState(true);

  // Filters for transactions
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('All');

  // Approval modal state
  const [approvingJob, setApprovingJob] = useState<TransportJob | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [recommendationNotes, setRecommendationNotes] = useState<string>('');
  const [paymentVerifiedCheck, setPaymentVerifiedCheck] = useState<boolean>(true);
  const [approvalSubmitting, setApprovalSubmitting] = useState<boolean>(false);
  const [approvalSuccessMsg, setApprovalSuccessMsg] = useState<string>('');
  const [approvalErrorMsg, setApprovalErrorMsg] = useState<string>('');

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [mRes, lRes, tRes, jRes, driversRes] = await Promise.all([
        fetch('/api/finance/revenue'),
        fetch('/api/finance/ledger'),
        fetch(`/api/finance/transactions?status=${txStatusFilter}&search=${encodeURIComponent(txSearch)}`),
        fetch('/api/transport/jobs'),
        fetch('/api/users?role=transporter'),
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (lRes.ok) setLedgerEntries(await lRes.json());
      if (tRes.ok) setTransactionsList(await tRes.json());
      if (jRes.ok) setTransportJobs(await jRes.json());
      if (driversRes.ok) setTransportersList(await driversRes.json());
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [txStatusFilter, txSearch]);

  useEffect(() => {
    const unsubRev = subscribe('revenue_updated', () => fetchFinanceData());
    const unsubTx = subscribe('transaction_updated', () => fetchFinanceData());
    const unsubOrder = subscribe('order_updated', () => fetchFinanceData());
    const unsubTrp = subscribe('transport_updated', () => fetchFinanceData());
    const unsubTrpReq = subscribe('transport_requested', () => fetchFinanceData());
    return () => {
      unsubRev();
      unsubTx();
      unsubOrder();
      unsubTrp();
      unsubTrpReq();
    };
  }, [subscribe]);

  const handleOpenApproveModal = (job: TransportJob) => {
    setApprovingJob(job);
    setApprovalSuccessMsg('');
    setApprovalErrorMsg('');
    setPaymentVerifiedCheck(true);

    // Default driver selection
    if (job.recommendedDriverId) {
      setSelectedDriverId(String(job.recommendedDriverId));
    } else if (transportersList.length > 0) {
      setSelectedDriverId(String(transportersList[0].id));
    }

    setRecommendationNotes(
      `Driver vetted for ${job.pickupDistrict} to ${job.destinationDistrict} route. Vehicle capacity inspected & suitable for ${job.quantityKg} kg payload.`
    );
  };

  const handleConfirmApproval = async () => {
    if (!approvingJob || !selectedDriverId) return;

    if (!paymentVerifiedCheck) {
      setApprovalErrorMsg('You must verify that the farmer has paid the transport fee into escrow.');
      return;
    }

    setApprovalSubmitting(true);
    setApprovalErrorMsg('');

    try {
      const res = await fetch(`/api/transport/jobs/${approvingJob.id}/finance-approve-recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financeAdminUid: currentUser?.uid || 'finance-chisomo-05',
          financeAdminName: currentUser?.fullName || 'Chisomo Mwale (Finance Admin)',
          recommendedDriverId: selectedDriverId,
          recommendationNotes,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setApprovalSuccessMsg(`Driver successfully approved and recommended for Job #${updated.orderNumber}! Notifications sent to Farmer ${updated.farmerName} and Driver ${updated.transporterName}.`);
        setApprovingJob(null);
        fetchFinanceData();
      } else {
        const err = await res.json();
        setApprovalErrorMsg(err.error || 'Failed to approve transport fee and recommend driver');
      }
    } catch (err: any) {
      setApprovalErrorMsg(err.message || 'Network error occurred');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const pendingHireRequests = transportJobs.filter(
    (j) => j.status === 'pending_finance_approval' || j.paymentStatus === 'paid_pending_approval'
  );

  // Export to CSV function
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((obj) =>
      Object.values(obj)
        .map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-900 to-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-800/60 text-rose-200 border border-rose-700/40">
              <Coins className="w-3.5 h-3.5" />
              <span>Permanent Revenue & Escrow Ledger &bull; Auditable Finance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Platform Revenue & Financial Ledger
            </h1>
            <p className="text-rose-100 text-sm leading-relaxed">
              Every kwacha tracked via immutable database records. Real-time reconciliation of 4% commodity trade commissions, transport fees, and farmer disbursements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV(ledgerEntries, 'mhh-revenue-ledger')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Ledger (CSV)</span>
            </button>
            <button
              onClick={fetchFinanceData}
              className="p-2.5 rounded-xl bg-rose-800/50 hover:bg-rose-800 text-rose-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Highlight Cards */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-rose-800/60">
            <div>
              <div className="text-xs text-rose-200 font-medium">Total Platform Revenue (4%)</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                MWK {metrics.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-rose-200 font-medium">Today&apos;s Revenue</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 mt-0.5">
                MWK {metrics.todayRevenue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-rose-200 font-medium">Monthly Revenue</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                MWK {metrics.monthlyRevenue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-rose-200 font-medium">Gross Marketplace Volume</div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-300 mt-0.5">
                MWK {metrics.grossMarketplaceVolume.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'metrics'
              ? 'bg-rose-100 text-rose-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Revenue Analytics & Metrics</span>
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'bg-rose-100 text-rose-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Permanent Revenue Ledger ({ledgerEntries.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'transactions'
              ? 'bg-rose-100 text-rose-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Live Synchronized Transactions ({transactionsList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('transport_approvals')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'transport_approvals'
              ? 'bg-rose-100 text-rose-900'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-blue-700" />
          <span>Transport Escrow & Driver Recommendations</span>
          {pendingHireRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-bold animate-pulse">
              {pendingHireRequests.length} pending
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: REVENUE ANALYTICS */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                Commodity Trade Commissions (4%)
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-2">
                MWK {metrics.commodityCommissions.toLocaleString()}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Calculated dynamically as Commodity Trade Value &times; 0.04
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                Logistics & Haulage Facilitation
              </div>
              <div className="text-2xl font-extrabold text-blue-900 mt-2">
                MWK {metrics.transportRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Disbursed to licensed transporters upon delivery confirmation
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                Weekly Revenue (Past 7 Days)
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-2">
                MWK {metrics.weeklyRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Directly reconciled from settled orders in PostgreSQL
              </p>
            </div>
          </div>

          {/* Transaction Health breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-sm">Escrow Transaction Status Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-emerald-800 font-medium">Completed & Settled</div>
                  <div className="text-xl font-extrabold text-emerald-950">
                    {metrics.completedTransactions} transactions
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-amber-800 font-medium">In Escrow / Pending</div>
                  <div className="text-xl font-extrabold text-amber-950">
                    {metrics.pendingTransactions} orders
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-800">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-rose-800 font-medium">Cancelled & Archived</div>
                  <div className="text-xl font-extrabold text-rose-950">
                    {metrics.cancelledTransactions} transactions
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERMANENT REVENUE LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Permanent Revenue Ledger</h3>
              <p className="text-xs text-stone-500">
                Auditable financial ledger backing Malawi Harvest Hub platform earnings.
              </p>
            </div>
            <button
              onClick={() => exportToCSV(ledgerEntries, 'mhh-revenue-ledger')}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Revenue ID</th>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Gross Trade Value</th>
                  <th className="p-3">Commission Rate</th>
                  <th className="p-3">Commission Amount (MWK)</th>
                  <th className="p-3">Farmer Net</th>
                  <th className="p-3">Transport Fee</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-stone-400 font-sans">
                      No revenue ledger records found.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-stone-50/50">
                      <td className="p-3 font-bold text-stone-900">{entry.revenueId}</td>
                      <td className="p-3 text-stone-600">{entry.sourceOrderNumber}</td>
                      <td className="p-3 font-bold text-stone-900 font-sans">
                        MWK {Number(entry.grossTransactionAmount).toLocaleString()}
                      </td>
                      <td className="p-3 text-stone-600">
                        {(Number(entry.commissionRate) * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 font-bold text-rose-700 font-sans">
                        MWK {Number(entry.commissionAmount).toLocaleString()}
                      </td>
                      <td className="p-3 text-emerald-800 font-bold font-sans">
                        MWK {Number(entry.farmerEarnings).toLocaleString()}
                      </td>
                      <td className="p-3 text-blue-800 font-sans">
                        MWK {Number(entry.transportFee).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-emerald-100 text-emerald-800">
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-3 text-stone-400 whitespace-nowrap">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SYNCHRONIZED TRANSACTION LEDGER */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transaction ID, order, farmer..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-rose-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={txStatusFilter}
                onChange={(e) => setTxStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white"
              >
                <option value="All">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                onClick={() => exportToCSV(transactionsList, 'mhh-transactions')}
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Tx ID</th>
                    <th className="p-3">Order Number</th>
                    <th className="p-3">Farmer & Buyer</th>
                    <th className="p-3">Commodity</th>
                    <th className="p-3">Gross Amount</th>
                    <th className="p-3">4% Commission</th>
                    <th className="p-3">Farmer Net</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                  {transactionsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-stone-400 font-sans">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactionsList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-stone-50/50">
                        <td className="p-3 font-bold text-stone-900">{tx.transactionId}</td>
                        <td className="p-3 text-stone-600">{tx.orderNumber}</td>
                        <td className="p-3 font-sans text-stone-700">
                          <div>F: <strong>{tx.farmerName}</strong></div>
                          <div>B: {tx.buyerName}</div>
                        </td>
                        <td className="p-3 font-sans text-stone-800">{tx.commodityName}</td>
                        <td className="p-3 font-bold text-stone-900 font-sans">
                          MWK {Number(tx.grossAmount).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-rose-700 font-sans">
                          MWK {Number(tx.platformCommission).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-emerald-800 font-sans">
                          MWK {Number(tx.netFarmerAmount).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              tx.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 text-stone-500 font-sans text-[10px]">
                          {tx.paymentMethod || 'Airtel Money / TNM Mpamba'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRANSPORT ESCROW APPROVALS & DRIVER RECOMMENDATIONS */}
      {activeTab === 'transport_approvals' && (
        <div className="space-y-6">
          {/* Explainer card */}
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-blue-950">
                Finance Administrator Transport Escrow & Driver Recommendation Control
              </h4>
              <p className="leading-relaxed">
                When a smallholder farmer books agricultural transport, the Finance Administrator must <strong>verify that the farmer has paid the fee</strong> into platform escrow (via Airtel Money, Mpamba, or Bank transfer), <strong>approve the driver</strong>, and <strong>recommend the driver to the farmer</strong> with official inspection notes.
              </p>
            </div>
          </div>

          {approvalSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{approvalSuccessMsg}</span>
            </div>
          )}

          {/* Pending Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <span>Pending Farmer Fee Verification & Driver Recommendations</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  {pendingHireRequests.length} Pending
                </span>
              </h3>
            </div>

            {pendingHireRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-xs">
                No transport hire requests currently awaiting payment verification. All contracts are reconciled!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingHireRequests.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 space-y-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-sm">
                            {job.commodityName} ({job.quantityKg.toLocaleString()} Kg)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                            #{job.orderNumber}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          Farmer: <strong className="text-stone-800">{job.farmerName}</strong> &bull; Phone: <span className="font-mono">{job.farmerPhone || '+265 888 123 456'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-bold text-stone-900">
                            MWK {Number(job.transportFee).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-amber-700 font-semibold">
                            Ref: {job.paymentRef} ({job.paymentMethod})
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenApproveModal(job)}
                          className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Verify Fee & Recommend Driver</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">Corridor Route</span>
                        <span className="font-medium text-stone-800">
                          {job.pickupLocation} ({job.pickupDistrict}) &rarr; {job.destinationLocation} ({job.destinationDistrict})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">Vehicle Needed</span>
                        <span className="font-medium text-stone-800">{job.requiredVehicleType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block font-semibold">Preferred Date</span>
                        <span className="font-medium text-stone-800">{job.preferredDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Transport Contracts History */}
          <div className="space-y-3 pt-4">
            <h3 className="font-bold text-stone-900 text-sm">
              All Transport Contracts & Dispatches ({transportJobs.length})
            </h3>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Farmer</th>
                      <th className="p-3">Commodity & Route</th>
                      <th className="p-3">Fee (MWK)</th>
                      <th className="p-3">Payment Status</th>
                      <th className="p-3">Recommended Driver</th>
                      <th className="p-3">Job Status</th>
                      <th className="p-3">Finance Approval Stamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {transportJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-stone-50/50">
                        <td className="p-3 font-mono font-bold text-stone-900">#{job.orderNumber}</td>
                        <td className="p-3 font-medium text-stone-800">{job.farmerName || 'Farmer'}</td>
                        <td className="p-3 text-stone-600">
                          <div><strong>{job.commodityName}</strong> ({job.quantityKg} Kg)</div>
                          <div className="text-[10px] text-stone-400">
                            {job.pickupDistrict} &rarr; {job.destinationDistrict}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-stone-900">
                          MK {Number(job.transportFee).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              job.paymentStatus === 'verified_by_finance'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {job.paymentStatus === 'verified_by_finance' ? 'Verified in Escrow' : 'Pending Verification'}
                          </span>
                        </td>
                        <td className="p-3">
                          {job.recommendedDriverName || job.transporterName ? (
                            <div>
                              <div className="font-bold text-blue-900">
                                {job.recommendedDriverName || job.transporterName}
                              </div>
                              <div className="text-[10px] text-stone-400">
                                {job.transporterPhone || '+265 882 776 543'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">Not Assigned</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800 capitalize">
                            {job.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-stone-500">
                          {job.financeApprovedBy ? (
                            <div>
                              <span className="font-bold text-emerald-800">Approved</span>
                              <div className="text-[10px] text-stone-400">by {job.financeApprovedBy}</div>
                            </div>
                          ) : (
                            <span className="text-amber-700 font-semibold text-[10px]">Awaiting Stamp</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* APPROVAL & DRIVER RECOMMENDATION MODAL */}
          {approvingJob && (
            <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900 text-base">
                      Verify Fee & Recommend Driver
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Job #{approvingJob.orderNumber} &bull; Farmer {approvingJob.farmerName}
                    </p>
                  </div>
                  <button
                    onClick={() => setApprovingJob(null)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                  >
                    &times;
                  </button>
                </div>

                {approvalErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {approvalErrorMsg}
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Commodity:</span>
                    <span className="font-bold text-stone-900">
                      {approvingJob.commodityName} ({approvingJob.quantityKg} Kg)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Route:</span>
                    <span className="font-medium text-stone-800">
                      {approvingJob.pickupDistrict} &rarr; {approvingJob.destinationDistrict}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Transport Fee:</span>
                    <span className="font-extrabold text-blue-900 text-sm">
                      MWK {Number(approvingJob.transportFee).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Escrow Payment Ref:</span>
                    <span className="font-mono font-bold text-stone-800">
                      {approvingJob.paymentRef} ({approvingJob.paymentMethod})
                    </span>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Step 1: Verification confirmation */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentVerifiedCheck}
                      onChange={(e) => setPaymentVerifiedCheck(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <div className="text-emerald-950 font-medium leading-relaxed">
                      <strong>Fee Verification Confirmed:</strong> I certify that the farmer's transport fee payment of MWK {Number(approvingJob.transportFee).toLocaleString()} has cleared in the platform escrow account.
                    </div>
                  </label>

                  {/* Step 2: Driver Selection */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Select Driver to Recommend & Assign *
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white font-medium text-xs focus:outline-blue-600"
                    >
                      {transportersList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} &bull; {d.vehicleType || 'Truck'} ({d.vehicleRegistration || 'BW 4921'}) &bull; {d.district}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 3: Recommendation notes */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Official Recommendation & Inspection Notes to Farmer *
                    </label>
                    <textarea
                      rows={3}
                      value={recommendationNotes}
                      onChange={(e) => setRecommendationNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-blue-600"
                      placeholder="e.g. Driver vetted with verified transit record on Mchinji-Lilongwe corridor. Vehicle inspected & suitable for payload."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setApprovingJob(null)}
                    className="px-4 py-2 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmApproval}
                    disabled={approvalSubmitting || !selectedDriverId}
                    className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{approvalSubmitting ? 'Approving...' : 'Approve Fee & Recommend Driver'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
