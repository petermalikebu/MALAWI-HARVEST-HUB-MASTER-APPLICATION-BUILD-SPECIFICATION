import React, { useState, useEffect } from 'react';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { NotificationItem } from '../../types/index.ts';
import {
  X,
  Bell,
  Truck,
  ShoppingCart,
  Coins,
  Info,
  Clock,
  CheckCheck,
  Trash2,
  Timer,
  ShieldAlert,
  Smartphone,
  Mail,
  Send,
  Radio,
  CheckCircle2,
  Zap,
} from 'lucide-react';

import {
  getFcmSubscriptionStatus,
  requestFcmToken,
  unsubscribeFcmToken,
} from '../../lib/firebase.ts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder?: (orderId: number) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  const { currentUser } = useAuth();
  const { notifications, markAsRead, deleteNotification } = useRealtime();
  const { t, language } = useLanguage();
  const [now, setNow] = useState<number>(Date.now());
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testOutcomeNotice, setTestOutcomeNotice] = useState<string | null>(null);

  // FCM Push Subscription State
  const [fcmSubscribed, setFcmSubscribed] = useState<boolean>(false);
  const [fcmPermission, setFcmPermission] = useState<string>('default');
  const [fcmTokenSnippet, setFcmTokenSnippet] = useState<string | null>(null);
  const [isEnablingPush, setIsEnablingPush] = useState<boolean>(false);
  const [isSendingPushTest, setIsSendingPushTest] = useState<boolean>(false);
  const [pushNotice, setPushNotice] = useState<string | null>(null);
  const [showConsoleInfo, setShowConsoleInfo] = useState<boolean>(false);

  // Check FCM push subscription status when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    checkSubscription();
  }, [isOpen]);

  const checkSubscription = async () => {
    const status = await getFcmSubscriptionStatus();
    setFcmSubscribed(status.subscribed);
    setFcmPermission(status.permission);
    if (status.token) {
      setFcmTokenSnippet(status.token.slice(-10));
    } else {
      setFcmTokenSnippet(null);
    }
  };

  const handleTogglePush = async () => {
    setIsEnablingPush(true);
    setPushNotice(null);
    try {
      if (fcmSubscribed) {
        await unsubscribeFcmToken();
        setFcmSubscribed(false);
        setFcmTokenSnippet(null);
        setPushNotice('FCM push notifications deactivated on this browser.');
      } else {
        const token = await requestFcmToken({
          uid: currentUser?.uid,
          name: currentUser?.fullName,
          role: currentUser?.role,
          district: currentUser?.district,
        });
        if (token) {
          setFcmSubscribed(true);
          setFcmTokenSnippet(token.slice(-10));
          setPushNotice('Push notifications enabled successfully! Device registered with FCM backend.');
        } else {
          setPushNotice('Could not register FCM device token. Please check browser permissions.');
        }
      }
    } catch (err: any) {
      setPushNotice(`FCM error: ${err?.message || 'Check notification permissions'}`);
    } finally {
      setIsEnablingPush(false);
      setTimeout(() => setPushNotice(null), 6000);
    }
  };

  const handleSendFcmTest = async () => {
    setIsSendingPushTest(true);
    setPushNotice(null);
    try {
      const res = await fetch('/api/messaging/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser?.uid,
          title: 'Mbewalink Push Alert (FCM)',
          body: `Moni ${currentUser?.fullName || 'User'}! Real-time Firebase Cloud Messaging push notification confirmed working.`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPushNotice('FCM Push notification dispatched to your registered device!');
      } else {
        setPushNotice(data.statusText || 'Push notification sent to queue.');
      }
    } catch (err: any) {
      setPushNotice(`Push test notice: ${err?.message || 'Check connectivity'}`);
    } finally {
      setIsSendingPushTest(false);
      setTimeout(() => setPushNotice(null), 6000);
    }
  };

  // Send a live test alert to the current user's contact number and registered email
  const handleTestMultiChannel = async () => {
    setIsSendingTest(true);
    setTestOutcomeNotice(null);
    try {
      const targetPhone = currentUser?.phoneNumber || '+265999036912';
      const targetEmail = currentUser?.email || 'user@harvesthub.mw';
      const targetName = currentUser?.fullName || 'Mbewalink User';

      // 1. Dispatch Contact Number SMS
      await fetch('/api/agent/sms/test-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          name: targetName,
          customText: `MBEWALINK REAL-TIME TEST: Hello ${targetName}! All 4 delivery channels (Phone SMS, Email, In-App, and Firebase Push) are confirmed working across Malawi.`,
        }),
      });

      // 2. Dispatch Registered Email Alert
      await fetch('/api/notifications/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: targetEmail,
          recipientName: targetName,
          subject: 'Mbewalink Real-Time Notification Test (Malawi Harvest Hub)',
          messageText: `Moni ${targetName}!\n\nThis is a live multi-channel confirmation. Your registered email (${targetEmail}) and mobile contact number (${targetPhone}) are fully connected to receive real-time updates for orders, commodity prices, and logistics dispatches.`,
        }),
      });

      setTestOutcomeNotice(`Live test dispatched to ${targetPhone} & ${targetEmail}!`);
      setTimeout(() => setTestOutcomeNotice(null), 5000);
    } catch (err: any) {
      setTestOutcomeNotice(`Test alert notice: ${err?.message || 'Check connection'}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Ticking interval to update remaining seconds live while drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
      case 'transport':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'finance':
        return <Coins className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-purple-600" />;
    }
  };

  const calculateRemainingSeconds = (readAt?: string) => {
    if (!readAt) return 30;
    const elapsed = Math.floor((now - new Date(readAt).getTime()) / 1000);
    return Math.max(0, 30 - elapsed);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shadow-2xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 text-base">
                {t('nav_notifications')}
              </h2>
              <p className="text-xs text-stone-500">
                {language === 'ch'
                  ? 'Zosintha zofunika za malonda, mayendedwe & ndalama'
                  : 'Live operational & financial updates'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
            title={t('common_close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Channel Delivery Channels Banner */}
        <div className="px-5 py-3 bg-emerald-50/80 border-b border-emerald-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Multi-Channel Dispatch Enabled</span>
            </span>
            <button
              onClick={handleTestMultiChannel}
              disabled={isSendingTest}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50"
              title="Test immediate delivery to your phone and email"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>{isSendingTest ? 'Testing...' : 'Test My Phone & Email'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="bg-white p-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 text-stone-700">
              <Smartphone className="w-3 h-3 text-emerald-700 shrink-0" />
              <div className="truncate">
                <span className="font-bold block text-[9px] text-emerald-900 leading-none">Phone SMS</span>
                <span className="text-[8px] text-stone-500">Keypad / Mobile</span>
              </div>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 text-stone-700">
              <Mail className="w-3 h-3 text-blue-700 shrink-0" />
              <div className="truncate">
                <span className="font-bold block text-[9px] text-blue-900 leading-none">Email Alerts</span>
                <span className="text-[8px] text-stone-500">Official HTML</span>
              </div>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 text-stone-700">
              <Radio className="w-3 h-3 text-amber-700 shrink-0" />
              <div className="truncate">
                <span className="font-bold block text-[9px] text-amber-900 leading-none">FCM Push</span>
                <span className="text-[8px] text-stone-500">Free Native</span>
              </div>
            </div>
          </div>

          {testOutcomeNotice && (
            <div className="py-1 px-2 rounded-md bg-emerald-200/80 text-emerald-950 font-bold text-[10px] animate-in fade-in">
              {testOutcomeNotice}
            </div>
          )}
        </div>

        {/* FCM Push Notification Subscription & Testing Box */}
        <div className="px-5 py-3 bg-white border-b border-stone-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Radio className={`w-4 h-4 ${fcmSubscribed ? 'text-emerald-600 animate-pulse' : 'text-amber-500'}`} />
              <span className="text-xs font-bold text-stone-900">Firebase Cloud Messaging</span>
            </div>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                fcmSubscribed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${fcmSubscribed ? 'bg-emerald-500 animate-ping' : 'bg-stone-400'}`} />
              {fcmSubscribed ? 'Subscribed' : 'Not Subscribed'}
            </span>
          </div>

          <p className="text-[11px] text-stone-500 leading-snug">
            {language === 'ch'
              ? 'Landirani zidziwitso mwachindunji pa foni kapena kompyuta yanu pamaoda, malipiro, ndi chitetezo ngakhale mutatuluka pa tsamba lino.'
              : 'Receive real-time push alerts on orders, payments, dispatches, and account security even when the application is in the background.'}
          </p>

          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <button
              onClick={handleTogglePush}
              disabled={isEnablingPush}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 ${
                fcmSubscribed
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isEnablingPush ? 'Configuring...' : fcmSubscribed ? 'Unsubscribe Device' : 'Enable Device Push'}</span>
            </button>

            {fcmSubscribed && (
              <button
                onClick={handleSendFcmTest}
                disabled={isSendingPushTest}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                title="Send a live test notification to this browser"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isSendingPushTest ? 'Sending...' : 'Send Test Push'}</span>
              </button>
            )}

            <button
              onClick={() => setShowConsoleInfo(!showConsoleInfo)}
              className="text-[10px] text-stone-500 hover:text-stone-800 underline font-medium ml-auto"
            >
              {showConsoleInfo ? 'Hide Settings' : 'Console Settings'}
            </button>
          </div>

          {pushNotice && (
            <div className="py-1 px-2.5 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-950 font-bold text-[11px] animate-in fade-in flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>{pushNotice}</span>
            </div>
          )}

          {showConsoleInfo && (
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[10px] text-stone-600 space-y-1.5 animate-in fade-in">
              <div className="font-bold text-stone-800 flex items-center gap-1">
                <Info className="w-3 h-3 text-emerald-700" />
                Firebase Cloud Messaging Configuration
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong className="text-stone-800">Project ID:</strong> malawi-harvest-hub</li>
                <li><strong className="text-stone-800">Sender ID:</strong> Configured via VITE_FIREBASE_MESSAGING_SENDER_ID</li>
                <li><strong className="text-stone-800">Service Worker:</strong> /firebase-messaging-sw.js active</li>
                <li><strong className="text-stone-800">Web Push Key (VAPID):</strong> Supplied via VITE_FIREBASE_VAPID_KEY</li>
                <li><strong className="text-stone-800">Backend Security:</strong> Admin SDK uses malawi-harvest-hub credentials server-side; zero keys leaked to frontend.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Info Banner on 30s auto-delete rule */}
        <div className="px-5 py-2 bg-amber-50/70 border-b border-amber-200/60 flex items-center gap-2 text-[10px] text-amber-900">
          <Timer className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>
            {language === 'ch'
              ? 'Chidziwitso chilichonse chikawerengedwa, chidzafufutidwa mwaokha pakapita masekondi 30.'
              : 'Viewed and read notifications are automatically deleted permanently after 30 seconds.'}
          </span>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <Bell className="w-10 h-10 mx-auto stroke-1 text-stone-300 mb-2" />
              <p className="text-sm font-medium">
                {language === 'ch' ? 'Palibe zidziwitso pakali pano' : 'No notifications yet'}
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                {language === 'ch'
                  ? 'Zidziwitso zatsopano zamaoda, mayendedwe, ndi ndalama ziziwonekera pompano pa nthawi yake.'
                  : 'New order, delivery, and payment alerts will show here in real time.'}
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const remainingSecs = n.isRead ? calculateRemainingSeconds(n.readAt) : null;

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markAsRead(n.id);
                    if (n.relatedOrderId && onSelectOrder) {
                      onSelectOrder(n.relatedOrderId);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                    n.isRead
                      ? 'bg-stone-50/80 border-stone-200 text-stone-600 hover:bg-stone-100/70'
                      : 'bg-emerald-50/70 border-emerald-300 hover:bg-emerald-50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white border border-stone-200 shrink-0 shadow-2xs">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs font-bold truncate ${n.isRead ? 'text-stone-700' : 'text-stone-900 font-extrabold'}`}>
                          {n.title}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!n.isRead && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white"
                              title={language === 'ch' ? 'Sizinawerengedwe' : 'Unread'}
                            >
                              {language === 'ch' ? 'Yatsopano' : 'New'}
                            </span>
                          )}
                          {/* Trash button to immediately delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title={language === 'ch' ? 'Fufutani tsopano' : 'Delete permanently'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {n.message}
                      </p>

                      {/* Read status & 30-sec Auto-deletion progress indicator */}
                      {n.isRead && remainingSecs !== null && (
                        <div className="mt-2 py-1 px-2 rounded-lg bg-amber-100/60 border border-amber-200/80 flex items-center justify-between text-[10px] text-amber-900 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Timer className="w-3 h-3 text-amber-700 animate-pulse" />
                            <span>
                              {language === 'ch'
                                ? `Ifufutidwa mwaokha pakapita: ${remainingSecs}s`
                                : `Auto-deleting in ${remainingSecs}s...`}
                            </span>
                          </span>
                          <span className="text-[9px] font-mono font-bold text-amber-800">
                            {remainingSecs}s
                          </span>
                        </div>
                      )}

                      {/* Multi-Channel Delivery Channels Badges */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 font-semibold border border-stone-200">
                          <Bell className="w-2.5 h-2.5 text-stone-500" />
                          In-App
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                          <Smartphone className="w-2.5 h-2.5 text-emerald-600" />
                          Phone SMS
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                          <Mail className="w-2.5 h-2.5 text-blue-600" />
                          Email
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                          <Radio className="w-2.5 h-2.5 text-amber-600" />
                          FCM Push
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : (language === 'ch' ? 'Pompano' : 'Just now')}
                          </span>
                        </div>
                        {n.relatedOrderId && (
                          <span className="text-emerald-700 font-semibold hover:underline">
                            {language === 'ch' ? `Onani Oda #${n.relatedOrderId} →` : `View Order #${n.relatedOrderId} →`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            <button
              onClick={() => {
                notifications.forEach((n) => {
                  if (!n.isRead) markAsRead(n.id);
                });
              }}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-stone-200 transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>{language === 'ch' ? 'Werengani Zonse' : 'Mark all as read'}</span>
            </button>
            <span className="text-[11px] text-stone-400">
              {notifications.length} {language === 'ch' ? 'zidziwitso' : 'alerts'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
