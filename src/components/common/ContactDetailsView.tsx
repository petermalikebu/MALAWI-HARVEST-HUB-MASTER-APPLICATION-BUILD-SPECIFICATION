import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { safeParseResponse } from '../../lib/api.ts';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  Lock,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const ContactDetailsView: React.FC<{ onNavigateToRules?: () => void }> = ({ onNavigateToRules }) => {
  const { language, t } = useLanguage();
  const { currentUser } = useAuth();

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'problem' | 'suggestion' | 'transport_query' | 'other'>('problem');
  const [ticketMessage, setTicketMessage] = useState('');
  const [senderName, setSenderName] = useState(currentUser?.fullName || '');
  const [senderContact, setSenderContact] = useState(currentUser?.phoneNumber || currentUser?.email || '');
  const [senderDistrict, setSenderDistrict] = useState(currentUser?.district || 'Lilongwe');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSuccess('');
    setFeedbackError('');

    if (!ticketSubject.trim() || !ticketMessage.trim() || !senderName.trim()) {
      setFeedbackError('Please fill in your name, subject, and message details.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser?.uid || `guest-${Date.now()}`,
          userName: senderName.trim(),
          userEmail: currentUser?.email || (senderContact.includes('@') ? senderContact.trim() : 'visitor@mberalink.mw'),
          userPhone: senderContact.trim(),
          userRole: currentUser?.role || 'visitor',
          userDistrict: senderDistrict,
          category: ticketCategory,
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setFeedbackSuccess(
          language === 'ch'
            ? 'Uthenga wanu walandiridwa bwinobwino! Oyang\'anira Peter ndi Joshua Malikebu ayankha posachedwa.'
            : 'Your message has been submitted directly to Lead Administrators Peter Malikebu & Joshua Malikebu. We will reply promptly.'
        );
        setTicketSubject('');
        setTicketMessage('');
      } else {
        setFeedbackError(parsed.error || 'Failed to submit inquiry. Please call our hotline.');
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'Network error submitting inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-stone-900 to-emerald-900 text-white p-8 sm:p-10 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Mberalink • Executive Directory &amp; Regional Hubs</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {language === 'ch' ? 'Malumikizidwe & Maofesi a Mberalink' : 'Contact Us, Administrative Desk & Offices'}
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
            {language === 'ch'
              ? 'Mberalink imapezeka mosavuta kwa aliyense. Lumikizanani mwachindunji ndi oyang\'anira akulu, desiki la escrow, kapena maofesi am\'maboma popanda chopinga chilichonse.'
              : 'Nobody is a stranger to Mberalink. Reach out directly to our Lead Platform Administrators, Escrow Reconciliation Desk, and Regional Depot Hubs across Malawi.'}
          </p>
        </div>
      </div>

      {/* Leadership Directory Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-stone-900 text-base sm:text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-700" />
            <span>{language === 'ch' ? 'Oyang\'anira Akulu a pa Nsanja' : 'Executive Platform Administrators'}</span>
          </h2>
          {onNavigateToRules && (
            <button
              onClick={onNavigateToRules}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              {language === 'ch' ? 'Onani Malamulo a Nsanja &rarr;' : 'View Platform Trading Rules &rarr;'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Peter Malikebu Card */}
          <div className="bg-white rounded-3xl p-6 border border-purple-200/90 shadow-xs space-y-4 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-900 px-2.5 py-1 rounded-full">
                  Lead Platform Administrator
                </span>
                <h3 className="text-xl font-black text-stone-900 pt-1">Peter Malikebu</h3>
                <p className="text-xs text-stone-500 font-medium">Platform Architecture, Escrow Settlement &amp; Co-op Aggregation</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 font-black text-base flex items-center justify-center shrink-0">
                PM
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
              <div className="flex items-center gap-2 text-stone-700">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-stone-900">+265 999 036 912</span>
                <span className="text-[11px] text-stone-400 font-medium">(WhatsApp &amp; Calls)</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700">
                <Mail className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-semibold text-stone-800">petermalikebujr@gmail.com</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Area 10 / City Centre Commercial Complex, Lilongwe</span>
              </div>
              <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 text-[11px] text-purple-950 space-y-0.5">
                <span className="font-bold block text-purple-900">Official National Bank of Malawi Escrow:</span>
                <p className="font-mono font-bold text-emerald-800">Account: 1011619688</p>
                <p className="text-stone-500">Holder: PETER ADRIAN MALIKEBU</p>
              </div>
            </div>
          </div>

          {/* Joshua Malikebu Card */}
          <div className="bg-white rounded-3xl p-6 border border-indigo-200/90 shadow-xs space-y-4 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded-full">
                  Executive Operations Administrator
                </span>
                <h3 className="text-xl font-black text-stone-900 pt-1">Joshua Malikebu</h3>
                <p className="text-xs text-stone-500 font-medium">Freight Logistics, Haulage Verification &amp; District Inspections</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 font-black text-base flex items-center justify-center shrink-0">
                JM
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
              <div className="flex items-center gap-2 text-stone-700">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-stone-900">+265 991 817 976 / +265 880 882 372</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold text-stone-800">joshuamalikebu927@gmail.com</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Area 11 / City Centre Operations Hub, Lilongwe</span>
              </div>
              <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-[11px] text-indigo-950 space-y-0.5">
                <span className="font-bold block text-indigo-900">Official National Bank of Malawi Escrow:</span>
                <p className="font-mono font-bold text-emerald-800">Account: 1013388772</p>
                <p className="text-stone-500">Holder: JOSHUA MALIKEBU</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regional Operational Hubs */}
      <div className="space-y-3">
        <h2 className="font-extrabold text-stone-900 text-base sm:text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-700" />
          <span>{language === 'ch' ? 'Maofesi a M\'maboma 3 Akulu' : 'Regional Administrative Depots & Offices'}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs space-y-2">
            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
              Central Region Hub
            </span>
            <h4 className="font-bold text-stone-900 text-sm">Lilongwe Central Depot</h4>
            <p className="text-xs text-stone-600">Area 10 / City Centre Commercial Complex, Lilongwe</p>
            <p className="text-[11px] text-stone-500">
              Coordinating: Lilongwe, Mchinji, Dedza, Kasungu, Dowa, Salima, Ntchisi, Nkhotakota, Ntcheu
            </p>
            <div className="text-[11px] font-bold text-emerald-700 pt-1">Tel: +265 999 036 912</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs space-y-2">
            <span className="text-[10px] font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
              Southern Region Hub
            </span>
            <h4 className="font-bold text-stone-900 text-sm">Blantyre Commercial Hub</h4>
            <p className="text-xs text-stone-600">Victoria Avenue &amp; Chichiri Trade Grounds, Blantyre</p>
            <p className="text-[11px] text-stone-500">
              Coordinating: Blantyre, Zomba, Mangochi, Mulanje, Thyolo, Chikwawa, Nsanje, Balaka, Machinga
            </p>
            <div className="text-[11px] font-bold text-blue-700 pt-1">Tel: +265 895 357 535</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs space-y-2">
            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md uppercase">
              Northern Region Hub
            </span>
            <h4 className="font-bold text-stone-900 text-sm">Mzuzu Agricultural Depot</h4>
            <p className="text-xs text-stone-600">Central Market Road / Katoto Transit Shed, Mzuzu</p>
            <p className="text-[11px] text-stone-500">
              Coordinating: Mzuzu, Karonga, Rumphi, Nkhata Bay, Chitipa, Likoma
            </p>
            <div className="text-[11px] font-bold text-amber-700 pt-1">Tel: +265 991 817 976</div>
          </div>
        </div>
      </div>

      {/* Official Verified Payment & Escrow Gateways */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-400" />
          <h3 className="font-black text-base sm:text-lg">
            {language === 'ch' ? 'Maakaunti Ovomerezeka a Escrow a Mberalink' : 'Official Verified Escrow & Payment Channels'}
          </h3>
        </div>
        <p className="text-xs text-stone-300 max-w-2xl">
          Always verify payment details against these official accounts before initiating money transfers. Mberalink never accepts cash handoffs or unverified private mobile accounts.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 space-y-1">
            <span className="text-[10px] text-emerald-300 font-bold uppercase">National Bank of Malawi</span>
            <span className="text-base font-mono font-black text-white block">1011619688</span>
            <span className="text-[11px] text-stone-300">Peter Adrian Malikebu</span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 space-y-1">
            <span className="text-[10px] text-indigo-300 font-bold uppercase">National Bank of Malawi</span>
            <span className="text-base font-mono font-black text-white block">1013388772</span>
            <span className="text-[11px] text-stone-300">Joshua Malikebu</span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 space-y-1">
            <span className="text-[10px] text-rose-300 font-bold uppercase">Airtel Money Escrow</span>
            <span className="text-base font-mono font-black text-white block">+265 999 036 912</span>
            <span className="text-[11px] text-stone-300">Official Mobile Paybill</span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 space-y-1">
            <span className="text-[10px] text-amber-300 font-bold uppercase">TNM Mpamba Escrow</span>
            <span className="text-base font-mono font-black text-white block">+265 895 357 535</span>
            <span className="text-[11px] text-stone-300">Finance Disbursal Desk</span>
          </div>
        </div>
      </div>

      {/* Direct Interactive Message / Help Desk Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-stone-900">
              {language === 'ch' ? 'Tumizani Uthenga Mwachindunji kwa Oyang\'anira' : 'Direct Administrator Inquiry & Support Desk'}
            </h3>
            <p className="text-xs text-stone-500">
              Submit your inquiry, produce question, or logistics assistance. Logged in users will receive instant replies in their notifications.
            </p>
          </div>
        </div>

        {feedbackSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
        )}

        {feedbackError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{feedbackError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitTicket} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Your Full Name *</label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Kondwani Banda"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Phone or Email *</label>
              <input
                type="text"
                required
                value={senderContact}
                onChange={(e) => setSenderContact(e.target.value)}
                placeholder="+265 ... or email"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Inquiry Category</label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
              >
                <option value="problem">Problem / Need Assistance</option>
                <option value="suggestion">Suggestion / Feature Request</option>
                <option value="transport_query">Transport / Freight Logistics</option>
                <option value="other">General Platform Question</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="e.g. Weighbridge calibration support at Kamwendo depot"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Detailed Message / Question *</label>
            <textarea
              required
              rows={4}
              value={ticketMessage}
              onChange={(e) => setTicketMessage(e.target.value)}
              placeholder="Describe your inquiry, produce details, or question for the administration team..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-emerald-600 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-stone-400">
              Operating Hours: Monday – Saturday, 06:00 – 20:00 CAT (Escrow emergency 24/7)
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Sending...' : 'Send Message to Administrators'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
