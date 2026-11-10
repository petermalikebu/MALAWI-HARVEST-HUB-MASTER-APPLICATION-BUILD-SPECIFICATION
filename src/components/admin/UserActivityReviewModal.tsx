import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { User, UserActivityReview } from '../../types/index.ts';
import { safeParseResponse } from '../../lib/api.ts';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  User as UserIcon,
  ShoppingBag,
  Truck,
  MessageSquare,
  FileText,
  Clock,
  Trash2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface UserActivityReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: () => void;
}

export const UserActivityReviewModal: React.FC<UserActivityReviewModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
}) => {
  const { currentUser } = useAuth();

  const [reviewData, setReviewData] = useState<UserActivityReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'orders' | 'commodities' | 'audit'>('overview');
  const [assessmentFindings, setAssessmentFindings] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('Account misuse detected following administrative activity review.');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isLeadAdmin =
    user?.uid === 'frF3xukObzdA8AhCBYIBPYV0UK13' ||
    user?.uid === '9DXK6Cfy4FaODmqyVm7q8yrKup82' ||
    user?.email === 'petermalikebujr@gmail.com' ||
    user?.email === 'joshuamalikebu927@gmail.com' ||
    (user?.fullName || '').toLowerCase().includes('malikebu');

  const fetchDossier = async () => {
    if (!user) return;
    setLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/activity-review`);
      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setReviewData(parsed.data);
      } else {
        setActionFeedback({ type: 'error', message: parsed.error || 'Failed to fetch user dossier' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Error communicating with server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchDossier();
      setActiveTab('overview');
      setAssessmentFindings('');
    }
  }, [isOpen, user]);

  const handleSuspend = async () => {
    if (!user || isLeadAdmin) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: suspensionReason,
          adminUid: currentUser?.uid,
          adminName: currentUser?.fullName,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setActionFeedback({ type: 'success', message: `User ${user.fullName} has been suspended.` });
        onUserUpdated();
        fetchDossier();
      } else {
        setActionFeedback({ type: 'error', message: parsed.error || 'Failed to suspend user' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to suspend user' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReinstate = async () => {
    if (!user) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reinstate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUid: currentUser?.uid,
          adminName: currentUser?.fullName,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setActionFeedback({ type: 'success', message: `User ${user.fullName} has been reinstated to active status.` });
        onUserUpdated();
        fetchDossier();
      } else {
        setActionFeedback({ type: 'error', message: parsed.error || 'Failed to reinstate user' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to reinstate user' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAssessAndRemove = async () => {
    if (!user || isLeadAdmin) return;
    if (!assessmentFindings.trim()) {
      setActionFeedback({
        type: 'error',
        message: 'Please document the formal assessment findings explaining why the user was found guilty before removal.',
      });
      return;
    }

    const confirmRemoval = window.confirm(
      `Are you sure you want to permanently expel and remove ${user.fullName} from Mbewalink after assessment? This action will cancel open transactions and cannot be undone.`
    );
    if (!confirmRemoval) return;

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/assess-remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentFindings: assessmentFindings.trim(),
          adminUid: currentUser?.uid,
          adminName: currentUser?.fullName,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        alert(`User ${user.fullName} was assessed and permanently removed from the platform.`);
        onUserUpdated();
        onClose();
      } else {
        setActionFeedback({ type: 'error', message: parsed.error || 'Failed to remove user after assessment' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to execute removal' });
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-[740px] max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-white font-bold">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  User Activity Dossier &bull; {user.fullName}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-800 text-stone-300 border border-stone-700">
                  {user.role}
                </span>
                {user.status === 'suspended' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    Suspended
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Active
                  </span>
                )}
              </div>
              <div className="text-[11px] text-stone-400 flex items-center gap-2">
                <span>{user.email}</span>
                <span>&bull;</span>
                <span>{user.phoneNumber || 'No phone'}</span>
                <span>&bull;</span>
                <span>{user.district} ({user.region})</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {actionFeedback && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <span>{actionFeedback.message}</span>
            <button onClick={() => setActionFeedback(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-4 bg-stone-100 border-b border-stone-200 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2.5 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-700 text-emerald-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Overview & Scorecard
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-3 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'messages'
                ? 'border-emerald-700 text-emerald-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Direct Messages</span>
            {reviewData?.stats.flagsCount ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {reviewData.stats.flagsCount}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-2.5 border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-emerald-700 text-emerald-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Orders ({reviewData?.orders.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('commodities')}
            className={`px-3 py-2.5 border-b-2 transition-colors ${
              activeTab === 'commodities'
                ? 'border-emerald-700 text-emerald-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Listings ({reviewData?.commodities.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-2.5 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-emerald-700 text-emerald-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Platform Audit Trail ({reviewData?.auditLogs.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-stone-50/50">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-stone-400 text-xs">
              <Clock className="w-8 h-8 animate-spin mb-3 text-stone-400" />
              <span>Analyzing user activities and cross-referencing audit logs...</span>
            </div>
          ) : !reviewData ? (
            <div className="p-8 text-center text-stone-500 text-sm">Failed to load dossier.</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Risk Scorecard */}
                  <div
                    className={`p-4 rounded-xl border ${
                      reviewData.riskAssessment.riskLevel === 'critical'
                        ? 'bg-rose-50 border-rose-300 text-rose-950'
                        : reviewData.riskAssessment.riskLevel === 'high'
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : reviewData.riskAssessment.riskLevel === 'medium'
                        ? 'bg-yellow-50 border-yellow-300 text-yellow-950'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        <h4 className="font-bold text-sm">
                          Automated Integrity Scorecard &bull; Risk Level:{' '}
                          <span className="uppercase font-extrabold">{reviewData.riskAssessment.riskLevel}</span>
                        </h4>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/70">
                        Recommendation: <strong className="uppercase">{reviewData.riskAssessment.recommendation}</strong>
                      </span>
                    </div>

                    {reviewData.riskAssessment.suspiciousFlags.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-bold">Detected Suspicious Indicators:</div>
                        {reviewData.riskAssessment.suspiciousFlags.map((flag, idx) => (
                          <div key={idx} className="text-xs flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs mt-1 text-emerald-800">
                        No policy violations or off-platform payment attempts detected in direct messages or transactions.
                      </p>
                    )}
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <div className="text-[11px] font-semibold text-stone-500 uppercase">Commodity Volume</div>
                      <div className="text-lg font-bold text-stone-900 mt-1">
                        MWK {reviewData.stats.totalCommoditiesValueMwk.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {reviewData.stats.commoditiesCount} total listings ({reviewData.stats.activeCommoditiesCount} active)
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <div className="text-[11px] font-semibold text-stone-500 uppercase">Order Operations</div>
                      <div className="text-lg font-bold text-stone-900 mt-1">
                        {reviewData.orders.length} Orders
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {reviewData.stats.completedOrdersCount} completed &bull; {reviewData.stats.cancelledOrdersCount} cancelled
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <div className="text-[11px] font-semibold text-stone-500 uppercase">Direct Messages</div>
                      <div className="text-lg font-bold text-stone-900 mt-1">
                        {reviewData.stats.directMessagesCount} Exchanged
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {reviewData.stats.flagsCount} compliance flags
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200">
                      <div className="text-[11px] font-semibold text-stone-500 uppercase">Account Standing</div>
                      <div className="text-lg font-bold capitalize mt-1 text-stone-900">
                        {user.status || 'Active'}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        Role: {user.role} &bull; {user.district}
                      </div>
                    </div>
                  </div>

                  {/* Suspension details if already suspended */}
                  {user.status === 'suspended' && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-700" />
                        <span>Current Suspension Notice</span>
                      </div>
                      <p className="mt-1 font-medium">{user.suspensionReason}</p>
                      <div className="mt-2 text-[10px] text-rose-700">
                        Suspended by: {user.suspendedBy || 'Administrator'} &bull; At:{' '}
                        {user.suspendedAt ? new Date(user.suspendedAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  )}

                  {/* Assessment & Actions Box */}
                  <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-4">
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-800" />
                      <span>Administrative Assessment & Verdict</span>
                    </h4>

                    {isLeadAdmin ? (
                      <div className="p-3 bg-stone-100 rounded-lg text-xs text-stone-600 font-medium">
                        This is a Lead Administrator account and cannot be suspended or expelled.
                      </div>
                    ) : (
                      <>
                        {/* Quick Suspend / Reinstate Toggle */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          {user.status === 'suspended' ? (
                            <button
                              type="button"
                              onClick={handleReinstate}
                              disabled={submittingAction}
                              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Reinstate User Account (Clear Suspension)</span>
                            </button>
                          ) : (
                            <div className="flex-1 space-y-2">
                              <label className="block text-xs font-bold text-stone-700">
                                Suspend User for Platform Misuse:
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={suspensionReason}
                                  onChange={(e) => setSuspensionReason(e.target.value)}
                                  placeholder="Reason for suspension..."
                                  className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-emerald-700"
                                />
                                <button
                                  type="button"
                                  onClick={handleSuspend}
                                  disabled={submittingAction || !suspensionReason.trim()}
                                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Suspend User</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Removal After Assessment if Found Guilty */}
                        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3 mt-4">
                          <div>
                            <div className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                              <Trash2 className="w-4 h-4 text-rose-700" />
                              <span>Expel & Remove User After Assessment (Guilty Verdict)</span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-1">
                              If the user is found guilty of fraud, repeated harassment, or attempting to bypass platform escrow, enter the assessment outcome and remove them from Mbewalink.
                            </p>
                          </div>

                          <textarea
                            rows={3}
                            value={assessmentFindings}
                            onChange={(e) => setAssessmentFindings(e.target.value)}
                            placeholder="Enter documented assessment findings (e.g. 'Found guilty of attempting off-platform payment evasion on Order #ORD-101 and repeated fake crop listings')..."
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-rose-600"
                          />

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleAssessAndRemove}
                              disabled={submittingAction || !assessmentFindings.trim()}
                              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Confirm Guilty Verdict & Expel User</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DIRECT MESSAGES AUDIT */}
              {activeTab === 'messages' && (
                <div className="space-y-3">
                  <div className="text-xs text-stone-500 font-medium">
                    All direct messages sent or received by this user across Buyer, Transporter, and Farmer channels.
                  </div>
                  {reviewData.directMessages.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-xs bg-white rounded-xl border border-stone-200">
                      No direct messages on record for this user.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reviewData.directMessages.map((msg) => (
                        <div
                          key={msg.id || msg.messageId}
                          className={`p-3 rounded-xl border text-xs ${
                            msg.flaggedForReview
                              ? 'bg-amber-50/70 border-amber-300'
                              : 'bg-white border-stone-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span>{msg.senderName} ({msg.senderRole})</span>
                              <span>→</span>
                              <span>{msg.recipientName} ({msg.recipientRole})</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-stone-100 text-stone-600 font-mono">
                                #{msg.orderNumber}
                              </span>
                            </div>
                            <span className="text-stone-400 text-[10px]">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-stone-800 leading-relaxed font-normal">{msg.messageText}</p>

                          {msg.flaggedForReview && (
                            <div className="mt-2 pt-1.5 border-t border-amber-200 text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Flag Reason: {msg.flagReason || 'Prohibited off-platform arrangement phrase'}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {reviewData.orders.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-xs bg-white rounded-xl border border-stone-200">
                      No orders associated with this user.
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100 bg-white rounded-xl border border-stone-200 overflow-hidden">
                      {reviewData.orders.map((ord) => (
                        <div key={ord.id} className="p-3 text-xs flex items-center justify-between hover:bg-stone-50">
                          <div>
                            <div className="font-bold text-stone-900">
                              Order #{ord.orderNumber} &bull; {ord.commodityName}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              Buyer: {ord.buyerName} &bull; Farmer: {ord.farmerName} &bull; {ord.quantity} {ord.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-800">
                              MWK {Number(ord.totalAmount).toLocaleString()}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                ord.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: COMMODITIES */}
              {activeTab === 'commodities' && (
                <div className="space-y-3">
                  {reviewData.commodities.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-xs bg-white rounded-xl border border-stone-200">
                      No commodities listed by this user.
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100 bg-white rounded-xl border border-stone-200 overflow-hidden">
                      {reviewData.commodities.map((comm) => (
                        <div key={comm.id} className="p-3 text-xs flex items-center justify-between hover:bg-stone-50">
                          <div>
                            <div className="font-bold text-stone-900">{comm.commodityName}</div>
                            <div className="text-[11px] text-stone-500">
                              {comm.category} &bull; {comm.quality} &bull; {comm.location}, {comm.district}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-800">
                              MWK {Number(comm.pricePerUnit).toLocaleString()}/{comm.unit}
                            </div>
                            <span className="text-[10px] text-stone-500">
                              Stock: {comm.quantity} / {comm.initialQuantity} {comm.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: AUDIT LOGS */}
              {activeTab === 'audit' && (
                <div className="space-y-2">
                  {reviewData.auditLogs.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-xs bg-white rounded-xl border border-stone-200">
                      No platform audit logs involving this user.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reviewData.auditLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-white rounded-xl border border-stone-200 text-xs">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-stone-900">{log.action}</span>
                            <span className="text-stone-400 text-[10px]">
                              {new Date(log.createdAt || '').toLocaleString()}
                            </span>
                          </div>
                          <div className="text-stone-600 font-medium">{log.recordAffected}</div>
                          {log.reason && (
                            <div className="text-[11px] text-stone-500 mt-1 italic">Reason: {log.reason}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-stone-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
