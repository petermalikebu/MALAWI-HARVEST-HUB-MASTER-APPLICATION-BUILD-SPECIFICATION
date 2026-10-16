import React, { useState, useEffect } from 'react';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
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
} from 'lucide-react';

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
  const { notifications, markAsRead, deleteNotification } = useRealtime();
  const { t, language } = useLanguage();
  const [now, setNow] = useState<number>(Date.now());

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

        {/* Info Banner on 30s auto-delete rule */}
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/60 flex items-center gap-2 text-[11px] text-amber-900">
          <Timer className="w-4 h-4 text-amber-700 shrink-0" />
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
