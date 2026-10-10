import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { User as UserType, UserRole, MALAWI_DISTRICTS } from '../../types/index.ts';
import {
  Sprout,
  ShoppingCart,
  Truck,
  LogIn,
  UserPlus,
  ShieldCheck,
  Coins,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
} from 'lucide-react';

interface SignInViewProps {
  onLoginSuccess?: (user: UserType) => void;
}

export const SignInView: React.FC<SignInViewProps> = ({ onLoginSuccess }) => {
  const { loginWithEmailPassword, registerWithCredentials, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State (Supports all roles registered in the system)
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('farmer');
  const [regDistrict, setRegDistrict] = useState('Lilongwe');
  const [regPhone, setRegPhone] = useState('+265 ');
  const [regTradingArea, setRegTradingArea] = useState('');
  const [regVehicleType, setRegVehicleType] = useState('Light Truck (3-5 Ton)');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (!loginEmail.trim() || !loginPassword) {
        throw new Error('Please enter both your email address and password.');
      }
      const loggedInUser = await loginWithEmailPassword(loginEmail.trim(), loginPassword);
      setSuccessMsg(`Welcome, ${loggedInUser.fullName}! Directing to your portal...`);
      if (onLoginSuccess) {
        onLoginSuccess(loggedInUser);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regFullName.trim() || !regEmail.trim()) {
      setErrorMsg('Full name and email address are required.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please retype and confirm your password.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await registerWithCredentials({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
        role: regRole,
        district: regDistrict,
        phoneNumber: regPhone.trim(),
        tradingArea: regTradingArea.trim(),
        vehicleType: regRole === 'transporter' ? regVehicleType : '',
      });

      // Prompt user to sign in as explicitly required by the user instructions
      setSuccessMsg(
        result.message ||
          'Account created successfully! Please sign in below with your email and password.'
      );
      setLoginEmail(regEmail.trim());
      setLoginPassword('');
      setRegPassword('');
      setRegConfirmPassword('');
      setMode('signin');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-6 bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-green-800 to-stone-900 text-white p-7 text-center space-y-2.5">
        <div className="w-13 h-13 bg-white/10 rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-xs">
          <Sprout className="w-7 h-7 text-emerald-300" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Malawi Harvest Hub
        </h1>
        <p className="text-emerald-100 text-xs sm:text-sm max-w-md mx-auto">
          Agricultural Trade & Logistics Portal connecting Smallholder Farmers, Wholesale Buyers, and Freight Transporters across Malawi.
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Toggle between Sign In & Register */}
        <div className="flex bg-stone-100 p-1.5 rounded-2xl max-w-md mx-auto text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signin'
                ? 'bg-white text-stone-900 shadow-xs font-extrabold'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <LogIn className="w-4 h-4 text-emerald-700" />
            <span>Sign In to Account</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white text-stone-900 shadow-xs font-extrabold'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-700" />
            <span>Create New Account</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MODE: SIGN IN */}
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="e.g. name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Verifying Credentials...' : 'Sign In'}</span>
            </button>

            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-stone-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider relative">
                Or
              </span>
            </div>

            {/* Google Alternative Login */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-colors shadow-2xs"
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
              <span>Continue with Google</span>
            </button>


          </form>
        ) : (
          /* MODE: ACCOUNT REGISTRATION */
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kondwani Phiri"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. kondwani@mhh.mw"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Platform Role Selection (Supports every role in the system) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Select Your System Role *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRegRole('farmer')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    regRole === 'farmer'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Sprout className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block">Smallholder Farmer</span>
                    <span className="text-[10px] text-stone-500 block">List & sell produce</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('buyer')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    regRole === 'buyer'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 text-amber-700 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block">Commodity Buyer</span>
                    <span className="text-[10px] text-stone-500 block">Order with 4% escrow</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('transporter')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    regRole === 'transporter'
                      ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Truck className="w-4 h-4 text-blue-700 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block">Freight Transporter</span>
                    <span className="text-[10px] text-stone-500 block">Accept delivery jobs</span>
                  </div>
                </button>
              </div>

              {/* Administrative Roles row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                <button
                  type="button"
                  onClick={() => setRegRole('admin')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    regRole === 'admin'
                      ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold ring-2 ring-purple-500/20'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block">Platform Administrator</span>
                    <span className="text-[10px] text-stone-500 block">Management & oversight</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('finance_admin')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    regRole === 'finance_admin'
                      ? 'border-rose-600 bg-rose-50 text-rose-950 font-bold ring-2 ring-rose-500/20'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Coins className="w-4 h-4 text-rose-700 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block">Finance Administrator</span>
                    <span className="text-[10px] text-stone-500 block">Escrow & revenue approvals</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  District in Malawi *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <select
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-medium"
                  >
                    {MALAWI_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="+265 888 123 456"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Trading Area / Market Center
              </label>
              <input
                type="text"
                placeholder="e.g. Kamwendo Market, Mchinji"
                value={regTradingArea}
                onChange={(e) => setRegTradingArea(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
              />
            </div>

            {regRole === 'transporter' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Vehicle Type & Capacity *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Canter Light Truck (3-5 Ton), Reg: MZ 4421"
                  value={regVehicleType}
                  onChange={(e) => setRegVehicleType(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                />
              </div>
            )}

            {/* PASSWORD AND RETYPE CONFIRMATION PASSWORD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Enter Password * (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Create a strong password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Retype Password to Confirm *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Retype password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 p-0.5"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Back to Sign In
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md disabled:opacity-50 active:scale-[0.99] transition-all"
              >
                {submitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
