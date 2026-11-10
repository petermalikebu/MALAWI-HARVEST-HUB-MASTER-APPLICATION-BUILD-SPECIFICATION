import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { DirectMessageThread, DirectMessage, DirectMessageRelationship } from '../../types/index.ts';
import { safeParseResponse } from '../../lib/api.ts';
import {
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  User,
  Truck,
  Sprout,
  ShoppingCart,
  Clock,
  Eye,
  ShieldAlert,
  ArrowRight,
  Send,
} from 'lucide-react';
import { UserActivityReviewModal } from './UserActivityReviewModal.tsx';

export const AdminDirectMessagesAuditPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [threads, setThreads] = useState<DirectMessageThread[]>([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalFlagged: 0,
    buyerTransporterMessages: 0,
    farmerBuyerMessages: 0,
    farmerTransporterMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('all');
  const [flaggedOnly, setFlaggedOnly] = useState<boolean>(false);
  const [activeThread, setActiveThread] = useState<any | null>(null);

  // Review modal
  const [inspectUser, setInspectUser] = useState<any | null>(null);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRelationship !== 'all') params.set('relationship', selectedRelationship);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (flaggedOnly) params.set('flaggedOnly', 'true');

      const res = await fetch(`/api/admin/messages/audit?${params.toString()}`);
      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setThreads(parsed.data.threads || []);
        if (parsed.data.stats) setStats(parsed.data.stats);

        // Keep active thread selection synced
        if (activeThread) {
          const updated = (parsed.data.threads || []).find((t: any) => t.threadId === activeThread.threadId);
          if (updated) setActiveThread(updated);
        } else if ((parsed.data.threads || []).length > 0) {
          setActiveThread(parsed.data.threads[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [selectedRelationship, flaggedOnly]);

  // Real-time listener for new direct messages
  useEffect(() => {
    const unsubscribe = subscribe('DIRECT_MESSAGE_SENT', (_msg: any) => {
      fetchAuditData();
    });
    return () => unsubscribe();
  }, [subscribe]);

  const getRelationshipBadge = (rel: DirectMessageRelationship) => {
    switch (rel) {
      case 'buyer_transporter':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Truck className="w-3 h-3 text-blue-600" />
            <span>Buyer ↔ Transporter</span>
          </span>
        );
      case 'farmer_buyer':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <Sprout className="w-3 h-3 text-emerald-600" />
            <span>Farmer ↔ Buyer</span>
          </span>
        );
      case 'farmer_transporter':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <ShoppingCart className="w-3 h-3 text-amber-600" />
            <span>Farmer ↔ Transporter</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
            Direct
          </span>
        );
    }
  };

  const handleOpenUserDossier = (uid: string, name: string, role: string) => {
    setInspectUser({
      id: uid,
      uid,
      fullName: name,
      role,
      email: `${uid}@mbewalink.mw`,
      district: 'National',
      region: 'Central',
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="bg-stone-900 text-white p-5 rounded-2xl shadow-xs border border-stone-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold">Audited Direct Messaging Oversight</h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Real-time monitoring of all direct communications across the 3 core trading relationships:
              <strong> Buyer ↔ Transporter</strong>, <strong>Farmer ↔ Buyer</strong>, and <strong>Farmer ↔ Transporter</strong>.
              Automated compliance filters scan for off-platform payment evasion, bypass attempts, and misconduct.
            </p>
          </div>

          <button
            onClick={fetchAuditData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex items-center gap-2 transition-colors border border-stone-700 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Audit Feed</span>
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-stone-800">
          <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/60">
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Total Direct Messages</div>
            <div className="text-xl font-extrabold text-white mt-1">{stats.totalMessages}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">{threads.length} active threads</div>
          </div>

          <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/60">
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Buyer ↔ Transporter</div>
            <div className="text-xl font-extrabold text-blue-400 mt-1">{stats.buyerTransporterMessages}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Haulage & delivery logistics</div>
          </div>

          <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/60">
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Farmer ↔ Buyer</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">{stats.farmerBuyerMessages}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Quality & price verification</div>
          </div>

          <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/60">
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Flagged For Review</div>
            <div className="text-xl font-extrabold text-amber-400 mt-1">{stats.totalFlagged}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Off-platform keywords</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 bg-white rounded-xl border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAuditData()}
              placeholder="Search by order #, participant name, or message keyword..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:outline-emerald-800"
            />
          </div>
          <button
            onClick={fetchAuditData}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end overflow-x-auto text-xs">
          <select
            value={selectedRelationship}
            onChange={(e) => setSelectedRelationship(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white font-semibold text-stone-700"
          >
            <option value="all">All Channels (3-Way)</option>
            <option value="buyer_transporter">Buyer ↔ Transporter</option>
            <option value="farmer_buyer">Farmer ↔ Buyer</option>
            <option value="farmer_transporter">Farmer ↔ Transporter</option>
          </select>

          <button
            type="button"
            onClick={() => setFlaggedOnly(!flaggedOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
              flaggedOnly
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Flagged Only</span>
          </button>
        </div>
      </div>

      {/* Main Split View: Left List, Right Transcript Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[600px]">
        {/* Left: Threads List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col shadow-2xs">
          <div className="p-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between text-xs font-bold text-stone-700">
            <span>Conversations ({threads.length})</span>
            <span className="text-[10px] text-stone-400 font-normal">Sorted by recent activity</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loading ? (
              <div className="p-8 text-center text-stone-400 text-xs">
                <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-400" />
                <span>Loading audit threads...</span>
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">
                No direct messages match the current filter.
              </div>
            ) : (
              threads.map((thread) => {
                const isSelected = activeThread?.threadId === thread.threadId;
                return (
                  <button
                    key={thread.threadId}
                    type="button"
                    onClick={() => setActiveThread(thread)}
                    className={`w-full text-left p-3.5 transition-colors hover:bg-stone-50 flex flex-col gap-1.5 ${
                      isSelected ? 'bg-stone-100/80 border-l-4 border-l-emerald-800' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900 truncate">
                        <span>{thread.participant1.name}</span>
                        <span className="text-stone-400 font-normal">↔</span>
                        <span>{thread.participant2.name}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {new Date(thread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getRelationshipBadge(thread.relationship)}
                      <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                        #{thread.orderNumber}
                      </span>
                      {thread.flaggedCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>{thread.flaggedCount} Flagged</span>
                        </span>
                      )}
                    </div>

                    {thread.lastMessage && (
                      <p className="text-[11px] text-stone-500 truncate mt-0.5">
                        <strong className="text-stone-700">{thread.lastMessage.senderName}: </strong>
                        {thread.lastMessage.messageText}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Full Transcript Audit Viewer */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col shadow-2xs">
          {!activeThread ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-stone-400 text-xs">
              <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
              <span>Select a conversation from the left to inspect the audited transcript.</span>
            </div>
          ) : (
            <>
              {/* Transcript Header */}
              <div className="p-3.5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">
                      {activeThread.participant1.name} ({activeThread.participant1.role}) ↔{' '}
                      {activeThread.participant2.name} ({activeThread.participant2.role})
                    </h3>
                  </div>
                  <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                    <span>Order #{activeThread.orderNumber}</span>
                    <span>&bull;</span>
                    <span>{activeThread.totalMessages} Messages on record</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenUserDossier(
                        activeThread.participant1.uid,
                        activeThread.participant1.name,
                        activeThread.participant1.role
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors border border-stone-700 flex items-center gap-1"
                  >
                    <User className="w-3 h-3 text-emerald-400" />
                    <span>Review {activeThread.participant1.name.split(' ')[0]}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleOpenUserDossier(
                        activeThread.participant2.uid,
                        activeThread.participant2.name,
                        activeThread.participant2.role
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors border border-stone-700 flex items-center gap-1"
                  >
                    <User className="w-3 h-3 text-blue-400" />
                    <span>Review {activeThread.participant2.name.split(' ')[0]}</span>
                  </button>
                </div>
              </div>

              {/* Notice Bar */}
              <div className="px-4 py-2 bg-stone-100 border-b border-stone-200 text-[11px] text-stone-600 flex items-center justify-between">
                <span>
                  Admin Audit Mode &bull; Messages are immutable and logged with telecom timestamps.
                </span>
                {activeThread.flaggedCount > 0 && (
                  <span className="font-bold text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{activeThread.flaggedCount} Prohibited Keywords Detected</span>
                  </span>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/70">
                {activeThread.messages.map((m: DirectMessage) => (
                  <div
                    key={m.id || m.messageId}
                    className={`p-3.5 rounded-2xl text-xs shadow-2xs border ${
                      m.flaggedForReview
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : 'bg-white border-stone-200 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-[11px]">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-stone-900">{m.senderName}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600">
                          {m.senderRole}
                        </span>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
                        <span className="text-stone-600">{m.recipientName}</span>
                      </div>
                      <span className="text-stone-400 text-[10px]">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap leading-relaxed text-stone-800 font-normal">{m.messageText}</p>

                    {m.flaggedForReview && (
                      <div className="mt-2 pt-2 border-t border-amber-300/60 flex items-center justify-between text-xs text-amber-900 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Flag: {m.flagReason || 'Prohibited off-platform payment keyword'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenUserDossier(m.senderUid, m.senderName, m.senderRole)}
                          className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-colors"
                        >
                          Review & Suspend Sender
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {inspectUser && (
        <UserActivityReviewModal
          isOpen={Boolean(inspectUser)}
          onClose={() => setInspectUser(null)}
          user={inspectUser}
          onUserUpdated={() => {
            fetchAuditData();
          }}
        />
      )}
    </div>
  );
};
