import React, { useState, useEffect } from 'react';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { safeParseResponse } from '../../lib/api.ts';
import {
  KeyRound,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  X,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  initialPhone?: string;
  onSuccessRedirectToLogin?: (email: string) => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  initialPhone = '+265 ',
  onSuccessRedirectToLogin,
}) => {
  const { subscribe } = useRealtime();

  // Step 1: 'request' | Step 2: 'awaiting_approval' | Step 3: 'set_new_password'
  const [step, setStep] = useState<'request' | 'awaiting_approval' | 'set_new_password'>('request');

  // Step 1 Form state
  const [email, setEmail] = useState(initialEmail);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);

  // Step 2 & 3 State
  const [requestId, setRequestId] = useState<string | null>(null);
  const [approvedAdminName, setApprovedAdminName] = useState<string>('Platform Administrator');
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Step 3 Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // UI status
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialEmail) setEmail(initialEmail);
      if (initialPhone && initialPhone !== '+265 ') setPhoneNumber(initialPhone);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialEmail, initialPhone]);

  // Real-time listener and polling for Administrator Approval
  useEffect(() => {
    if (!isOpen || step !== 'awaiting_approval' || !requestId) return;

    // 1. WebSocket Realtime Event Listener
    const unsubApproved = subscribe('password_reset_approved', (data: any) => {
      if (
        data &&
        (data.requestId === requestId ||
          (data.userEmail && data.userEmail.toLowerCase().trim() === email.toLowerCase().trim()))
      ) {
        setApprovedAdminName(data.approvedByAdminName || 'Peter Malikebu');
        setStep('set_new_password');
        setSuccessMsg(
          `Your password reset request was approved by Administrator ${data.approvedByAdminName || 'Peter Malikebu'}! Please enter your new password below.`
        );
        setErrorMsg('');
      }
    });

    const unsubRejected = subscribe('password_reset_rejected', (data: any) => {
      if (data && data.requestId === requestId) {
        setErrorMsg(data.reason || 'Password reset request was declined by an administrator.');
        setStep('request');
      }
    });

    // 2. Active Fallback Polling every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/password-reset/status/${requestId}`);
        if (res.ok) {
          const parsed = await safeParseResponse(res);
          if (parsed.ok && parsed.data?.request) {
            const reqData = parsed.data.request;
            if (reqData.status === 'approved') {
              setApprovedAdminName(reqData.approvedByAdminName || 'Peter Malikebu');
              setStep('set_new_password');
              setSuccessMsg(
                `Your password reset request was approved by Administrator ${reqData.approvedByAdminName || 'Peter Malikebu'}! Please enter your new password below.`
              );
              setErrorMsg('');
            } else if (reqData.status === 'rejected') {
              setErrorMsg(reqData.adminNote || 'Your password reset request was declined by an administrator.');
              setStep('request');
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
  }, [isOpen, step, requestId, email, subscribe]);

  // Step 1: Submit Password Reset Request
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to submit password reset request.');
      }

      setRequestId(parsed.data?.requestId);
      setStep('awaiting_approval');
      setSuccessMsg(
        'Request submitted! Lead Platform Administrators (Peter Malikebu & Joshua Malikebu) have been alerted.'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting password reset request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Manual Check Status Button
  const handleManualCheckStatus = async () => {
    if (!requestId) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/password-reset/status/${requestId}`);
      if (res.ok) {
        const parsed = await safeParseResponse(res);
        if (parsed.ok && parsed.data?.request) {
          const reqData = parsed.data.request;
          if (reqData.status === 'approved') {
            setApprovedAdminName(reqData.approvedByAdminName || 'Peter Malikebu');
            setStep('set_new_password');
            setSuccessMsg(
              `Approved by Administrator ${reqData.approvedByAdminName || 'Peter Malikebu'}! Please set your new password.`
            );
            setErrorMsg('');
          } else if (reqData.status === 'rejected') {
            setErrorMsg(reqData.adminNote || 'Your request was rejected by an administrator.');
            setStep('request');
          } else {
            setSuccessMsg('Request is pending review on the administrator dashboard. Checking live...');
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Step 3: Dynamic Form - Set New Password and Confirm
  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!requestId) {
      setErrorMsg('Active reset authorization not found. Please submit a new request.');
      setStep('request');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match. Please retype confirmation password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          newPassword: newPassword.trim(),
        }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to update password.');
      }

      setSuccessMsg(
        'Password updated successfully! Redirecting you to sign in with your new password...'
      );

      // Give user a brief moment to see success then redirect to login with prefilled email
      setTimeout(() => {
        if (onSuccessRedirectToLogin) {
          onSuccessRedirectToLogin(email.trim());
        }
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-white/80 hover:text-white p-2 rounded-xl bg-black/25 hover:bg-black/40 transition-colors shadow-xs"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-700 via-emerald-800 to-stone-900 text-white p-6 sm:p-7 text-center space-y-2 relative">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-xs">
            <KeyRound className="w-6 h-6 text-amber-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Password Reset Center
          </h2>
          <p className="text-amber-100/90 text-xs sm:text-sm max-w-md mx-auto">
            Administrator-Authorized Security Workflow for Smallholder Farmers, Wholesale Buyers, and Freight Transporters.
          </p>
        </div>

        {/* Step-by-Step Indicator */}
        <div className="px-6 pt-5 bg-stone-50 border-b border-stone-200">
          <div className="flex items-center justify-between text-xs pb-3.5">
            {/* Step 1 Indicator */}
            <div
              className={`flex items-center gap-1.5 transition-colors ${
                step === 'request'
                  ? 'text-amber-800 font-extrabold'
                  : 'text-stone-400 font-medium'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'request'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                1
              </span>
              <span>1. Request Reset</span>
            </div>

            <div className={`h-0.5 w-8 sm:w-12 ${step !== 'request' ? 'bg-amber-600' : 'bg-stone-200'}`} />

            {/* Step 2 Indicator */}
            <div
              className={`flex items-center gap-1.5 transition-colors ${
                step === 'awaiting_approval'
                  ? 'text-amber-800 font-extrabold'
                  : step === 'set_new_password'
                  ? 'text-emerald-700 font-bold'
                  : 'text-stone-400 font-medium'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'awaiting_approval'
                    ? 'bg-amber-600 text-white shadow-xs animate-pulse'
                    : step === 'set_new_password'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                2
              </span>
              <span>2. Admin Approval</span>
            </div>

            <div className={`h-0.5 w-8 sm:w-12 ${step === 'set_new_password' ? 'bg-emerald-600' : 'bg-stone-200'}`} />

            {/* Step 3 Indicator */}
            <div
              className={`flex items-center gap-1.5 transition-colors ${
                step === 'set_new_password'
                  ? 'text-emerald-800 font-extrabold'
                  : 'text-stone-400 font-medium'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'set_new_password'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                3
              </span>
              <span>3. Set Password</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1: FORM TO REQUEST PASSWORD RESET VIA EMAIL & PHONE */}
          {/* ========================================================= */}
          {step === 'request' && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Step 1: Request Password Change</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Enter your registered phone number and email address below. Once submitted, our Platform Administrators (Peter Malikebu &amp; Joshua Malikebu) will receive a live notification on their dashboard to approve your password change.
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
                    placeholder="e.g. chimwemwe.phiri@mhh.mw"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Registered Phone Number (Airtel / TNM) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="+265 888 123 456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 font-medium"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Used by administrators to confirm your identity before authorizing your password reset.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
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

          {/* ========================================================= */}
          {/* STEP 2: STATUS MESSAGE FOR PENDING ADMIN APPROVAL        */}
          {/* ========================================================= */}
          {step === 'awaiting_approval' && (
            <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-700 relative shadow-2xs">
                <Clock className="w-7 h-7 text-amber-600 animate-spin" />
                <span className="absolute top-1 right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">
                  Step 2: Awaiting Administrator Approval
                </h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                  Your password reset request for <span className="font-bold text-stone-900">{email}</span> (Phone: {phoneNumber}) has been dispatched to Lead Administrators <span className="font-semibold text-stone-800">Peter Malikebu</span> &amp; <span className="font-semibold text-stone-800">Joshua Malikebu</span>.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-amber-200/90 max-w-sm mx-auto text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500 text-[11px]">
                  <span>Authorization Reference:</span>
                  <span className="font-mono font-bold text-stone-900">{requestId}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold text-[11px] pt-1.5 border-t border-stone-100">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Real-time listener active: The page will automatically refresh once approved!</span>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 max-w-md mx-auto">
                Administrators receive an instant notification banner on their dashboard. You do not need to do anything; the moment they click Approve, the new password form will dynamically appear.
              </p>

              <div className="pt-2 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleManualCheckStatus}
                  disabled={checkingStatus}
                  className="px-4 py-2 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                  <span>{checkingStatus ? 'Checking...' : 'Check Approval Status Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setRequestId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white rounded-xl border border-stone-200"
                >
                  Edit Request Details
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-100/60 rounded-xl"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: DYNAMIC FORM AFTER ADMIN APPROVAL TO SET PASSWORD */}
          {/* ========================================================= */}
          {step === 'set_new_password' && (
            <form onSubmit={handleConfirmNewPassword} className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Step 3: Reset Approved by Administrator {approvedAdminName}!</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Your identity has been verified. Enter and confirm your new password below to regain full access to your personal account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Enter New Password *
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
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
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
      </div>
    </div>
  );
};
