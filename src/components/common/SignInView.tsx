import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole, MALAWI_DISTRICTS, User } from '../../types/index.ts';
import {
  Sprout,
  ShoppingCart,
  Truck,
  ShieldCheck,
  Coins,
  LogIn,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const SignInView: React.FC = () => {
  const { loginWithGoogle, switchDemoRole, registerNewUser, loginAsUser } = useAuth();

  const [mode, setMode] = useState<'quick' | 'register'>('quick');
  const [existingUsers, setExistingUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Registration state
  const [regForm, setRegForm] = useState({
    fullName: '',
    email: '',
    role: 'farmer' as UserRole,
    district: 'Lilongwe',
    phoneNumber: '+265 ',
    tradingArea: '',
    vehicleType: '',
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await fetch('/api/users');
        if (res.ok) {
          const list = await res.json();
          setExistingUsers(list);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await registerNewUser(regForm);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-8 bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-green-800 to-stone-900 text-white p-8 text-center space-y-3">
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-xs">
          <Sprout className="w-8 h-8 text-emerald-300" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Malawi Harvest Hub
        </h1>
        <p className="text-emerald-100 text-xs sm:text-sm max-w-lg mx-auto">
          Agricultural Trade & Logistics Portal connecting Smallholder Farmers, Wholesale Buyers, Transporters, and Administrators across Malawi.
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Toggle between Quick Sign In & Register */}
        <div className="flex bg-stone-100 p-1 rounded-xl max-w-md mx-auto text-xs font-bold">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'quick' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Demo Roles</span>
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'register' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New Account</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        {mode === 'quick' ? (
          <div className="space-y-6">
            {/* Google OAuth Button */}
            <div>
              <button
                onClick={loginWithGoogle}
                className="w-full py-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-colors shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google Account</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-stone-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider relative">
                Or Sign In As Ecosystem Role
              </span>
            </div>

            {/* Quick Demo Role Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => switchDemoRole('farmer')}
                className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-left transition-all hover:scale-[1.01] shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-stone-900 text-xs">Smallholder Farmer</div>
                    <div className="text-[11px] text-stone-500">Chimwemwe Phiri &bull; Mchinji</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <button
                onClick={() => switchDemoRole('buyer')}
                className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left transition-all hover:scale-[1.01] shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-stone-900 text-xs">Agro-Commodity Buyer</div>
                    <div className="text-[11px] text-stone-500">Alinafe Banda &bull; Lilongwe</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <button
                onClick={() => switchDemoRole('transporter')}
                className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition-all hover:scale-[1.01] shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-stone-900 text-xs">Freight Transporter</div>
                    <div className="text-[11px] text-stone-500">Kondwani Chirwa &bull; 5-Ton Canter</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <button
                onClick={() => loginAsUser('frF3xukObzdA8AhCBYIBPYV0UK13')}
                className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-left transition-all hover:scale-[1.01] shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-stone-900 text-xs">Peter Malikebu (Lead Admin)</div>
                    <div className="text-[11px] text-stone-500">+265 999 036 912 &bull; Lilongwe</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <button
                onClick={() => loginAsUser('9DXK6Cfy4FaODmqyVm7q8yrKup82')}
                className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-left transition-all hover:scale-[1.01] shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-stone-900 text-xs">Joshua Malikebu (Lead Admin)</div>
                    <div className="text-[11px] text-stone-500">+265 991 81 79 76 &bull; Lilongwe</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <button
                onClick={() => switchDemoRole('finance_admin')}
                className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-left transition-all hover:scale-[1.01] shadow-2xs group sm:col-span-2"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-stone-900 text-xs">Finance Administrator</div>
                    <div className="text-[11px] text-stone-500">Chisomo Mwale &bull; Revenue Ledger & Commission</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </div>

            {/* Existing Database User Accounts */}
            {existingUsers.length > 0 && (
              <div className="pt-2 border-t border-stone-100">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                  All Active Database Accounts ({existingUsers.length})
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-stone-100 text-xs">
                  {existingUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => loginAsUser(u.uid)}
                      className="py-2 px-2 hover:bg-stone-50 rounded-lg flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-stone-800">{u.fullName}</span>
                        <span className="text-[10px] text-stone-400 ml-2">({u.role})</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold hover:underline">
                        Log In &rarr;
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kondwani Tembo"
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. kondwani.tembo@mhh.mw"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Platform Role *
                </label>
                <select
                  value={regForm.role}
                  onChange={(e) => setRegForm({ ...regForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                >
                  <option value="farmer">Smallholder Farmer</option>
                  <option value="buyer">Agro-Commodity Buyer</option>
                  <option value="transporter">Freight Transporter</option>
                  <option value="admin">Platform Administrator</option>
                  <option value="finance_admin">Finance Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  District in Malawi *
                </label>
                <select
                  value={regForm.district}
                  onChange={(e) => setRegForm({ ...regForm, district: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                >
                  {MALAWI_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+265 888 123 456"
                  value={regForm.phoneNumber}
                  onChange={(e) => setRegForm({ ...regForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Trading Area / Market
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nkhamenya Market, Kasungu"
                  value={regForm.tradingArea}
                  onChange={(e) => setRegForm({ ...regForm, tradingArea: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                />
              </div>
            </div>

            {regForm.role === 'transporter' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Vehicle Type & Capacity
                </label>
                <input
                  type="text"
                  placeholder="e.g. Light Truck (3-5 Ton), Reg: MZ 1084"
                  value={regForm.vehicleType}
                  onChange={(e) => setRegForm({ ...regForm, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
                />
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setMode('quick')}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Back to Sign In
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Create Account & Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
