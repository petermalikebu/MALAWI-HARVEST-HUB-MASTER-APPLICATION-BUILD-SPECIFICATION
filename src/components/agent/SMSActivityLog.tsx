import React, { useState, useMemo, useEffect } from 'react';
import { SmsNotification, OfflineFarmer } from '../../types/index.ts';
import { safeParseResponse } from '../../lib/api.ts';
import { requestFcmToken } from '../../lib/firebase.ts';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  Phone,
  Filter,
  Copy,
  Check,
  RotateCw,
  ExternalLink,
  ChevronDown,
  User,
  ShieldCheck,
  MapPin,
  Radio,
  FileText,
  X,
  Info,
  Settings,
  Globe,
  Sliders,
  SendHorizontal,
  CheckCheck,
  Zap,
} from 'lucide-react';

interface SMSActivityLogProps {
  district: string;
  smsLogs: SmsNotification[];
  farmers: OfflineFarmer[];
  onRefreshLogs?: () => void;
  onOpenKeypadSimulator?: () => void;
}

/**
 * Generates a cross-platform mobile SMS URI scheme that launches
 * the device's native messaging application (Android Messages, Samsung Messages, iOS Messages)
 * pre-populated with the target phone number and message body.
 */
export function createDeviceSmsUri(phone: string, message: string): string {
  if (!phone) return '#';
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const encodedBody = encodeURIComponent(message || '');
  // iOS Messages traditionally prefers '&body=', Android prefers '?body='
  const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIos ? '&' : '?';
  return `sms:${cleanPhone}${separator}body=${encodedBody}`;
}

export const SMSActivityLog: React.FC<SMSActivityLogProps> = ({
  district,
  smsLogs,
  farmers,
  onRefreshLogs,
  onOpenKeypadSimulator,
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [selectedFarmerPhone, setSelectedFarmerPhone] = useState<string>('all');

  // Interactive Action States
  const [retryingSmsId, setRetryingSmsId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSmsForDetails, setSelectedSmsForDetails] = useState<SmsNotification | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Direct SMS Composer Modal State
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeRecipientPhone, setComposeRecipientPhone] = useState('');
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeLang, setComposeLang] = useState<'ch' | 'en'>('ch');
  const [composeEventType, setComposeEventType] = useState<'broadcast_announcement' | 'produce_listed' | 'order_received'>('broadcast_announcement');
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  // Real Mobile Phone Test Modal State
  const [showTestRealModal, setShowTestRealModal] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('+265 999 036 912');
  const [testRecipientName, setTestRecipientName] = useState('Peter Malikebu');
  const [testMessageText, setTestMessageText] = useState('MBERALINK: Mwalandiridwa! Nambala yanu ya mlimi ndi MBR-ZOM-2026-0001. PIN yanu ndi 4829.');
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);
  const [testOutcome, setTestOutcome] = useState<any>(null);

  // Firebase Cloud Messaging (FCM) Console State
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [gatewayStatusData, setGatewayStatusData] = useState<any>(null);
  const [isRegisteringFcm, setIsRegisteringFcm] = useState(false);
  const [fcmRegisteredToken, setFcmRegisteredToken] = useState<string | null>(null);
  const [isSendingFcmTest, setIsSendingFcmTest] = useState(false);

  // Fetch gateway status
  const fetchGatewayStatus = async () => {
    try {
      const res = await fetch('/api/agent/sms/gateway-status');
      if (res.ok) {
        const data = await res.json();
        setGatewayStatusData(data);
      }
    } catch (err) {
      console.warn('Failed to fetch gateway status:', err);
    }
  };

  useEffect(() => {
    fetchGatewayStatus();
  }, []);

  // Auto-dismiss notification after 4.5 seconds
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  // Format timestamp nicely
  const formatFullTimestamp = (dateString: string | Date | undefined): string => {
    if (!dateString) return 'Just now';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string | Date | undefined): string => {
    if (!dateString) return 'Just now';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Map farmer phone to offline farmer record
  const farmerMapByPhone = useMemo(() => {
    const map = new Map<string, OfflineFarmer>();
    for (const f of farmers) {
      if (f.phoneNumber) {
        map.set(f.phoneNumber.replace(/\s+/g, ''), f);
      }
    }
    return map;
  }, [farmers]);

  // Filter logs for this district and user search
  const filteredLogs = useMemo(() => {
    return smsLogs.filter((log) => {
      // 1. District match
      const isDistrictMatch =
        !log.district ||
        log.district.toLowerCase() === district.toLowerCase() ||
        district === 'All Districts';

      if (!isDistrictMatch) return false;

      // 2. Status match (Sent includes delivered and sent)
      if (statusFilter === 'sent') {
        const isSent = log.deliveryStatus === 'sent' || log.deliveryStatus === 'delivered';
        if (!isSent) return false;
      } else if (statusFilter === 'failed') {
        if (log.deliveryStatus !== 'failed') return false;
      }

      // 3. Event type match
      if (eventTypeFilter !== 'all' && log.eventType !== eventTypeFilter) {
        return false;
      }

      // 4. Specific farmer phone filter
      if (selectedFarmerPhone !== 'all') {
        const cleanRecip = (log.recipientPhone || '').replace(/\s+/g, '');
        const cleanTarget = selectedFarmerPhone.replace(/\s+/g, '');
        if (!cleanRecip.includes(cleanTarget)) return false;
      }

      // 5. Keyword search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (log.recipientName || '').toLowerCase().includes(q);
        const matchesPhone = (log.recipientPhone || '').toLowerCase().includes(q);
        const matchesId = (log.smsId || '').toLowerCase().includes(q);
        const matchesText = (log.messageText || '').toLowerCase().includes(q);
        const matchesRef = (log.relatedRecordNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesId && !matchesText && !matchesRef) {
          return false;
        }
      }

      return true;
    });
  }, [smsLogs, district, statusFilter, eventTypeFilter, selectedFarmerPhone, searchTerm]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const districtLogs = smsLogs.filter(
      (l) => !l.district || l.district.toLowerCase() === district.toLowerCase() || district === 'All Districts'
    );
    const total = districtLogs.length;
    const sentCount = districtLogs.filter(
      (l) => l.deliveryStatus === 'sent' || l.deliveryStatus === 'delivered'
    ).length;
    const failedCount = districtLogs.filter((l) => l.deliveryStatus === 'failed').length;
    const pendingCount = districtLogs.filter((l) => l.deliveryStatus === 'pending').length;
    const successRate = total > 0 ? Math.round((sentCount / total) * 100) : 100;

    return { total, sentCount, failedCount, pendingCount, successRate };
  }, [smsLogs, district]);

  // Copy message text to clipboard
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Re-send / Retry SMS
  const handleRetrySms = async (sms: SmsNotification) => {
    setRetryingSmsId(sms.smsId);
    try {
      const res = await fetch('/api/agent/sms/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsId: sms.smsId }),
      });
      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        showFeedback(
          'success',
          `SMS ${sms.smsId} successfully re-sent to ${sms.recipientName} (${sms.recipientPhone}). Status updated to Sent.`
        );
        if (onRefreshLogs) onRefreshLogs();
      } else {
        throw new Error(parsed.error || 'Failed to resend SMS');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error communicating with SMS dispatch gateway');
    } finally {
      setRetryingSmsId(null);
    }
  };

  // Compose and dispatch direct SMS
  const handleSendDirectSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeRecipientPhone || !composeRecipientName || !composeMessage.trim()) {
      showFeedback('error', 'Please fill in the recipient phone, name, and SMS message text.');
      return;
    }

    setIsSendingDirect(true);
    try {
      const res = await fetch('/api/agent/sms/send-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: composeRecipientPhone,
          recipientName: composeRecipientName,
          district,
          messageText: composeMessage.trim(),
          messageLanguage: composeLang,
          eventType: composeEventType,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        showFeedback(
          'success',
          `SMS dispatched to ${composeRecipientName} (${composeRecipientPhone}). Log recorded.`
        );
        setShowComposeModal(false);
        setComposeMessage('');
        setComposeRecipientPhone('');
        setComposeRecipientName('');
        if (onRefreshLogs) onRefreshLogs();
      } else {
        throw new Error(parsed.error || 'Failed to dispatch SMS');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error dispatching SMS');
    } finally {
      setIsSendingDirect(false);
    }
  };

  // Live test send to physical phone
  const handleDispatchTestToRealPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatchingTest(true);
    setTestOutcome(null);

    try {
      const res = await fetch('/api/agent/sms/test-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhoneNumber,
          name: testRecipientName,
          customText: testMessageText,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setTestOutcome(parsed.data);
        showFeedback('success', `Test SMS processed! Output recorded.`);
        if (onRefreshLogs) onRefreshLogs();
      } else {
        throw new Error(parsed.error || 'Failed to execute test SMS dispatch');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error running test SMS dispatch');
    } finally {
      setIsDispatchingTest(false);
    }
  };

  // Register this browser/device with Firebase Cloud Messaging
  const handleEnableFcmPush = async () => {
    setIsRegisteringFcm(true);
    try {
      const token = await requestFcmToken({
        role: 'agent',
        district,
      });
      if (token) {
        setFcmRegisteredToken(token);
        showFeedback('success', 'Device successfully registered with Firebase Cloud Messaging (FCM)!');
        fetchGatewayStatus();
      } else {
        showFeedback('error', 'Push permission was not granted or not supported in this browser.');
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to register with Firebase Cloud Messaging');
    } finally {
      setIsRegisteringFcm(false);
    }
  };

  // Dispatch live test broadcast via Firebase Cloud Messaging
  const handleSendFcmTestBroadcast = async () => {
    setIsSendingFcmTest(true);
    try {
      const res = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'all_farmers',
          title: 'Mberalink Firebase Broadcast Test',
          body: `Test broadcast dispatched at ${new Date().toLocaleTimeString()} across Malawi via Firebase Cloud Messaging.`,
        }),
      });
      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        showFeedback('success', 'FCM Broadcast test sent successfully to topic: all_farmers!');
        fetchGatewayStatus();
      } else {
        throw new Error(parsed.error || 'Failed to dispatch FCM test');
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Error triggering FCM test');
    } finally {
      setIsSendingFcmTest(false);
    }
  };

  // Select farmer from registered list for direct compose
  const handleSelectFarmerForCompose = (farmerId: string) => {
    const found = farmers.find((f) => f.farmerId === farmerId);
    if (found) {
      setComposeRecipientName(found.fullName);
      setComposeRecipientPhone(found.phoneNumber);
      setComposeLang(found.preferredLanguage || 'ch');
    }
  };

  // Event type humanizer
  const getEventLabel = (type: string): string => {
    switch (type) {
      case 'farmer_registered':
        return 'Registration & PIN';
      case 'produce_listed':
        return 'Produce Listed';
      case 'order_received':
        return 'Order Received';
      case 'order_paid':
        return 'Escrow Secured';
      case 'transporter_assigned':
        return 'Transport Assigned';
      case 'delivery_confirmed':
        return 'Delivery Confirmed';
      case 'payment_released':
        return 'Payout Released';
      case 'broadcast_announcement':
        return 'Advisory Broadcast';
      case 'verification_code':
        return 'Verification PIN';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-1 duration-150 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-stone-400 hover:text-stone-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real Phone Delivery Explanation & Integration Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-900 via-green-950 to-stone-900 text-white shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-400/30">
                Cellular Telecommunication Integration
              </span>
              <span className="text-xs text-stone-300">
                Airtel Malawi &amp; TNM Mobile Networks
              </span>
            </div>
            <h3 className="font-black text-white text-base">
              Real-Time Handset Delivery: How SMS Reaches Farmers&apos; Physical Mobile Phones
            </h3>
            <p className="text-xs text-emerald-100 max-w-3xl leading-relaxed">
              Mberalink provides two active paths to deliver notifications directly into farmers&apos; native phone messaging applications:
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setShowTestRealModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Test on Physical Phone</span>
            </button>
            <button
              onClick={() => setShowGatewayModal(true)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-300" />
              <span>Firebase Cloud Messaging (FCM)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs border-t border-emerald-800/60">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <Smartphone className="w-4 h-4" />
              <span>Method 1: Direct Handset SMS App Dispatch (Zero Cost)</span>
            </div>
            <p className="text-stone-300 text-[11px] leading-relaxed">
              Tap the green <strong>&ldquo;Send via Phone Messages App&rdquo;</strong> button on any message card. It immediately launches your Android or iPhone Messages app pre-populated with the farmer&apos;s real number (<code className="text-white">+265...</code>) and exact Chichewa/English message, ready to send using your local SIM airtime or bundle.
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Radio className="w-4 h-4" />
              <span>Method 2: Firebase Cloud Messaging (FCM Native Dispatch)</span>
            </div>
            <p className="text-stone-300 text-[11px] leading-relaxed">
              Automated real-time push and background alerts via <strong>Google Firebase Cloud Messaging</strong>. Fully integrated with project <code className="text-white">chromatic-flame-t83d0</code> with zero 3rd-party subscription costs or external secret keys.
            </p>
          </div>
        </div>
      </div>

      {/* Header and Control Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                SMS Activity Log
              </h2>
              <span className="text-xs text-stone-500">
                · {district} District Hub
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
              Real-time audit log of all automated transaction alerts, registration credentials, and logistics notifications dispatched directly to registered farmers&apos; keypad phones via TNM and Airtel Malawi GSM networks.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowComposeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Advisory SMS</span>
            </button>

            {onOpenKeypadSimulator && (
              <button
                onClick={onOpenKeypadSimulator}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Preview how messages appear on 2G keypad devices"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Keypad Simulator (*265#)</span>
              </button>
            )}

            {onRefreshLogs && (
              <button
                onClick={onRefreshLogs}
                className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
                title="Refresh SMS notifications"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Aggregate Delivery Metrics (No pill enclosures; clean typography) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-100 text-xs">
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
            <span className="text-stone-500 text-[11px] block">Total Dispatched</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-stone-900">{metrics.total}</span>
              <span className="text-[10px] text-stone-500">messages</span>
            </div>
          </div>

          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
            <span className="text-stone-500 text-[11px] block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Successfully Sent</span>
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-emerald-800">{metrics.sentCount}</span>
              <span className="text-[10px] text-emerald-700">({metrics.successRate}%)</span>
            </div>
          </div>

          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
            <span className="text-stone-500 text-[11px] block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Delivery Failed</span>
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-rose-700">{metrics.failedCount}</span>
              <span className="text-[10px] text-rose-600">requiring retry</span>
            </div>
          </div>

          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
            <span className="text-stone-500 text-[11px] block">Network Providers</span>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-stone-700">
              <span>TNM 4G/2G</span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span>Airtel MW</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by farmer name, phone (+265), SMS ID, or text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Filter Tabs (Interactive Segmented Control) */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl text-xs font-semibold shrink-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Status ({metrics.total})
              </button>
              <button
                onClick={() => setStatusFilter('sent')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'sent'
                    ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>Sent ({metrics.sentCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('failed')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'failed'
                    ? 'bg-white text-rose-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                <span>Failed ({metrics.failedCount})</span>
              </button>
            </div>
          </div>

          {/* Secondary Filter Controls */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-stone-600">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <span>Event Type:</span>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="py-1 px-2.5 rounded-lg border border-stone-200 bg-white text-stone-800 text-xs focus:outline-emerald-700 font-medium"
              >
                <option value="all">All Events</option>
                <option value="farmer_registered">Farmer Registration &amp; PIN</option>
                <option value="produce_listed">Produce Listed</option>
                <option value="order_received">Order Received</option>
                <option value="order_paid">Escrow Secured</option>
                <option value="transporter_assigned">Transporter Dispatched</option>
                <option value="delivery_confirmed">Delivery Confirmed</option>
                <option value="payment_released">Payout Released</option>
                <option value="broadcast_announcement">Advisory Broadcast</option>
              </select>
            </div>

            {farmers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>Filter by Farmer:</span>
                <select
                  value={selectedFarmerPhone}
                  onChange={(e) => setSelectedFarmerPhone(e.target.value)}
                  className="py-1 px-2.5 rounded-lg border border-stone-200 bg-white text-stone-800 text-xs focus:outline-emerald-700 font-medium max-w-[220px] truncate"
                >
                  <option value="all">All Farmers ({farmers.length})</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.phoneNumber}>
                      {f.fullName} ({f.farmerId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(searchTerm || statusFilter !== 'all' || eventTypeFilter !== 'all' || selectedFarmerPhone !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setEventTypeFilter('all');
                  setSelectedFarmerPhone('all');
                }}
                className="text-stone-500 hover:text-stone-800 underline ml-auto text-[11px]"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Historical List of SMS Notifications */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-800 text-sm">No SMS Notifications Found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' || eventTypeFilter !== 'all'
              ? 'No automated messages match your current filter criteria. Try adjusting or clearing your filters.'
              : `No SMS notifications have been dispatched yet for farmers in ${district} District.`}
          </p>
          {(searchTerm || statusFilter !== 'all' || eventTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setEventTypeFilter('all');
                setSelectedFarmerPhone('all');
              }}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span>
              Showing {filteredLogs.length} of {metrics.total} recorded SMS notifications
            </span>
            <span>Sorted newest first</span>
          </div>

          {filteredLogs.map((sms) => {
            const cleanPhone = (sms.recipientPhone || '').replace(/\s+/g, '');
            const matchingFarmer = farmerMapByPhone.get(cleanPhone);
            const isSent = sms.deliveryStatus === 'sent' || sms.deliveryStatus === 'delivered';
            const isFailed = sms.deliveryStatus === 'failed';
            const isPending = sms.deliveryStatus === 'pending';
            const deviceSmsUri = createDeviceSmsUri(sms.recipientPhone, sms.messageText);

            return (
              <div
                key={sms.id || sms.smsId}
                className={`bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all space-y-3 ${
                  isFailed
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Header Row: Recipient & Status / Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="space-y-1">
                    {/* Unboxed Metadata Line with separators */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono text-stone-500 text-[11px] font-semibold">
                        {sms.smsId}
                      </span>
                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <strong className="text-stone-900 font-bold text-sm">
                        {sms.recipientName}
                      </strong>
                      <span className="text-stone-600 font-mono text-xs font-bold">
                        {sms.recipientPhone}
                      </span>
                      {matchingFarmer?.farmerId && (
                        <>
                          <span aria-hidden="true" className="text-stone-300">·</span>
                          <span className="text-emerald-800 font-semibold text-[11px]">
                            {matchingFarmer.farmerId}
                          </span>
                        </>
                      )}
                      {matchingFarmer?.traditionalAuthority && (
                        <>
                          <span aria-hidden="true" className="text-stone-300">·</span>
                          <span className="text-stone-500 text-[11px]">
                            {matchingFarmer.traditionalAuthority}, Village {matchingFarmer.village}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Event & Language Kicker */}
                    <div className="flex items-center gap-2 text-[11px] text-stone-500">
                      <span className="font-medium text-stone-700">
                        {getEventLabel(sms.eventType)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{sms.messageLanguage === 'ch' ? 'Chichewa' : 'English'}</span>
                      {sms.carrierNetwork && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-stone-600 font-medium">{sms.carrierNetwork} Network</span>
                        </>
                      )}
                      {sms.relatedRecordNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-stone-500">Ref: {sms.relatedRecordNumber}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator & Exact Timestamp */}
                  <div className="sm:text-right shrink-0 space-y-1">
                    <div className="flex items-center sm:justify-end gap-1.5">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sent</span>
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Failed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-stone-500 font-mono">
                      <span>{formatFullTimestamp(sms.sentAt)}</span>
                      <span className="text-stone-400 ml-1.5">({formatRelativeTime(sms.sentAt)})</span>
                    </div>
                  </div>
                </div>

                {/* Message Body (Keypad LCD Monospace Style) */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-150 font-mono text-[11px] text-stone-800 leading-relaxed relative group">
                  <div className="whitespace-pre-wrap">{sms.messageText}</div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyText(sms.messageText, sms.smsId)}
                    className="absolute top-2.5 right-2.5 p-1 rounded-md bg-white border border-stone-200 text-stone-500 hover:text-stone-800 opacity-70 group-hover:opacity-100 transition-opacity"
                    title="Copy SMS text"
                  >
                    {copiedId === sms.smsId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Error Banner if Failed */}
                {isFailed && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold block">Delivery Error:</strong>
                        <span className="text-rose-800 text-[11px]">
                          {sms.failureReason || 'Cell tower timeout or subscriber unreachable. Signal failed.'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRetrySms(sms)}
                      disabled={retryingSmsId === sms.smsId}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 self-end sm:self-auto transition-colors disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${retryingSmsId === sms.smsId ? 'animate-spin' : ''}`} />
                      <span>{retryingSmsId === sms.smsId ? 'Retrying...' : 'Retry Dispatch'}</span>
                    </button>
                  </div>
                )}

                {/* Footer Actions: Send to Real Phone, Resend, Keypad Simulator, Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-stone-100 text-xs">
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5 flex-wrap">
                    <span>Recipient: <strong className="text-stone-700">{sms.recipientName}</strong></span>
                    {sms.verificationCode && (
                      <>
                        <span>·</span>
                        <span>PIN: <strong className="font-mono text-stone-700">{sms.verificationCode}</strong></span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* PRIMARY ACTION: SEND VIA MOBILE PHONE MESSAGING APP */}
                    <a
                      href={deviceSmsUri}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all active:scale-95"
                      title="Directly opens your mobile phone's Messages app pre-filled with this number and text ready to send over your SIM card"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Send via Phone SMS App</span>
                    </a>

                    {!isFailed && (
                      <button
                        onClick={() => handleRetrySms(sms)}
                        disabled={retryingSmsId === sms.smsId}
                        className="text-stone-600 hover:text-stone-900 font-semibold text-xs flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-stone-100 transition-colors"
                        title="Re-send copy of this SMS to the farmer"
                      >
                        <RotateCw className={`w-3 h-3 ${retryingSmsId === sms.smsId ? 'animate-spin' : ''}`} />
                        <span>Re-send</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedSmsForDetails(sms)}
                      className="text-emerald-800 hover:text-emerald-950 font-bold text-xs py-1.5 px-2 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: INSPECT SMS DETAILS & DISPATCH ACTIONS */}
      {selectedSmsForDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    SMS Dispatch Inspection
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Ref: {selectedSmsForDetails.smsId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSmsForDetails(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Recipient Farmer:</span>
                  <span className="font-bold text-stone-900">{selectedSmsForDetails.recipientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Mobile Phone:</span>
                  <span className="font-mono font-bold text-stone-900">{selectedSmsForDetails.recipientPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">District:</span>
                  <span className="font-semibold text-stone-800">{selectedSmsForDetails.district}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Delivery Status:</span>
                  <span
                    className={`font-bold uppercase tracking-wider text-[10px] ${
                      selectedSmsForDetails.deliveryStatus === 'failed'
                        ? 'text-rose-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {selectedSmsForDetails.deliveryStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Timestamp:</span>
                  <span className="font-mono text-stone-800">{formatFullTimestamp(selectedSmsForDetails.sentAt)}</span>
                </div>
                {selectedSmsForDetails.failureReason && (
                  <div className="flex flex-col pt-1 border-t border-rose-100">
                    <span className="text-rose-600 font-bold">Failure Diagnostics:</span>
                    <span className="text-rose-800 text-[11px]">{selectedSmsForDetails.failureReason}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-stone-500 text-[11px] font-semibold mb-1">
                  Full Dispatched Message Text ({selectedSmsForDetails.messageLanguage === 'ch' ? 'Chichewa' : 'English'}):
                </label>
                <div className="p-3 rounded-xl bg-stone-100 font-mono text-stone-800 text-xs leading-relaxed whitespace-pre-wrap select-all">
                  {selectedSmsForDetails.messageText}
                </div>
              </div>

              {/* Direct Handset Action in Details Modal */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>Send Directly from Mobile Handset</span>
                </span>
                <p className="text-[11px] text-emerald-900">
                  Tap below to launch this message instantly inside your phone&apos;s native SMS application:
                </p>
                <a
                  href={createDeviceSmsUri(selectedSmsForDetails.recipientPhone, selectedSmsForDetails.messageText)}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <SendHorizontal className="w-4 h-4" />
                  <span>Open in Phone Messages App (sms:)</span>
                </a>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
              <button
                onClick={() => setSelectedSmsForDetails(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const sms = selectedSmsForDetails;
                  setSelectedSmsForDetails(null);
                  handleRetrySms(sms);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Re-send Notification</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPOSE DIRECT ADVISORY SMS */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    Compose Farmer Advisory SMS
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Dispatch direct update to a farmer in {district} District
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowComposeModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendDirectSms} className="space-y-3.5 text-xs">
              {farmers.length > 0 && (
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Quick Pick Registered Farmer:
                  </label>
                  <select
                    onChange={(e) => handleSelectFarmerForCompose(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select a registered offline farmer --</option>
                    {farmers.map((f) => (
                      <option key={f.id} value={f.farmerId}>
                        {f.fullName} ({f.phoneNumber} · {f.farmerId} · T/A {f.traditionalAuthority})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Farmer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={composeRecipientName}
                    onChange={(e) => setComposeRecipientName(e.target.value)}
                    placeholder="e.g. Masten Banda"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Phone Number (+265) *
                  </label>
                  <input
                    type="text"
                    required
                    value={composeRecipientPhone}
                    onChange={(e) => setComposeRecipientPhone(e.target.value)}
                    placeholder="+265 888 123 456"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700 font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Language
                  </label>
                  <select
                    value={composeLang}
                    onChange={(e) => setComposeLang(e.target.value as 'ch' | 'en')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700"
                  >
                    <option value="ch">Chichewa (Official)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Category
                  </label>
                  <select
                    value={composeEventType}
                    onChange={(e) => setComposeEventType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700"
                  >
                    <option value="broadcast_announcement">Advisory Notice</option>
                    <option value="produce_listed">Market Price Alert</option>
                    <option value="order_received">Logistics Instruction</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-stone-700 font-bold">
                    SMS Message Text *
                  </label>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {composeMessage.length} / 160 chars (
                    {Math.ceil((composeMessage.length || 1) / 160)} SMS)
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  placeholder={
                    composeLang === 'ch'
                      ? 'MBERALINK: Zikomo mlimi, mawa kudzakhala msika wa mtedza ku Songani. Konzekerani kutumiza katundu wanu...'
                      : 'MBERALINK: Dear farmer, please prepare your grain bags for haulage pickup tomorrow morning...'
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700 font-mono leading-relaxed"
                />
              </div>

              {/* Handset option shortcut */}
              {composeRecipientPhone && composeMessage && (
                <div className="pt-1">
                  <a
                    href={createDeviceSmsUri(composeRecipientPhone, composeMessage)}
                    className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-stone-200"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Launch in Phone SMS App Immediately</span>
                  </a>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingDirect}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingDirect ? 'Transmitting...' : 'Dispatch SMS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TEST DISPATCH TO REAL PHYSICAL PHONE */}
      {showTestRealModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    Test SMS on Real Physical Phone
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Verify real-time delivery to physical Malawian handset
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTestRealModal(false);
                  setTestOutcome(null);
                }}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchTestToRealPhone} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  required
                  value={testRecipientName}
                  onChange={(e) => setTestRecipientName(e.target.value)}
                  placeholder="e.g. Peter Malikebu"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Real Mobile Phone Number (+265...) *
                </label>
                <input
                  type="text"
                  required
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="+265 999 036 912 or +265 888..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700 font-mono font-bold"
                />
                <span className="text-[11px] text-stone-500 mt-0.5 block">
                  Enter your physical SIM card number (TNM or Airtel Malawi) to receive the live test.
                </span>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Test SMS Message Content
                </label>
                <textarea
                  rows={3}
                  required
                  value={testMessageText}
                  onChange={(e) => setTestMessageText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-emerald-700 font-mono leading-relaxed"
                />
              </div>

              {/* Handset Native Link Shortcut */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>Instant Handset Messages App Dispatch</span>
                </span>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Clicking the button below instantly opens this exact number and text inside your physical smartphone&apos;s Messages app:
                </p>
                <a
                  href={createDeviceSmsUri(testPhoneNumber, testMessageText)}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <SendHorizontal className="w-4 h-4" />
                  <span>Open in My Real Phone Messages App (sms:)</span>
                </a>
              </div>

              {testOutcome && (
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1 font-mono">
                  <span className="font-bold text-stone-900 block">Dispatch Outcome:</span>
                  <div className="text-[11px] text-stone-700">Provider: {testOutcome.dispatchOutcome?.provider}</div>
                  <div className="text-[11px] text-stone-700">Status: {testOutcome.dispatchOutcome?.statusText}</div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowTestRealModal(false);
                    setTestOutcome(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isDispatchingTest}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isDispatchingTest ? 'Dispatching...' : 'Dispatch Live Gateway Test'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FIREBASE CLOUD MESSAGING (FCM) CONSOLE */}
      {showGatewayModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Radio className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    Firebase Cloud Messaging (FCM) Console
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Native push &amp; SMS-equivalent dispatch across Malawi powered by Google Firebase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGatewayModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FCM Status Card */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-900 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Provider: Firebase Cloud Messaging</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active &amp; Connected
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Mberalink uses Google Firebase Cloud Messaging to dispatch agricultural alerts, market updates, and transaction confirmations. No third-party SMS API keys or paid cellular aggregators required.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-white p-2 rounded-xl border border-amber-200">
                  <span className="text-stone-400 text-[10px] block font-sans">Firebase Project</span>
                  <span className="text-stone-800 font-bold">{gatewayStatusData?.projectId || 'chromatic-flame-t83d0'}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-amber-200">
                  <span className="text-stone-400 text-[10px] block font-sans">Messaging Sender ID</span>
                  <span className="text-stone-800 font-bold">{gatewayStatusData?.messagingSenderId || '1098287344957'}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-amber-200/60 text-[11px]">
                <span className="text-stone-600">Registered FCM Devices:</span>
                <span className="font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                  {gatewayStatusData?.activeDevicesCount ?? 1} devices active
                </span>
              </div>
            </div>

            {/* Device Registration Section */}
            <div className="space-y-3 border-t border-stone-100 pt-3 text-xs">
              <div className="space-y-1">
                <h4 className="font-bold text-stone-900">Device Push Notifications</h4>
                <p className="text-[11px] text-stone-500">
                  Register this browser or mobile device to receive live field dispatches and transaction alerts.
                </p>
              </div>

              {fcmRegisteredToken ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>This device is registered for FCM notifications!</span>
                  </div>
                  <div className="font-mono text-[10px] text-stone-600 truncate">
                    Token: {fcmRegisteredToken.slice(0, 36)}...
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleEnableFcmPush}
                  disabled={isRegisteringFcm}
                  className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{isRegisteringFcm ? 'Requesting Permission...' : 'Enable Push Notifications on this Device'}</span>
                </button>
              )}

              {/* FCM Test Broadcast */}
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">Dispatch Live FCM Test Broadcast</span>
                  <span className="text-[10px] text-stone-500 font-mono">Topic: all_farmers</span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Broadcasts a real-time test notification across the nationwide topic to all active devices.
                </p>
                <button
                  type="button"
                  onClick={handleSendFcmTestBroadcast}
                  disabled={isSendingFcmTest}
                  className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-stone-600" />
                  <span>{isSendingFcmTest ? 'Broadcasting via FCM...' : 'Send Live Test Broadcast (FCM Topic)'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowGatewayModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
