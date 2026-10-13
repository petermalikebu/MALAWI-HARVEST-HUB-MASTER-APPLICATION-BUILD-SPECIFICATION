import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { User as UserType, UserRole, MALAWI_DISTRICTS } from '../../types/index.ts';
import { safeParseResponse } from '../../lib/api.ts';
import {
  Sprout,
  LogIn,
  UserPlus,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  KeyRound,
  Clock,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  X,
} from 'lucide-react';
import { PasswordResetModal } from './PasswordResetModal.tsx';

interface SignInViewProps {
  onLoginSuccess?: (user: UserType) => void;
  onBackToLanding?: () => void;
  isModal?: boolean;
  initialMode?: 'signin' | 'register' | 'reset_password';
  onClose?: () => void;
}

export const SignInView: React.FC<SignInViewProps> = ({
  onLoginSuccess,
  onBackToLanding,
  isModal = false,
  initialMode = 'signin',
  onClose,
}) => {
  const { loginWithEmailPassword, registerWithCredentials, loginWithGoogle } = useAuth();
  const { subscribe } = useRealtime();

  const [mode, setMode] = useState<'signin' | 'register' | 'reset_password'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('farmer');
  const [regDistrict, setRegDistrict] = useState('Lilongwe');
  const [regPhone, setRegPhone] = useState('+265 ');
  const [regTradingArea, setRegTradingArea] = useState('');
  const [regVehicleType, setRegVehicleType] = useState('Light Truck (3-5 Ton)');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Password Reset Flow State
  // Step 1: 'request' -> user inputs email & phone, submits request
  // Step 2: 'awaiting_approval' -> screen waits with realtime auto-refresh for admin approval
  // Step 3: 'set_new_password' -> user enters new password and confirms
  const [resetStep, setResetStep] = useState<'request' | 'awaiting_approval' | 'set_new_password'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('+265 ');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [approvedAdminName, setApprovedAdminName] = useState<string>('Platform Administrator');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sync initialMode prop when modal is opened with specific mode
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
      if (initialMode === 'reset_password') {
        setResetStep('request');
      }
    }
  }, [initialMode]);

  // Real-time listener and polling for Password Reset Approval
  useEffect(() => {
    if (mode !== 'reset_password' || resetStep !== 'awaiting_approval' || !activeRequestId) return;

    // 1. WebSocket Realtime Event Listener
    const unsubApproved = subscribe('password_reset_approved', (data: any) => {
      if (
        data &&
        (data.requestId === activeRequestId ||
          (data.userEmail && data.userEmail.toLowerCase().trim() === resetEmail.toLowerCase().trim()))
      ) {
        setApprovedAdminName(data.approvedByAdminName || 'Peter Malikebu');
        setResetStep('set_new_password');
        setSuccessMsg(
          `Your password reset request was approved by ${data.approvedByAdminName || 'Administrator'}! Please enter your new password below.`
        );
      }
    });

    const unsubRejected = subscribe('password_reset_rejected', (data: any) => {
      if (data && data.requestId === activeRequestId) {
        setErrorMsg(data.reason || 'Password reset request was rejected by an administrator.');
        setResetStep('request');
      }
    });

    // 2. Fallback Polling every 2 seconds to guarantee instant response even if WebSocket reconnects
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/password-reset/status/${activeRequestId}`);
        if (res.ok) {
          const parsed = await safeParseResponse(res);
          if (parsed.ok && parsed.data?.request) {
            const reqData = parsed.data.request;
            if (reqData.status === 'approved') {
              setApprovedAdminName(reqData.approvedByAdminName || 'Peter Malikebu');
              setResetStep('set_new_password');
              setSuccessMsg(
                `Your password reset request was approved by ${reqData.approvedByAdminName || 'Administrator'}! Please enter your new password below.`
              );
            } else if (reqData.status === 'rejected') {
              setErrorMsg(reqData.adminNote || 'Your password reset request was rejected by an administrator.');
              setResetStep('request');
            }
          }
        }
      } catch (err) {
        console.error('Error polling password reset status:', err);
      }
    }, 2000);

    return () => {
      unsubApproved();
      unsubRejected();
      clearInterval(pollInterval);
    };
  }, [mode, resetStep, activeRequestId, resetEmail, subscribe]);

  const handleCheckStatusNow = async () => {
    if (!activeRequestId) return;
    try {
      const res = await fetch(`/api/password-reset/status/${activeRequestId}`);
      if (res.ok) {
        const parsed = await safeParseResponse(res);
        if (parsed.ok && parsed.data?.request) {
          const reqData = parsed.data.request;
          if (reqData.status === 'approved') {
            setApprovedAdminName(reqData.approvedByAdminName || 'Peter Malikebu');
            setResetStep('set_new_password');
            setSuccessMsg(
              `Your password reset request was approved by ${reqData.approvedByAdminName || 'Administrator'}! Please enter your new password below.`
            );
          } else if (reqData.status === 'rejected') {
            setErrorMsg(reqData.adminNote || 'Your password reset request was rejected by an administrator.');
            setResetStep('request');
          } else {
            setSuccessMsg('Request is currently pending review by Lead Administrator. Status rechecked successfully.');
          }
        }
      }
    } catch (err) {
      console.error('Error checking status manually:', err);
    }
  };

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

  // Step 1: Submit Reset Request
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!resetEmail.trim()) {
      setErrorMsg('Please enter the email address associated with your account.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          phoneNumber: resetPhone.trim(),
        }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to submit password reset request.');
      }

      setActiveRequestId(parsed.data?.requestId);
      setResetStep('awaiting_approval');
      setSuccessMsg(
        'Password reset request submitted successfully! Platform administrators (Peter & Joshua) have been notified.'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting password reset request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Enter New Password & Confirm
  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!activeRequestId) {
      setErrorMsg('No active password reset request found. Please submit a new request.');
      setResetStep('request');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match. Please retype and confirm.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: activeRequestId,
          newPassword: newPassword.trim(),
        }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to update password.');
      }

      // Successful reset: redirect user back to login page with prefilled email
      setSuccessMsg(
        'Password updated successfully! Please enter your email and newly set password to access your dashboard.'
      );
      setLoginEmail(resetEmail.trim());
      setLoginPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setActiveRequestId(null);
      setResetStep('request');
      setMode('signin');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardContent = (
    <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-green-800 to-stone-900 text-white p-7 text-center space-y-2.5 relative">
        {isModal ? (
          <button
            type="button"
            onClick={onClose || onBackToLanding}
            className="absolute right-4 top-4 text-white/80 hover:text-white p-2 rounded-xl bg-black/25 hover:bg-black/40 transition-colors shadow-xs"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="absolute left-5 top-5 text-white/80 hover:text-white flex items-center gap-1.5 text-xs font-semibold py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          )
        )}

        <div className="w-13 h-13 bg-white/10 rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-xs">
          <Sprout className="w-7 h-7 text-emerald-300" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Malawi Harvest Hub
        </h1>
        <p className="text-emerald-100 text-xs sm:text-sm max-w-md mx-auto">
          Agricultural Trade &amp; Logistics Portal connecting Smallholder Farmers, Wholesale Buyers, and Freight Transporters across Malawi.
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Navigation Mode Switcher - 3 Prominent Tabs */}
        <div className="flex bg-stone-100 p-1.5 rounded-2xl max-w-md mx-auto text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signin'
                ? 'bg-white text-stone-900 shadow-xs font-extrabold'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <LogIn className="w-4 h-4 text-emerald-700" />
            <span>Sign In</span>
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
            <span>Create Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('reset_password');
              setResetStep('request');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'reset_password'
                ? 'bg-white text-amber-900 shadow-xs font-extrabold border border-amber-200'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Reset Password</span>
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

        {/* ========================================================= */}
        {/* MODE 1: SIGN IN */}
        {/* ========================================================= */}
        {mode === 'signin' && (
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-700">Password *</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(loginEmail);
                    setIsResetModalOpen(true);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Forgot Password?</span>
                </button>
              </div>

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
              <span>Sign In with Google</span>
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* MODE 2: RESET PASSWORD (3-Step Administrator Workflow)    */}
        {/* ========================================================= */}
        {mode === 'reset_password' && (
          <div className="space-y-5">
            {/* Step Indicators */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-xs">
              <div className={`flex items-center gap-1.5 ${resetStep === 'request' ? 'text-emerald-700 font-extrabold' : 'text-stone-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${resetStep === 'request' ? 'bg-emerald-700 text-white' : 'bg-stone-200 text-stone-600'}`}>1</span>
                <span>Request Change</span>
              </div>
              <div className="h-0.5 w-6 bg-stone-200" />
              <div className={`flex items-center gap-1.5 ${resetStep === 'awaiting_approval' ? 'text-amber-700 font-extrabold' : 'text-stone-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${resetStep === 'awaiting_approval' ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-600'}`}>2</span>
                <span>Admin Approval</span>
              </div>
              <div className="h-0.5 w-6 bg-stone-200" />
              <div className={`flex items-center gap-1.5 ${resetStep === 'set_new_password' ? 'text-emerald-700 font-extrabold' : 'text-stone-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${resetStep === 'set_new_password' ? 'bg-emerald-700 text-white' : 'bg-stone-200 text-stone-600'}`}>3</span>
                <span>Set New Password</span>
              </div>
            </div>

            {/* SUB-STEP 1: Request Password Change */}
            {resetStep === 'request' && (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Administrator-Verified Password Reset</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Enter your registered email and phone number. Our Lead Platform Administrators (Peter Malikebu &amp; Joshua Malikebu) will receive your request and authorize your password change.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Registered Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. yourname@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Registered Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="+265 999 123 456"
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Used by administrators to confirm your identity before granting password change authorization.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                  >
                    Back to Sign In
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{submitting ? 'Submitting Request...' : 'Request Password Change'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* SUB-STEP 2: Waiting for Administrator Approval (Real-Time Auto Refresh) */}
            {resetStep === 'awaiting_approval' && (
              <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 text-center space-y-4 animate-in fade-in duration-200">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-700 relative">
                  <Clock className="w-7 h-7 text-amber-600 animate-spin" />
                  <span className="absolute top-1 right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-900">
                    Awaiting Administrator Approval
                  </h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                    Your password reset request for <span className="font-bold text-stone-900">{resetEmail}</span> (Phone: {resetPhone}) has been dispatched to Lead Administrators <span className="font-semibold text-stone-800">Peter Malikebu</span> &amp; <span className="font-semibold text-stone-800">Joshua Malikebu</span>.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-amber-200/80 max-w-sm mx-auto text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-stone-500 text-[11px]">
                    <span>Request Reference:</span>
                    <span className="font-mono font-bold text-stone-900">{activeRequestId}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold text-[11px] pt-1 border-t border-stone-100">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Real-time listener active: This page will automatically refresh once approved!</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-500 max-w-md mx-auto">
                  Administrators receive an instant notification on their dashboard. You do not need to do anything; as soon as they click Approve, the new password form will appear automatically.
                </p>

                <div className="pt-2 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCheckStatusNow}
                    className="px-4 py-2 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check Approval Status Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('request');
                      setActiveRequestId(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white rounded-xl border border-stone-200"
                  >
                    Cancel / Edit Details
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setResetStep('request');
                      setActiveRequestId(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-100/60 rounded-xl"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* SUB-STEP 3: Enter New Password Form (Automatic Refresh after Approval) */}
            {resetStep === 'set_new_password' && (
              <form onSubmit={handleConfirmNewPassword} className="space-y-4 animate-in zoom-in-95 duration-200">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Reset Approved by Administrator {approvedAdminName}!</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed">
                    Your identity has been verified. Please enter and confirm your new password below to regain full access to your account.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 p-0.5"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Confirm your new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 p-0.5"
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setResetStep('request');
                      setActiveRequestId(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                  >
                    Back to Sign In
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitting ? 'Updating Password...' : 'Confirm & Update Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 3: CREATE NEW ACCOUNT                                */}
        {/* ========================================================= */}
        {mode === 'register' && (
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
                    placeholder="e.g. Chimwemwe Banda"
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
                    placeholder="e.g. chimwemwe@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  I want to join as: *
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-medium"
                >
                  <option value="farmer">Smallholder Farmer (Selling Produce)</option>
                  <option value="buyer">Agro-Commodity Buyer (Purchasing Produce)</option>
                  <option value="transporter">Freight Transporter (Haulage &amp; Logistics)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  District *
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Phone Number (Airtel / TNM) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="+265 999 123 456"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Trading Area / Depot Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kapiri Grain Depot"
                  value={regTradingArea}
                  onChange={(e) => setRegTradingArea(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                />
              </div>
            </div>

            {regRole === 'transporter' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Vehicle Type / Capacity *
                </label>
                <select
                  value={regVehicleType}
                  onChange={(e) => setRegVehicleType(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-medium"
                >
                  <option value="Pickup (1-2 Ton)">Pickup (1-2 Ton)</option>
                  <option value="Light Truck (3-5 Ton)">Light Truck (3-5 Ton)</option>
                  <option value="Medium Truck (5-7 Ton)">Medium Truck (5-7 Ton)</option>
                  <option value="Heavy Truck (10-15 Ton)">Heavy Truck (10-15 Ton)</option>
                  <option value="Articulated Trailer (20-30 Ton)">Articulated Trailer (20-30 Ton)</option>
                  <option value="Motorcycle / Tricycle">Motorcycle / Tricycle</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Password *
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
        {/* Dedicated Step-by-Step Password Reset Modal */}
        <PasswordResetModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          initialEmail={loginEmail || resetEmail}
          initialPhone={resetPhone}
          onSuccessRedirectToLogin={(email) => {
            setLoginEmail(email);
            setLoginPassword('');
            setMode('signin');
            setSuccessMsg('Password updated successfully! Please enter your new password to sign in to your dashboard.');
          }}
        />
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget && (onClose || onBackToLanding)) {
            (onClose || onBackToLanding)!();
          }
        }}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-6">
      {cardContent}
    </div>
  );
};
