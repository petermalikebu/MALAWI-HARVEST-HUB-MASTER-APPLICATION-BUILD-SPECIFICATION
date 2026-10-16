import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { RevenueMetrics, RevenueLedgerEntry, Transaction, TransportJob, User, Order } from '../../types/index.ts';
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
  Send,
  UserCheck,
} from 'lucide-react';

export const FinanceDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<RevenueLedgerEntry[]>([]);
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);
  const [transportJobs, setTransportJobs] = useState<TransportJob[]>([]);
  const [transportersList, setTransportersList] = useState<User[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'buyer_approvals' | 'metrics' | 'ledger' | 'transactions' | 'transport_approvals'>('buyer_approvals');
  const [loading, setLoading] = useState(true);

  // Filters for transactions
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('All');

  // Transport Approval modal state
  const [approvingJob, setApprovingJob] = useState<TransportJob | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [recommendationNotes, setRecommendationNotes] = useState<string>('');
  const [paymentVerifiedCheck, setPaymentVerifiedCheck] = useState<boolean>(true);
  const [approvalSubmitting, setApprovalSubmitting] = useState<boolean>(false);
  const [approvalSuccessMsg, setApprovalSuccessMsg] = useState<string>('');
  const [approvalErrorMsg, setApprovalErrorMsg] = useState<string>('');

  // Buyer Order Escrow Approval modal state
  const [approvingOrder, setApprovingOrder] = useState<Order | null>(null);
  const [orderApprovalNotes, setOrderApprovalNotes] = useState<string>('');
  const [orderApprovalSubmitting, setOrderApprovalSubmitting] = useState<boolean>(false);

  // Disburse Payout to Farmer modal state
  const [disbursingOrder, setDisbursingOrder] = useState<Order | null>(null);
  const [disbursementMethod, setDisbursementMethod] = useState<'airtel_money' | 'tnm_mpamba' | 'nbs_bank'>('airtel_money');
  const [farmerPayoutPhone, setFarmerPayoutPhone] = useState<string>('');
  const [disbursementRef, setDisbursementRef] = useState<string>('');
  const [disbursementSubmitting, setDisbursementSubmitting] = useState<boolean>(false);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [mRes, lRes, tRes, jRes, driversRes, ordRes] = await Promise.all([
        fetch('/api/finance/revenue'),
        fetch('/api/finance/ledger'),
        fetch(`/api/finance/transactions?status=${txStatusFilter}&search=${encodeURIComponent(txSearch)}`),
        fetch('/api/transport/jobs'),
        fetch('/api/users?role=transporter'),
        fetch('/api/orders'),
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (lRes.ok) setLedgerEntries(await lRes.json());
      if (tRes.ok) setTransactionsList(await tRes.json());
      if (jRes.ok) setTransportJobs(await jRes.json());
      if (driversRes.ok) setTransportersList(await driversRes.json());
      if (ordRes.ok) setOrdersList(await ordRes.json());
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
    const unsubCommRate = subscribe('commission_rate_updated', () => fetchFinanceData());
    const unsubSetting = subscribe('setting_updated', (data: any) => {
      if (data?.key === 'commission_rate') fetchFinanceData();
    });
    return () => {
      unsubRev();
      unsubTx();
      unsubOrder();
      unsubTrp();
      unsubTrpReq();
      unsubCommRate();
      unsubSetting();
    };
  }, [subscribe]);

  // Buyer Payment Approval Handlers
  const handleOpenBuyerApproveModal = (ord: Order) => {
    setApprovingOrder(ord);
    setOrderApprovalNotes(`Verified buyer deposit of MWK ${Number(ord.totalAmount).toLocaleString()} on ${ord.paymentMethod || 'Escrow'} statement (Ref: ${ord.paymentRef || 'N/A'}).`);
    setApprovalSuccessMsg('');
    setApprovalErrorMsg('');
  };

  const handleConfirmBuyerApprove = async () => {
    if (!approvingOrder) return;
    setOrderApprovalSubmitting(true);
    setApprovalErrorMsg('');
    try {
      const res = await fetch(`/api/orders/${approvingOrder.id}/finance-approve-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financeAdminUid: currentUser?.uid || 'frF3xukObzdA8AhCBYIBPYV0UK13',
          financeAdminName: currentUser?.fullName || 'Peter Malikebu (Lead Admin)',
          notes: orderApprovalNotes,
        }),
      });

      if (res.ok) {
        setApprovalSuccessMsg(`Payment of MWK ${Number(approvingOrder.totalAmount).toLocaleString()} successfully approved into Escrow for Order #${approvingOrder.orderNumber}! Farmer ${approvingOrder.farmerName} has been reassured and prompted to confirm the order.`);
        setApprovingOrder(null);
        fetchFinanceData();
      } else {
        const err = await res.json();
        setApprovalErrorMsg(err.error || 'Failed to approve payment');
      }
    } catch (err: any) {
      setApprovalErrorMsg(err.message || 'Network error');
    } finally {
      setOrderApprovalSubmitting(false);
    }
  };

  // Farmer Payout Disbursement Handlers
  const handleOpenDisburseModal = (ord: Order) => {
    setDisbursingOrder(ord);
    setFarmerPayoutPhone(ord.farmerPhone || '+265 999 036 912');
    setDisbursementRef(`DSB-${Date.now().toString().slice(-6)}`);
    setApprovalSuccessMsg('');
    setApprovalErrorMsg('');
  };

  const handleConfirmDisbursement = async () => {
    if (!disbursingOrder) return;
    setDisbursementSubmitting(true);
    setApprovalErrorMsg('');
    try {
      const grossAmount = Number(disbursingOrder.commoditySubtotal);
      const activeRate = metrics?.commissionRate || 0.04;
      const commissionFee = Number(disbursingOrder.platformCommissionFee) || Math.round(grossAmount * activeRate);
      const netPayout = grossAmount - commissionFee;

      const formattedPayoutChannel =
        disbursementMethod === 'airtel_money'
          ? `Airtel Money (${farmerPayoutPhone || disbursingOrder.farmerPhone})`
          : disbursementMethod === 'tnm_mpamba'
          ? `TNM Mpamba (${farmerPayoutPhone || disbursingOrder.farmerPhone})`
          : `NBS Bank (${farmerPayoutPhone || disbursingOrder.farmerPhone})`;

      const res = await fetch(`/api/orders/${disbursingOrder.id}/finance-disburse-funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financeAdminUid: currentUser?.uid || 'frF3xukObzdA8AhCBYIBPYV0UK13',
          financeAdminName: currentUser?.fullName || 'Financial Administrator',
          payoutMethod: formattedPayoutChannel,
          payoutRef: disbursementRef,
          notes: `Sent net payout of MWK ${netPayout.toLocaleString()} directly to farmer after full confirmation.`,
        }),
      });

      if (res.ok) {
        setApprovalSuccessMsg(`Success! Farmer Payout of MWK ${netPayout.toLocaleString()} has been sent to Farmer ${disbursingOrder.farmerName} via ${formattedPayoutChannel} (Ref: ${disbursementRef})! Transaction completed.`);
        setDisbursingOrder(null);
        fetchFinanceData();
      } else {
        const err = await res.json();
        setApprovalErrorMsg(err.error || 'Failed to disburse payout');
      }
    } catch (err: any) {
      setApprovalErrorMsg(err.message || 'Network error');
    } finally {
      setDisbursementSubmitting(false);
    }
  };

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
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-800/60 text-rose-200 border border-rose-700/40">
                <Coins className="w-3.5 h-3.5" />
                <span>Permanent Revenue & Escrow Ledger &bull; Auditable Finance</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active Platform Commission: {metrics ? (metrics.commissionRate * 100).toFixed(1) : '4.0'}%</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Platform Revenue &amp; Financial Ledger
            </h1>
            <p className="text-rose-100 text-sm leading-relaxed">
              Every kwacha tracked via immutable database records. Real-time reconciliation of {metrics ? (metrics.commissionRate * 100).toFixed(1) : '4.0'}% commodity trade commissions, transport fees, and farmer disbursements.
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
              <div className="text-xs text-rose-200 font-medium">Total Platform Revenue ({((metrics.commissionRate ?? 0.04) * 100).toFixed(1)}%)</div>
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
          onClick={() => setActiveTab('buyer_approvals')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'buyer_approvals'
              ? 'bg-rose-100 text-rose-900 font-extrabold shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-rose-700" />
          <span>Buyer Escrow Approvals &amp; Farmer Payouts</span>
          {ordersList.filter((o) => o.paymentStatus === 'escrow_pending_finance_approval').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-bold animate-pulse">
              {ordersList.filter((o) => o.paymentStatus === 'escrow_pending_finance_approval').length} pending
            </span>
          )}
        </button>
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

      {/* FEEDBACK BANNERS */}
      {approvalSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{approvalSuccessMsg}</span>
          </div>
          <button onClick={() => setApprovalSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 font-bold">&times;</button>
        </div>
      )}

      {approvalErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{approvalErrorMsg}</span>
          </div>
          <button onClick={() => setApprovalErrorMsg('')} className="text-rose-700 hover:text-rose-900 font-bold">&times;</button>
        </div>
      )}

      {/* TAB 0: BUYER ESCROW APPROVALS & FARMER PAYOUTS */}
      {activeTab === 'buyer_approvals' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/80 text-rose-950 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-700 shrink-0" />
              <h3 className="font-extrabold text-sm text-stone-900">
                Official Escrow Payment Verification &amp; Farmer Payout Terminal
              </h3>
            </div>
            <p className="text-stone-700 leading-relaxed max-w-3xl">
              Wholesale buyers deposit funds for commodity purchases into the platform's official accounts: 
              <strong> Airtel Money (+265 999 036 912)</strong>, 
              <strong> TNM Mpamba (+265 895 357 535)</strong>, 
              <strong> National Bank of Malawi (Peter Adrian Malikebu - Acc: 1011619688)</strong>, or 
              <strong> National Bank of Malawi (Joshua Malikebu - Acc: 1013388772)</strong>. 
              As Financial Administrator, you verify the transaction on the bank/mobile ledger, lock the funds into platform escrow, reassure the farmer to confirm and dispatch goods, and disburse the money received directly to the farmer at the end!
            </p>
          </div>

          {/* Quick Metrics for Escrow Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Pending Deposits</div>
              <div className="text-xl font-extrabold text-amber-700 mt-1">
                {ordersList.filter((o) => o.paymentStatus === 'escrow_pending_finance_approval').length} Orders
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Awaiting Financial Admin verification</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Secured in Escrow</div>
              <div className="text-xl font-extrabold text-blue-700 mt-1">
                {ordersList.filter((o) => o.paymentStatus === 'escrow_held' && !o.farmerConfirmedAt).length} Orders
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Awaiting Farmer Confirmation</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Farmer Confirmed</div>
              <div className="text-xl font-extrabold text-emerald-700 mt-1">
                {ordersList.filter((o) => o.paymentStatus === 'escrow_held' && o.farmerConfirmedAt).length} Orders
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Ready for transit &amp; final payout</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Disbursed to Farmers</div>
              <div className="text-xl font-extrabold text-purple-700 mt-1">
                {ordersList.filter((o) => o.paymentStatus === 'disbursed_to_farmer').length} Settled
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Funds fully released to farmers</div>
            </div>
          </div>

          {/* SECTION 1: PENDING BUYER DEPOSIT VERIFICATIONS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                <span>1. Pending Buyer Deposits (Requires Financial Admin Approval)</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {ordersList.filter((o) => o.paymentStatus === 'escrow_pending_finance_approval').length} Action Required
                </span>
              </h3>
            </div>

            {ordersList.filter((o) => o.paymentStatus === 'escrow_pending_finance_approval').length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-xs">
                No buyer deposits currently pending verification. All submitted payments have been reconciled!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {ordersList
                  .filter((o) => o.paymentStatus === 'escrow_pending_finance_approval')
                  .map((ord) => {
                    const gross = Number(ord.totalAmount);
                    const activeRate = metrics?.commissionRate || 0.04;
                    const comm = Number(ord.platformCommissionFee) || Math.round(Number(ord.commoditySubtotal) * activeRate);
                    const netFarmer = Number(ord.commoditySubtotal) - comm;

                    return (
                      <div
                        key={ord.id}
                        className="bg-white rounded-2xl border-2 border-amber-300 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 animate-in fade-in duration-200"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-md">
                              {ord.orderNumber}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Pending Verification</span>
                            </span>
                            <span className="text-xs text-stone-400">
                              Placed: {ord.createdAt ? new Date(ord.createdAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-stone-900 text-base">
                              {ord.quantity.toLocaleString()} {ord.unit} &bull; {ord.commodityName}
                            </h4>
                            <div className="text-xs text-stone-600 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <strong>Buyer:</strong> {ord.buyerName} ({ord.buyerPhone || 'Contact on file'})
                                <div className="text-[11px] text-stone-500">Destination: {ord.deliveryLocation}, {ord.deliveryDistrict}</div>
                              </div>
                              <div>
                                <strong>Farmer:</strong> {ord.farmerName} ({ord.farmerPhone || 'Contact on file'})
                              </div>
                            </div>
                          </div>

                          {/* Payment Channel & Ref */}
                          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex flex-wrap items-center gap-4">
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase font-bold">Payment Method Used:</span>
                              <span className="font-bold text-stone-800">{ord.paymentMethod || 'Airtel Money (+265 999 036 912)'}</span>
                            </div>
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase font-bold">Transaction Reference / SMS Code:</span>
                              <span className="font-mono font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {ord.paymentRef || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount breakdown */}
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-right space-y-1 min-w-[210px] w-full lg:w-auto">
                          <div className="text-[11px] text-stone-400 uppercase font-semibold">Total Deposit to Escrow</div>
                          <div className="text-xl font-extrabold text-stone-900">
                            MWK {gross.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-rose-600 font-medium">
                            Platform {(activeRate * 100).toFixed(1)}% Commission: MWK {comm.toLocaleString()}
                          </div>
                          <div className="pt-1 border-t border-stone-200 text-xs font-bold text-emerald-800">
                            Net Farmer Payout: MWK {netFarmer.toLocaleString()}
                          </div>
                        </div>

                        {/* Action: Approve Payment */}
                        <div className="w-full lg:w-auto shrink-0 flex flex-col gap-2">
                          <button
                            onClick={() => handleOpenBuyerApproveModal(ord)}
                            className="w-full lg:w-auto px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Verify &amp; Approve Escrow Receipt</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* SECTION 2: ESCROW HELD & FARMER CONFIRMATION PIPELINE */}
          <div className="space-y-3 pt-4 border-t border-stone-200">
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <span>2. Escrow Secured &amp; Farmer Fulfillment Tracking</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {ordersList.filter((o) => o.paymentStatus === 'escrow_held').length} In Escrow
              </span>
            </h3>

            {ordersList.filter((o) => o.paymentStatus === 'escrow_held').length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center text-stone-400 text-xs">
                No active orders currently held in Escrow.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {ordersList
                  .filter((o) => o.paymentStatus === 'escrow_held')
                  .map((ord) => {
                    const gross = Number(ord.totalAmount);
                    const activeRate = metrics?.commissionRate || 0.04;
                    const comm = Number(ord.platformCommissionFee) || Math.round(Number(ord.commoditySubtotal) * activeRate);
                    const netFarmer = Number(ord.commoditySubtotal) - comm;

                    return (
                      <div
                        key={ord.id}
                        className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                              {ord.orderNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Escrow Verified</span>
                            </span>
                            {ord.farmerConfirmedAt ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-purple-600" />
                                <span>Farmer Confirmed Purchase</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Awaiting Farmer Confirmation</span>
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-stone-900 text-sm">
                            {ord.quantity.toLocaleString()} {ord.unit} {ord.commodityName} &bull; Buyer: {ord.buyerName} &bull; Farmer: {ord.farmerName}
                          </h4>

                          <div className="text-xs text-stone-500">
                            Payment Channel: <strong>{ord.paymentMethod}</strong> (Ref: {ord.paymentRef})
                            {ord.financeApprovedBy && ` &bull; Approved by: ${ord.financeApprovedBy}`}
                          </div>
                        </div>

                        {/* Financial Net Payout */}
                        <div className="text-right bg-stone-50 p-3 rounded-xl border border-stone-100 min-w-[200px]">
                          <div className="text-[10px] text-stone-400 font-bold uppercase">Net Farmer Payout</div>
                          <div className="text-base font-extrabold text-emerald-800">
                            MWK {netFarmer.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            Gross: MWK {gross.toLocaleString()} ({(activeRate * 100).toFixed(1)}% fee: MWK {comm.toLocaleString()})
                          </div>
                        </div>

                        {/* Action: Disburse Funds to Farmer */}
                        <div className="shrink-0 w-full lg:w-auto">
                          <button
                            onClick={() => handleOpenDisburseModal(ord)}
                            className="w-full lg:w-auto px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send / Disburse Funds to Farmer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* SECTION 3: COMPLETED & DISBURSED TO FARMERS */}
          <div className="space-y-3 pt-4 border-t border-stone-200">
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <span>3. Disbursed Payouts to Farmers (Settled)</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
                {ordersList.filter((o) => o.paymentStatus === 'disbursed_to_farmer').length} Settled
              </span>
            </h3>

            {ordersList.filter((o) => o.paymentStatus === 'disbursed_to_farmer').length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center text-stone-400 text-xs">
                No settled payouts recorded yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Commodity</th>
                      <th className="p-3">Farmer</th>
                      <th className="p-3">Gross</th>
                      <th className="p-3">{metrics ? (metrics.commissionRate * 100).toFixed(1) : '4.0'}% Fee</th>
                      <th className="p-3">Disbursed to Farmer</th>
                      <th className="p-3">Payout Ref</th>
                      <th className="p-3">Disbursed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                    {ordersList
                      .filter((o) => o.paymentStatus === 'disbursed_to_farmer')
                      .map((ord) => {
                        const gross = Number(ord.commoditySubtotal);
                        const comm = Number(ord.platformCommissionFee);
                        const netFarmer = gross - comm;

                        return (
                          <tr key={ord.id} className="hover:bg-stone-50/50">
                            <td className="p-3 font-bold text-stone-900">{ord.orderNumber}</td>
                            <td className="p-3 text-stone-700 font-sans">{ord.commodityName} ({ord.quantity} {ord.unit})</td>
                            <td className="p-3 text-stone-900 font-bold font-sans">{ord.farmerName}</td>
                            <td className="p-3 font-sans">MWK {gross.toLocaleString()}</td>
                            <td className="p-3 text-rose-700 font-sans">MWK {comm.toLocaleString()}</td>
                            <td className="p-3 text-emerald-800 font-extrabold font-sans">MWK {netFarmer.toLocaleString()}</td>
                            <td className="p-3 text-stone-600">{ord.disbursedRef || 'N/A'}</td>
                            <td className="p-3 text-stone-400 whitespace-nowrap">
                              {ord.disbursedAt ? new Date(ord.disbursedAt).toLocaleDateString() : 'Settled'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: REVENUE ANALYTICS */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                Commodity Trade Commissions ({((metrics.commissionRate ?? 0.04) * 100).toFixed(1)}%)
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-2">
                MWK {metrics.commodityCommissions.toLocaleString()}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Calculated dynamically as Commodity Trade Value &times; {metrics.commissionRate ?? 0.04}
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

      {/* MODAL: VERIFY & APPROVE BUYER PAYMENT INTO ESCROW */}
      {approvingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    Verify Buyer Escrow Payment
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Order #{approvingOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovingOrder(null)}
                className="text-stone-400 hover:text-stone-700 text-lg p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Commodity &amp; Quantity:</span>
                <span className="font-bold text-stone-900">
                  {approvingOrder.quantity.toLocaleString()} {approvingOrder.unit} {approvingOrder.commodityName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Buyer Depositor:</span>
                <span className="font-medium text-stone-800">
                  {approvingOrder.buyerName} ({approvingOrder.buyerPhone || 'No phone'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Beneficiary Farmer:</span>
                <span className="font-medium text-stone-800">
                  {approvingOrder.farmerName} ({approvingOrder.farmerPhone || 'No phone'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Channel Paid To:</span>
                <span className="font-bold text-stone-800">
                  {approvingOrder.paymentMethod || 'Airtel Money (+265 999 036 912)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Transaction Ref / SMS Code:</span>
                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {approvingOrder.paymentRef || 'N/A'}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex justify-between font-extrabold text-sm text-stone-900">
                <span>Total Escrow Amount:</span>
                <span className="text-emerald-800">MWK {Number(approvingOrder.totalAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Verification Audit Notes *
                </label>
                <textarea
                  rows={2}
                  value={orderApprovalNotes}
                  onChange={(e) => setOrderApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-emerald-600 font-medium"
                  placeholder="e.g. Verified deposit on Airtel Money (+265 999 036 912) statement matching SMS code."
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
                <strong>Next Step:</strong> Approving this deposit confirms the buyer's payment into Escrow and immediately notifies Farmer <strong>{approvingOrder.farmerName}</strong> to confirm the purchase and authorize dispatch.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setApprovingOrder(null)}
                className="px-4 py-2 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBuyerApprove}
                disabled={orderApprovalSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{orderApprovalSubmitting ? 'Verifying...' : 'Approve & Lock Funds in Escrow'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISBURSE PAYOUT TO FARMER */}
      {disbursingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    Disburse Payout to Farmer
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Order #{disbursingOrder.orderNumber} &bull; Farmer {disbursingOrder.farmerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDisbursingOrder(null)}
                className="text-stone-400 hover:text-stone-700 text-lg p-1"
              >
                &times;
              </button>
            </div>

            {/* Financial Ledger Calculation */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Gross Commodity Subtotal:</span>
                <span className="font-semibold text-stone-900">
                  MWK {Number(disbursingOrder.commoditySubtotal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Platform Commission Fee (4%):</span>
                <span className="font-medium text-rose-600">
                  -MWK {Number(disbursingOrder.platformCommissionFee).toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex justify-between font-extrabold text-base text-stone-900">
                <span>Net Farmer Payout:</span>
                <span className="text-emerald-800">
                  MWK {(Number(disbursingOrder.commoditySubtotal) - Number(disbursingOrder.platformCommissionFee)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Farmer Payout Channel *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('airtel_money')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs ${
                      disbursementMethod === 'airtel_money'
                        ? 'border-red-600 bg-red-50 text-red-700 ring-2 ring-red-500/20'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    Airtel Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('tnm_mpamba')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs ${
                      disbursementMethod === 'tnm_mpamba'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    TNM Mpamba
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('nbs_bank')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs ${
                      disbursementMethod === 'nbs_bank'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    NBS Bank
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Farmer Phone / Bank Account for Disbursement *
                </label>
                <input
                  type="text"
                  required
                  value={farmerPayoutPhone}
                  onChange={(e) => setFarmerPayoutPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium text-xs focus:outline-purple-600"
                  placeholder="+265 999 036 912 or Bank Account Number"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Disbursement Transaction Reference *
                </label>
                <input
                  type="text"
                  required
                  value={disbursementRef}
                  onChange={(e) => setDisbursementRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold text-xs focus:outline-purple-600"
                  placeholder="e.g. DSB-923812"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 leading-relaxed">
                Confirming disbursement sends the received funds to Farmer <strong>{disbursingOrder.farmerName}</strong>, records the entry into the permanent revenue ledger, and completes Order #{disbursingOrder.orderNumber}.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDisbursingOrder(null)}
                className="px-4 py-2 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisbursement}
                disabled={disbursementSubmitting}
                className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>{disbursementSubmitting ? 'Sending Funds...' : 'Send Payout to Farmer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
