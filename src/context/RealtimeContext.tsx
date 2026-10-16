import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.tsx';
import { NotificationItem } from '../types/index.ts';
import { safeParseJson } from '../lib/api.ts';

type EventListener = (data: any) => void;

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: { type: string; data: any; timestamp: string } | null;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  subscribe: (eventType: string, listener: EventListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any; timestamp: string } | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [listeners, setListeners] = useState<Map<string, Set<EventListener>>>(new Map());
  const deleteTimersRef = React.useRef<Map<number, any>>(new Map());

  const deleteNotification = useCallback(async (id: number) => {
    // Clear any timer
    if (deleteTimersRef.current.has(id)) {
      clearTimeout(deleteTimersRef.current.get(id));
      deleteTimersRef.current.delete(id);
    }
    // Optimistically remove from state
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to permanently delete notification:', err);
    }
  }, []);

  // Schedule auto-deletion 30 seconds after notification was marked as read
  const scheduleAutoDeletion = useCallback((id: number, readAtStr?: string) => {
    if (deleteTimersRef.current.has(id)) return;

    const readTime = readAtStr ? new Date(readAtStr).getTime() : Date.now();
    const elapsed = Date.now() - readTime;
    const remaining = Math.max(0, 30000 - elapsed);

    const timer = setTimeout(() => {
      deleteNotification(id);
    }, remaining);

    deleteTimersRef.current.set(id, timer);
  }, [deleteNotification]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?userUid=${currentUser.uid}`);
      if (res.ok) {
        const list: NotificationItem[] = await safeParseJson(res, []);
        setNotifications(list);

        // Schedule auto-delete for any already read notifications
        list.forEach((n) => {
          if (n.isRead && n.readAt) {
            scheduleAutoDeletion(n.id, n.readAt);
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [currentUser, scheduleAutoDeletion]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    const nowIso = new Date().toISOString();
    // Optimistically update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: nowIso } : n))
    );
    // Schedule 30-second deletion countdown
    scheduleAutoDeletion(id, nowIso);

    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const subscribe = useCallback((eventType: string, listener: EventListener) => {
    setListeners((prev) => {
      const next = new Map(prev);
      if (!next.has(eventType)) {
        next.set(eventType, new Set());
      }
      next.get(eventType)!.add(listener);
      return next;
    });

    return () => {
      setListeners((prev) => {
        const next = new Map(prev);
        const set = next.get(eventType);
        if (set) {
          set.delete(listener);
          if (set.size === 0) next.delete(eventType);
        }
        return next;
      });
    };
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          if (currentUser) {
            ws?.send(
              JSON.stringify({
                type: 'auth',
                uid: currentUser.uid,
                role: currentUser.role,
              })
            );
          }
        };

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            setLastEvent(parsed);

            // Dispatch to registered event listeners
            if (parsed.type) {
              const registered = listeners.get(parsed.type);
              if (registered) {
                registered.forEach((fn) => fn(parsed.data));
              }
              // Also dispatch to wildcard '*' listeners
              const wildcards = listeners.get('*');
              if (wildcards) {
                wildcards.forEach((fn) => fn(parsed));
              }
            }

            // If notification arrived or modified, refresh or handle
            if (parsed.type === 'notification_created') {
              fetchNotifications();
            } else if (parsed.type === 'notification_deleted' && parsed.data?.id) {
              setNotifications((prev) => prev.filter((n) => n.id !== parsed.data.id));
            } else if (parsed.type === 'notification_read' && parsed.data?.id) {
              setNotifications((prev) =>
                prev.map((n) => (n.id === parsed.data.id ? { ...n, isRead: true, readAt: parsed.data.readAt } : n))
              );
              scheduleAutoDeletion(parsed.data.id, parsed.data.readAt);
            }
          } catch (e) {
            // ignore
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [currentUser, listeners, fetchNotifications, scheduleAutoDeletion]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        lastEvent,
        notifications,
        unreadCount,
        markAsRead,
        deleteNotification,
        fetchNotifications,
        subscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within a RealtimeProvider');
  return context;
};
