import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { User, Commodity, Order, AuditLogItem, Category, PasswordResetRequest } from '../../types/index.ts';
import { safeParseJson, safeParseResponse } from '../../lib/api.ts';
import {
  ShieldCheck,
  Users,
  Package,
  Layers,
  FileText,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  KeyRound,
  Mail,
  Phone,
} from 'lucide-react';
import { SupportQueriesDesk } from '../support/SupportQueriesDesk.tsx';

export const AdminDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { subscribe } = useRealtime();

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'commodities' | 'orders' | 'categories' | 'audit' | 'settings' | 'queries' | 'password_resets'>('users');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [commoditiesList, setCommoditiesList] = useState<Commodity[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AuditLogItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [passwordResetsList, setPasswordResetsList] = useState<PasswordResetRequest[]>([]);
  const [commissionRate, setCommissionRate] = useState<string>('0.04');
  const [loading, setLoading] = useState(true);
  const [processingResetId, setProcessingResetId] = useState<string | null>(null);

  // User deletion state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // New category modal
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  // Order cancellation modal
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('Administrative intervention / dispute resolution');

  const handleDeleteUser = async () => {
    if (!deletingUser || !currentUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${deletingUser.id}?adminUid=${currentUser.uid}`, {
        method: 'DELETE',
      });
      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to remove user');
      }
      const isSelf = deletingUser.id === currentUser.id || deletingUser.uid === currentUser.uid;
      setDeletingUser(null);

      if (isSelf) {
        alert('Your administrator account has been permanently removed from the central PostgreSQL database.');
        await logout();
      } else {
        fetchAll();
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting user');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [uRes, cRes, oRes, aRes, catRes, sRes, pRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/commodities'),
        fetch('/api/orders'),
        fetch('/api/audit-logs'),
        fetch('/api/categories'),
        fetch('/api/settings'),
        fetch('/api/password-reset/requests'),
      ]);

      if (uRes.ok) setUsersList(await safeParseJson(uRes, []));
      if (cRes.ok) setCommoditiesList(await safeParseJson(cRes, []));
      if (oRes.ok) setOrdersList(await safeParseJson(oRes, []));
      if (aRes.ok) setAuditLogsList(await safeParseJson(aRes, []));
      if (catRes.ok) setCategoriesList(await safeParseJson(catRes, []));
      if (pRes.ok) setPasswordResetsList(await safeParseJson(pRes, []));
      if (sRes.ok) {
        const settings: any[] = await safeParseJson(sRes, []);
        const cr = settings.find((s: any) => s.key === 'commission_rate');
        if (cr) setCommissionRate(cr.value);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const unsubAudit = subscribe('audit_logged', () => fetchAll());
    const unsubOrder = subscribe('order_updated', () => fetchAll());
    const unsubComm = subscribe('commodity_updated', () => fetchAll());
    const unsubResetReq = subscribe('password_reset_requested', () => fetchAll());
    const unsubResetApp = subscribe('password_reset_approved', () => fetchAll());
    const unsubResetComp = subscribe('password_reset_completed', () => fetchAll());

    // Polling fallback every 3.5s to ensure admin always has immediate visibility
    const pollInterval = setInterval(() => {
      fetch('/api/password-reset/requests')
        .then((r) => r.json())
        .then((list) => {
          if (Array.isArray(list)) setPasswordResetsList(list);
        })
        .catch(() => {});
    }, 3500);

    return () => {
      unsubAudit();
      unsubOrder();
      unsubComm();
      unsubResetReq();
      unsubResetApp();
      unsubResetComp();
      clearInterval(pollInterval);
    };
  }, [subscribe]);

  const handleApproveReset = async (requestId: string) => {
    setProcessingResetId(requestId);
    try {
      const res = await fetch('/api/password-reset/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          adminName: currentUser?.fullName || 'Peter Malikebu',
          adminUid: currentUser?.uid || 'admin-01',
          adminNote: 'Approved by administrator upon identity verification',
        }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to approve password reset request');
      }

      await fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error approving password reset');
    } finally {
      setProcessingResetId(null);
    }
  };

  const handleRejectReset = async (requestId: string) => {
    const reason = prompt('Please enter the reason for rejection (e.g. Identity could not be verified):');
    if (!reason) return;

    setProcessingResetId(requestId);
    try {
      const res = await fetch('/api/password-reset/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          adminName: currentUser?.fullName || 'Peter Malikebu',
          adminUid: currentUser?.uid || 'admin-01',
          reason,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to reject password reset request');
      }

      await fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error rejecting password reset');
    } finally {
      setProcessingResetId(null);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newRole,
          adminUid: currentUser?.uid,
          adminEmail: currentUser?.email,
          adminName: currentUser?.fullName,
        }),
      });
      if (res.ok) fetchAll();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleUpdateCommissionRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'commission_rate',
          value: commissionRate,
          description: 'Default platform commodity trade commission rate',
          adminUid: currentUser?.uid,
          adminName: currentUser?.fullName,
        }),
      });
      if (res.ok) {
        alert('Platform commission rate updated successfully in PostgreSQL database.');
        fetchAll();
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    setAddingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          description: newCatDesc,
          adminUid: currentUser?.uid,
          adminName: currentUser?.fullName,
        }),
      });
      if (res.ok) {
        setNewCatName('');
        setNewCatDesc('');
        fetchAll();
      }
    } catch (err) {
      console.error('Failed to add category:', err);
    } finally {
      setAddingCat(false);
    }
  };

  const handleAdminCancelOrder = async () => {
    if (!cancellingOrderId) return;
    try {
      const res = await fetch(`/api/orders/${cancellingOrderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser?.uid,
          userName: currentUser?.fullName,
          userRole: 'admin',
          reason: cancelReason,
        }),
      });
      if (res.ok) {
        setCancellingOrderId(null);
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Failed to cancel order:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-800/60 text-purple-200 border border-purple-700/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform Operations &bull; Central Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Administrative Command
            </h1>
            <p className="text-purple-100 text-sm leading-relaxed">
              Monitoring platform users, nationwide commodity supply, active order fulfillment, regulatory compliance, and immutable audit logs.
            </p>
          </div>

          <button
            onClick={fetchAll}
            className="p-2.5 rounded-xl bg-purple-800/50 hover:bg-purple-800 text-purple-100 transition-colors self-start md:self-auto"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pending Password Resets Banner Alert */}
      {passwordResetsList.filter((r) => r.status === 'pending').length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 space-y-3.5 shadow-sm animate-in slide-in-from-top-1 duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <KeyRound className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2">
                  <span>{passwordResetsList.filter((r) => r.status === 'pending').length} Password Reset Request(s) Awaiting Administrator Approval</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                </h4>
                <p className="text-[11px] text-amber-800">
                  Registered users have requested a password change. Verify their identity and authorize their reset to grant them access to their account.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('password_resets')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 self-start sm:self-auto"
            >
              Open Full Authorization Queue
            </button>
          </div>

          {/* Quick direct approval cards for pending requests */}
          <div className="grid grid-cols-1 gap-2 pt-1 border-t border-amber-200/80">
            {passwordResetsList
              .filter((r) => r.status === 'pending')
              .slice(0, 3)
              .map((req) => (
                <div
                  key={req.id}
                  className="bg-white/95 p-3 rounded-xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-stone-900">{req.userName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                      {req.userRole}
                    </span>
                    <span className="text-stone-700 font-medium">{req.userEmail}</span>
                    {req.userPhone && (
                      <span className="text-stone-500 font-mono text-[11px] bg-stone-100 px-1.5 py-0.5 rounded">
                        {req.userPhone}
                      </span>
                    )}
                    <span className="text-[10px] text-stone-400 font-mono">
                      Ref: #{req.requestId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <button
                      onClick={() => handleRejectReset(req.requestId)}
                      disabled={processingResetId === req.requestId}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-bold disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveReset(req.requestId)}
                      disabled={processingResetId === req.requestId}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{processingResetId === req.requestId ? 'Approving...' : 'Approve Password Reset'}</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'users' ? 'bg-purple-100 text-purple-900' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users ({usersList.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('commodities')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'commodities' ? 'bg-purple-100 text-purple-900' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Commodities ({commoditiesList.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'orders' ? 'bg-purple-100 text-purple-900' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Orders ({ordersList.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'categories' ? 'bg-purple-100 text-purple-900' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <span>Categories ({categoriesList.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'audit' ? 'bg-purple-100 text-purple-900' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Logs ({auditLogsList.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('password_resets')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'password_resets'
              ? 'bg-purple-100 text-purple-900 font-extrabold ring-1 ring-purple-300'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Password Resets ({passwordResetsList.filter((r) => r.status === 'pending').length})</span>
          {passwordResetsList.filter((r) => r.status === 'pending').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('queries')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'queries' ? 'bg-purple-100 text-purple-900 font-extrabold' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Queries &amp; Help Desk</span>
        </button>
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'settings' ? 'bg-purple-100 text-purple-900' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Platform Settings</span>
        </button>
      </div>

      {/* SUB TAB 1: USERS */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Two Official Platform Administrators Info Banner */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-5 border border-purple-700/50 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-300" />
              <h3 className="font-extrabold text-sm text-white">
                Official Platform Administrators &amp; Central Escrow Accounts
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Peter Malikebu</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/20 text-purple-200 font-bold uppercase">Super Admin 1</span>
                </div>
                <p className="text-purple-200 text-[11px]">Email: <strong className="text-white">petermalikebujr@gmail.com</strong></p>
                <p className="text-purple-200 text-[11px]">Phone: <strong className="text-white">+265 999 036 912</strong></p>
                <p className="text-purple-200 text-[11px]">National Bank of Malawi Acc: <strong className="text-emerald-300">1011619688</strong> (PETER ADRIAN MALIKEBU)</p>
              </div>

              <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Joshua Malikebu</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/20 text-purple-200 font-bold uppercase">Super Admin 2</span>
                </div>
                <p className="text-purple-200 text-[11px]">Email: <strong className="text-white">joshuamalikebu927@gmail.com</strong></p>
                <p className="text-purple-200 text-[11px]">Phone: <strong className="text-white">0991817976 / 0880882372</strong></p>
                <p className="text-purple-200 text-[11px]">National Bank of Malawi Acc: <strong className="text-emerald-300">1013388772</strong> (JOSHUA MALIKEBU)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm">Registered Ecosystem Users</h3>
              <span className="text-xs text-stone-500">Live PostgreSQL `users` table</span>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email & Phone</th>
                  <th className="p-3">District / Region</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-right">Role & User Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {usersList.map((u) => {
                  const isCurrentSelf = u.id === currentUser?.id || u.uid === currentUser?.uid;
                  const isFellowAdmin = u.role === 'admin' && !isCurrentSelf;
                  const isLeadAdminUser =
                    u.uid === 'frF3xukObzdA8AhCBYIBPYV0UK13' ||
                    u.uid === '9DXK6Cfy4FaODmqyVm7q8yrKup82' ||
                    u.email === 'petermalikebujr@gmail.com' ||
                    u.email === 'joshuamalikebu927@gmail.com' ||
                    u.fullName.toLowerCase().includes('malikebu');

                  return (
                    <tr key={u.id} className="hover:bg-stone-50/50">
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-stone-900">{u.fullName}</span>
                          {isLeadAdminUser && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              Lead Admin
                            </span>
                          )}
                          {isCurrentSelf && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              You
                            </span>
                          )}
                          {isFellowAdmin && !isLeadAdminUser && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Fellow Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">UID: {u.uid}</div>
                      </td>
                      <td className="p-3 text-stone-600">
                        <div>{u.email}</div>
                        <div className="text-[11px] text-stone-400">{u.phoneNumber || 'No phone'}</div>
                      </td>
                      <td className="p-3 text-stone-600">
                        {u.district} ({u.region})
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold capitalize bg-stone-100 text-stone-800">
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="px-2 py-1 rounded-lg border border-stone-200 text-xs bg-white focus:outline-purple-600"
                          >
                            <option value="farmer">Farmer</option>
                            <option value="buyer">Buyer</option>
                            <option value="transporter">Transporter</option>
                            <option value="admin">Admin</option>
                            <option value="finance_admin">Finance Admin</option>
                          </select>

                          <button
                            onClick={() => setDeletingUser(u)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              isCurrentSelf
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                                : isFellowAdmin
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-stone-50 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 hover:border-rose-200'
                            }`}
                            title={
                              isCurrentSelf
                                ? 'Remove yourself from the system database'
                                : isFellowAdmin
                                ? 'Remove fellow administrator'
                                : 'Remove user'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              {isCurrentSelf
                                ? 'Remove Myself (Lead Admin)'
                                : isLeadAdminUser
                                ? 'Remove Fellow Lead Admin'
                                : isFellowAdmin
                                ? 'Remove Fellow Admin'
                                : 'Remove'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* SUB TAB 2: COMMODITIES */}
      {activeSubTab === 'commodities' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">All Commodity Listings</h3>
            <span className="text-xs text-stone-500">Live PostgreSQL `commodities` table</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Commodity</th>
                  <th className="p-3">Farmer</th>
                  <th className="p-3">Remaining Stock</th>
                  <th className="p-3">Price (MWK)</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {commoditiesList.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/50">
                    <td className="p-3">
                      <div className="font-bold text-stone-900">{c.commodityName}</div>
                      <div className="text-[10px] text-stone-400">{c.category} &bull; {c.quality}</div>
                    </td>
                    <td className="p-3 font-medium text-stone-700">{c.farmerName}</td>
                    <td className="p-3 font-semibold text-stone-900">
                      {c.quantity.toLocaleString()} / {c.initialQuantity.toLocaleString()} {c.unit}
                    </td>
                    <td className="p-3 font-bold text-emerald-800">
                      MWK {Number(c.pricePerUnit).toLocaleString()}/{c.unit}
                    </td>
                    <td className="p-3 text-stone-600">
                      {c.location}, {c.district}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        c.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 3: ORDERS */}
      {activeSubTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">System Orders & Trade Records</h3>
            <span className="text-xs text-stone-500">Live PostgreSQL `orders` table</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Parties</th>
                  <th className="p-3">Commodity & Quantity</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ordersList.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50/50">
                    <td className="p-3 font-mono font-bold text-stone-700">{o.orderNumber}</td>
                    <td className="p-3 text-stone-700">
                      <div>Buyer: <strong>{o.buyerName}</strong></div>
                      <div>Farmer: <strong>{o.farmerName}</strong></div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-stone-900">{o.quantity.toLocaleString()} {o.unit}</div>
                      <div className="text-[11px] text-stone-500">{o.commodityName}</div>
                    </td>
                    <td className="p-3 font-extrabold text-stone-900">
                      MWK {Number(o.totalAmount).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold capitalize bg-stone-100 text-stone-800">
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {o.status !== 'completed' && o.status !== 'cancelled' && (
                        <button
                          onClick={() => setCancellingOrderId(o.id)}
                          className="px-2.5 py-1 rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold text-[11px]"
                        >
                          Cancel Order
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 4: CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="font-bold text-stone-900 text-sm mb-3">Add Agricultural Commodity Category</h3>
            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Category name (e.g. Sorghum, Sunflower)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-purple-600"
              />
              <input
                type="text"
                placeholder="Description of produce group"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-purple-600"
              />
              <button
                type="submit"
                disabled={addingCat}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{addingCat ? 'Saving...' : 'Add Category'}</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categoriesList.map((cat) => (
              <div key={cat.id} className="bg-white p-4 rounded-xl border border-stone-200">
                <div className="font-bold text-stone-900 text-sm">{cat.name}</div>
                <div className="text-xs text-stone-500 mt-1">{cat.description || 'Standard Malawi produce'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB TAB 5: AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Immutable Regulatory Audit Trail</h3>
              <p className="text-xs text-stone-500">Every administrative and financial change logged securely.</p>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              Live Feed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Record Affected</th>
                  <th className="p-3">Details / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                {auditLogsList.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/50">
                    <td className="p-3 text-stone-500 whitespace-nowrap">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-3">
                      <strong className="text-stone-900 font-sans font-semibold">{log.userName}</strong>
                      <span className="text-[10px] text-stone-400 block font-mono">[{log.role}]</span>
                    </td>
                    <td className="p-3 font-bold text-purple-900">{log.action}</td>
                    <td className="p-3 font-semibold text-stone-800">{log.recordAffected}</td>
                    <td className="p-3 text-stone-600 font-sans">
                      {log.reason || (log.previousValue && log.newValue ? `${log.previousValue} → ${log.newValue}` : log.newValue || '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 6: SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-700" />
            <h3 className="text-base font-bold text-stone-900">Platform Financial Parameters</h3>
          </div>
          <p className="text-xs text-stone-500">
            Configure global business rules stored directly in PostgreSQL (`platform_settings`).
          </p>

          <form onSubmit={handleUpdateCommissionRate} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Commodity Trade Commission Rate (Default: 0.04 = 4%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.005"
                  min="0.01"
                  max="0.20"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-36 px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-purple-600 font-bold"
                />
                <span className="text-xs font-bold text-purple-900">
                  = {(Number(commissionRate) * 100).toFixed(1)}% Platform Commission
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Applied automatically to all incoming buyer commodity orders and settled in the permanent revenue ledger.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs"
              >
                Save Settings to PostgreSQL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB TAB 7: QUERIES & HELP DESK */}
      {activeSubTab === 'queries' && (
        <SupportQueriesDesk />
      )}

      {/* SUB TAB 8: PASSWORD RESETS APPROVAL CONSOLE */}
      {activeSubTab === 'password_resets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-700" />
                <span>Password Reset Requests &amp; Security Authorizations</span>
              </h2>
              <p className="text-xs text-stone-500">
                Official administrator authorization queue. Review user identity and approve or reject password reset requests in real time.
              </p>
            </div>
            <button
              onClick={fetchAll}
              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Awaiting Approval</span>
              <p className="text-2xl font-black text-amber-950 mt-1">
                {passwordResetsList.filter((r) => r.status === 'pending').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Approved</span>
              <p className="text-2xl font-black text-emerald-950 mt-1">
                {passwordResetsList.filter((r) => r.status === 'approved').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Completed</span>
              <p className="text-2xl font-black text-blue-950 mt-1">
                {passwordResetsList.filter((r) => r.status === 'completed').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Total Requests</span>
              <p className="text-2xl font-black text-stone-900 mt-1">
                {passwordResetsList.length}
              </p>
            </div>
          </div>

          {/* Requests List */}
          {passwordResetsList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-stone-900 text-sm">No Password Reset Requests Pending</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                All password reset requests have been processed. When a user requests a password change, it will appear here immediately for review and approval.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {passwordResetsList.map((req) => (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                    req.status === 'pending'
                      ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20'
                      : 'border-stone-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900 text-sm">{req.userName}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700">
                          {req.userRole}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            req.status === 'pending'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                              : req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-900'
                              : req.status === 'completed'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {req.status === 'pending'
                            ? 'Awaiting Approval'
                            : req.status === 'approved'
                            ? 'Approved (Pending User Input)'
                            : req.status === 'completed'
                            ? 'Reset Completed'
                            : 'Rejected'}
                        </span>
                        <span className="text-[11px] font-mono text-stone-400">
                          Ref: #{req.requestId}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-stone-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-medium text-stone-800">{req.userEmail}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-medium text-stone-800">{req.userPhone || 'No phone provided'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-stone-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{req.createdAt ? new Date(req.createdAt).toLocaleString() : ''}</span>
                        </span>
                      </div>

                      {req.approvedByAdminName && (
                        <p className="text-[11px] text-emerald-700 font-medium pt-1">
                          Approved by Administrator: {req.approvedByAdminName}{' '}
                          {req.approvedAt ? `on ${new Date(req.approvedAt).toLocaleTimeString()}` : ''}
                        </p>
                      )}

                      {req.adminNote && (
                        <p className="text-[11px] text-stone-500 italic">
                          Note: "{req.adminNote}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleRejectReset(req.requestId)}
                            disabled={processingResetId === req.requestId}
                            className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleApproveReset(req.requestId)}
                            disabled={processingResetId === req.requestId}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{processingResetId === req.requestId ? 'Approving...' : 'Approve Password Reset'}</span>
                          </button>
                        </>
                      ) : req.status === 'approved' ? (
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved &bull; Waiting for User to Set Password</span>
                        </span>
                      ) : req.status === 'completed' ? (
                        <span className="text-xs text-blue-700 font-semibold flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Password Changed Successfully</span>
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400 italic">Rejected</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADMIN CANCEL ORDER */}
      {cancellingOrderId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-stone-900">
                Administrative Order Cancellation
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              This intervention releases commodity stock back to the farmer, updates transaction status, and generates a formal audit log entry.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Mandatory Administrative Reason *
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
                onClick={() => setCancellingOrderId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminCancelOrder}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Execute Controlled Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN REMOVE USER (SELF, FELLOW ADMINS, ANY USER) */}
      {deletingUser !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-stone-900">
                {deletingUser.id === currentUser?.id || deletingUser.uid === currentUser?.uid
                  ? 'Confirm Self-Removal: Delete My Admin Account'
                  : deletingUser.role === 'admin'
                  ? 'Confirm Removal of Fellow Administrator'
                  : 'Confirm User Deletion'}
              </h3>
            </div>

            <div className="text-xs text-stone-600 mt-2 space-y-2 leading-relaxed">
              {deletingUser.id === currentUser?.id || deletingUser.uid === currentUser?.uid ? (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                  <p className="font-bold text-rose-950 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-700" />
                    <span>Warning: You are permanently removing YOURSELF!</span>
                  </p>
                  <p>
                    As an administrator, you have full authority to delete your own profile. This action will permanently remove your administrator record from the central PostgreSQL database and revoke your administrative session.
                  </p>
                </div>
              ) : deletingUser.role === 'admin' ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
                  <p className="font-bold text-amber-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Removing Fellow Administrator</span>
                  </p>
                  <p>
                    You are removing fellow administrator <strong>{deletingUser.fullName}</strong> ({deletingUser.email}). Their administrative credentials, privileges, and profile will be deleted from the database.
                  </p>
                </div>
              ) : (
                <p>
                  Are you sure you want to permanently delete <strong>{deletingUser.fullName}</strong> (Role: <span className="capitalize font-semibold">{deletingUser.role}</span>) from the central PostgreSQL database?
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isDeleting
                    ? 'Removing...'
                    : deletingUser.id === currentUser?.id || deletingUser.uid === currentUser?.uid
                    ? 'Permanently Delete My Admin Account'
                    : deletingUser.role === 'admin'
                    ? 'Remove Fellow Administrator'
                    : 'Confirm Removal'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
