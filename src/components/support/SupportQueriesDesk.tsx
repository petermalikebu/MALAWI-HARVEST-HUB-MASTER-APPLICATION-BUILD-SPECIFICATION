import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { SupportTicket, SupportTicketReply } from '../../types/index.ts';
import { safeParseJson, safeParseResponse } from '../../lib/api.ts';
import {
  HelpCircle,
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Lightbulb,
  Search,
  Filter,
  Plus,
  RefreshCw,
  X,
  Phone,
  Building,
  ShieldCheck,
  User,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface SupportQueriesDeskProps {
  forcedRole?: 'farmer' | 'buyer' | 'transporter' | 'admin';
}

export const SupportQueriesDesk: React.FC<SupportQueriesDeskProps> = ({ forcedRole }) => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const isAdmin = currentUser?.role === 'admin';

  const [queries, setQueries] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilterStatus, setActiveFilterStatus] = useState<string>('all');
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('all');
  const [activeFilterRole, setActiveFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New query modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [category, setCategory] = useState<'problem' | 'suggestion' | 'payment_query' | 'transport_query' | 'commodity_query' | 'other'>('problem');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Selected query for thread view / reply modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState<'replied' | 'resolved'>('replied');
  const [selectedAdminName, setSelectedAdminName] = useState<string>('Peter Malikebu');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Set default replying admin based on logged in admin
  useEffect(() => {
    if (currentUser?.email === 'joshuamalikebu927@gmail.com') {
      setSelectedAdminName('Joshua Malikebu');
    } else {
      setSelectedAdminName('Peter Malikebu');
    }
  }, [currentUser?.email]);

  const fetchQueries = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const url = isAdmin
        ? '/api/queries'
        : `/api/queries?userUid=${encodeURIComponent(currentUser.uid)}&role=${currentUser.role}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await safeParseJson(res, []);
        setQueries(data);
        // If ticket modal open, update it
        if (selectedTicket) {
          const fresh = data.find((t: SupportTicket) => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        }
      }
    } catch (err) {
      console.error('Failed to fetch queries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();

    const unsubCreated = subscribe('query_created', () => {
      fetchQueries();
    });
    const unsubUpdated = subscribe('query_updated', () => {
      fetchQueries();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, [currentUser?.uid, isAdmin]);

  const handleSubmitNewQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError('');
    setFormSuccess('');

    if (!subject.trim() || !message.trim()) {
      setFormError('Please enter both a subject and a detailed message.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser.uid,
          userName: currentUser.fullName || 'Registered User',
          userEmail: currentUser.email || 'user@harvesthub.mw',
          userPhone: currentUser.phoneNumber || '',
          userRole: currentUser.role,
          userDistrict: currentUser.district || 'Lilongwe',
          category,
          subject: subject.trim(),
          message: message.trim(),
          priority,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to submit query');
      }

      setFormSuccess('Your query has been sent to platform administrators (Peter & Joshua). We will respond shortly!');
      setSubject('');
      setMessage('');
      fetchQueries();
      setTimeout(() => {
        setShowNewModal(false);
        setFormSuccess('');
      }, 2000);
    } catch (err: any) {
      setFormError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !currentUser || !replyMessage.trim()) return;

    setSubmittingReply(true);
    try {
      const senderName = isAdmin ? selectedAdminName : currentUser.fullName;
      const senderRole = isAdmin ? 'admin' : currentUser.role;

      const res = await fetch(`/api/queries/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUid: currentUser.uid,
          senderName,
          senderRole,
          message: replyMessage.trim(),
          newStatus: isAdmin ? replyStatus : 'pending',
        }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to send reply');
      }

      const updated = parsed.data;
      if (updated) setSelectedTicket(updated);
      setReplyMessage('');
      fetchQueries();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/queries/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          adminUid: currentUser?.uid,
          adminName: selectedAdminName,
        }),
      });
      if (res.ok) {
        fetchQueries();
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Filter list
  const filteredQueries = queries.filter((q) => {
    if (activeFilterStatus !== 'all' && q.status !== activeFilterStatus) return false;
    if (activeFilterCategory !== 'all' && q.category !== activeFilterCategory) return false;
    if (activeFilterRole !== 'all' && q.userRole !== activeFilterRole) return false;
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      const matchSub = q.subject.toLowerCase().includes(s);
      const matchMsg = q.message.toLowerCase().includes(s);
      const matchName = q.userName.toLowerCase().includes(s);
      const matchTkt = q.ticketNumber.toLowerCase().includes(s);
      if (!matchSub && !matchMsg && !matchName && !matchTkt) return false;
    }
    return true;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'problem':
        return 'Problem / Bug Report';
      case 'suggestion':
        return 'Platform Suggestion';
      case 'payment_query':
        return 'Payment & Escrow';
      case 'transport_query':
        return 'Transport & Logistics';
      case 'commodity_query':
        return 'Commodity Listing';
      default:
        return 'General Query';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending Review</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span>Under Investigation</span>
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Replied by Admin</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            <span>Resolved</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-emerald-800/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold border border-white/15">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct Admin Assistance &amp; Feedback Hub</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAdmin ? 'Platform Support &amp; Queries Help Desk' : 'Send Queries, Problems &amp; Suggestions to Admin'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              {isAdmin
                ? 'Review, track, and reply directly to feedback, problem reports, and operational questions sent by Farmers, Buyers, and Transporters.'
                : 'Whenever you encounter an issue or have a valuable idea to improve Malawi Harvest Hub, send it here. Platform administrators (Peter Malikebu & Joshua Malikebu) will reply directly to your ticket.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => {
                setFormError('');
                setFormSuccess('');
                setShowNewModal(true);
              }}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Send New Query / Suggestion</span>
            </button>
            <button
              onClick={fetchQueries}
              disabled={loading}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/20 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Official Admin Directory & Accounts Box */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3.5 border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-400/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <span>Peter Malikebu</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-400/20 text-purple-200">Lead Admin</span>
              </div>
              <p className="text-stone-300 text-[11px]">
                Phone: <strong className="text-white">+265 999 036 912</strong>
              </p>
              <p className="text-stone-300 text-[11px]">
                National Bank of Malawi Acc: <strong className="text-emerald-300">1011619688</strong> (PETER ADRIAN MALIKEBU)
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-3.5 border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-400/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <span>Joshua Malikebu</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-400/20 text-purple-200">Platform Admin</span>
              </div>
              <p className="text-stone-300 text-[11px]">
                Phone: <strong className="text-white">0991817976 / 0880882372</strong>
              </p>
              <p className="text-stone-300 text-[11px]">
                National Bank of Malawi Acc: <strong className="text-emerald-300">1013388772</strong> (JOSHUA MALIKEBU)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by ticket #, subject, message, or user name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-emerald-600 bg-stone-50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status filter */}
          <select
            value={activeFilterStatus}
            onChange={(e) => setActiveFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 bg-white font-medium text-stone-700 focus:outline-emerald-600"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="in_progress">Under Investigation</option>
            <option value="replied">Admin Replied</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Category filter */}
          <select
            value={activeFilterCategory}
            onChange={(e) => setActiveFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 bg-white font-medium text-stone-700 focus:outline-emerald-600"
          >
            <option value="all">All Categories</option>
            <option value="problem">Problems / Bugs</option>
            <option value="suggestion">Suggestions</option>
            <option value="payment_query">Payment &amp; Escrow</option>
            <option value="transport_query">Transport Queries</option>
            <option value="commodity_query">Commodity Listings</option>
            <option value="other">Other</option>
          </select>

          {/* Role filter (admin only) */}
          {isAdmin && (
            <select
              value={activeFilterRole}
              onChange={(e) => setActiveFilterRole(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 bg-white font-medium text-stone-700 focus:outline-emerald-600"
            >
              <option value="all">All User Roles</option>
              <option value="farmer">Farmers</option>
              <option value="buyer">Buyers</option>
              <option value="transporter">Transporters</option>
            </select>
          )}
        </div>
      </div>

      {/* Query List */}
      <div className="space-y-3">
        {loading && queries.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs text-stone-500 font-medium">Loading queries &amp; suggestions...</p>
          </div>
        ) : filteredQueries.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-stone-800">No Queries Found</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              {isAdmin
                ? 'No tickets match the selected filters.'
                : 'You have not submitted any queries yet. Use the button above to report a problem or share a suggestion.'}
            </p>
          </div>
        ) : (
          filteredQueries.map((t) => {
            const hasAdminReplied = t.status === 'replied' || t.status === 'resolved' || Boolean(t.adminReply);
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                      {t.ticketNumber}
                    </span>
                    <span className="text-xs font-bold text-stone-700 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {getCategoryLabel(t.category)}
                    </span>
                    {t.priority === 'urgent' && (
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Urgent
                      </span>
                    )}
                    {isAdmin && (
                      <span className="text-[11px] font-medium text-stone-500 flex items-center gap-1">
                        <User className="w-3 h-3 text-stone-400" />
                        <strong>{t.userName}</strong> ({t.userRole}) &bull; {t.userDistrict}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(t.status)}
                    <span className="text-[11px] text-stone-400">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-stone-900 text-sm">{t.subject}</h4>
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{t.message}</p>
                </div>

                {/* Admin Reply Preview */}
                {hasAdminReplied && t.adminReply && (
                  <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      A
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between font-bold text-[11px] text-emerald-900">
                        <span>Admin Reply from {t.repliedByAdminName || 'Platform Administrator'}</span>
                        {t.repliedAt && (
                          <span className="text-[10px] text-emerald-700 font-normal">
                            {new Date(t.repliedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-stone-700">{t.adminReply}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-stone-400">
                  <span>
                    {t.replies && t.replies.length > 0 ? `${t.replies.length} message(s) in conversation thread` : '1 message'}
                  </span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1 hover:underline">
                    <span>View &amp; Reply in Conversation</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: SUBMIT NEW QUERY */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
                    Send Query or Suggestion to Admin
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Direct message to Peter Malikebu &amp; Joshua Malikebu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewQuery} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium focus:outline-emerald-600 bg-stone-50"
                >
                  <option value="problem">Report a Problem / Bug</option>
                  <option value="suggestion">Platform Suggestion / Improvement</option>
                  <option value="payment_query">Payment &amp; Escrow Verification</option>
                  <option value="transport_query">Transport &amp; Freight Query</option>
                  <option value="commodity_query">Commodity Listing &amp; Quality Query</option>
                  <option value="other">Other Operational Query</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Urgency / Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'high', 'urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-xl border text-center font-bold capitalize transition-all ${
                        priority === p
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question about payment release or sweet potato photo upload"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Detailed Explanation *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe exactly what happened, what you need assistance with, or how you suggest we improve the platform..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium focus:outline-emerald-600 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Send to Administrators'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUERY CONVERSATION THREAD & ADMIN/USER REPLY */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold bg-stone-100 px-2 py-0.5 rounded border border-stone-200 text-stone-900">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    {getCategoryLabel(selectedTicket.category)}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <h3 className="font-extrabold text-stone-900 text-base sm:text-lg">
                  {selectedTicket.subject}
                </h3>
                <p className="text-[11px] text-stone-500">
                  Submitted by <strong className="text-stone-800">{selectedTicket.userName}</strong> ({selectedTicket.userRole}) &bull; District: {selectedTicket.userDistrict || 'Lilongwe'} &bull; Phone: {selectedTicket.userPhone || 'N/A'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Bar for Admin */}
            {isAdmin && (
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-purple-900">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>Admin Actions:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'in_progress')}
                    className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-bold text-[11px]"
                  >
                    Set In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold text-[11px]"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            )}

            {/* Conversation Thread History */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {/* Original Message */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span className="font-bold text-stone-800">{selectedTicket.userName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-stone-200 rounded text-stone-700">
                      {selectedTicket.userRole}
                    </span>
                  </div>
                  <span>{selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : ''}</span>
                </div>
                <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.message}
                </p>
              </div>

              {/* Thread messages */}
              {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                selectedTicket.replies.map((rep: SupportTicketReply, idx: number) => {
                  const isRepAdmin = rep.senderRole === 'admin';
                  return (
                    <div
                      key={rep.id || idx}
                      className={`rounded-2xl p-4 space-y-1.5 ${
                        isRepAdmin
                          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 ml-4'
                          : 'bg-stone-50 border border-stone-200 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {isRepAdmin ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-stone-500" />
                          )}
                          <span className={`font-bold ${isRepAdmin ? 'text-emerald-900' : 'text-stone-800'}`}>
                            {rep.senderName}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              isRepAdmin
                                ? 'bg-emerald-200/80 text-emerald-900'
                                : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {isRepAdmin ? 'Admin Support' : rep.senderRole}
                          </span>
                        </div>
                        <span className="text-stone-400 text-[10px]">
                          {rep.timestamp ? new Date(rep.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                        {rep.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleSendReply} className="border-t border-stone-100 pt-3 space-y-3 shrink-0">
              {isAdmin && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-700">Replying as:</span>
                    <select
                      value={selectedAdminName}
                      onChange={(e) => setSelectedAdminName(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-stone-300 font-bold bg-white text-stone-800"
                    >
                      <option value="Peter Malikebu">Peter Malikebu (Lead Admin)</option>
                      <option value="Joshua Malikebu">Joshua Malikebu (Platform Admin)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-700">Set Ticket Status:</span>
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value as any)}
                      className="px-2.5 py-1 rounded-lg border border-stone-300 font-bold bg-white text-stone-800"
                    >
                      <option value="replied">Replied by Admin</option>
                      <option value="resolved">Resolved &amp; Completed</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="relative">
                <textarea
                  rows={3}
                  required
                  placeholder={
                    isAdmin
                      ? `Type an official reply to ${selectedTicket.userName}...`
                      : 'Type your follow-up message to the platform administrators...'
                  }
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-stone-300 focus:outline-emerald-600 font-medium leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-stone-400">
                  {isAdmin
                    ? 'User will be notified immediately upon sending reply.'
                    : 'Administrators will be notified with your reply.'}
                </span>

                <button
                  type="submit"
                  disabled={submittingReply || !replyMessage.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingReply ? 'Sending...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
