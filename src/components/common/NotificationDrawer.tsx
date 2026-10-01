import React from 'react';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { NotificationItem } from '../../types/index.ts';
import {
  X,
  Bell,
  CheckCircle,
  Truck,
  ShoppingCart,
  Coins,
  Info,
  Clock,
  CheckCheck,
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
  const { notifications, markAsRead } = useRealtime();

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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 text-base">Notifications</h2>
              <p className="text-xs text-stone-500">Live operational & financial updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <Bell className="w-10 h-10 mx-auto stroke-1 text-stone-300 mb-2" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-stone-400 mt-1">
                New order, delivery, and payment alerts will show here in real time.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) markAsRead(n.id);
                  if (n.relatedOrderId && onSelectOrder) {
                    onSelectOrder(n.relatedOrderId);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-white border-stone-200 hover:bg-stone-50'
                    : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-stone-200 shrink-0 shadow-2xs">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-stone-900 truncate">{n.title}</h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{n.message}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                      {n.relatedOrderId && (
                        <span className="text-emerald-700 font-semibold hover:underline">
                          View Order #{n.relatedOrderId} &rarr;
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-stone-50 text-center">
            <button
              onClick={() => {
                notifications.forEach((n) => {
                  if (!n.isRead) markAsRead(n.id);
                });
              }}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 inline-flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>Mark all as read</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
