import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.tsx';
import { NotificationItem } from '../types/index.ts';

type EventListener = (data: any) => void;

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: { type: string; data: any; timestamp: string } | null;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
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

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?userUid=${currentUser.uid}`);
      if (res.ok) {
        const list: NotificationItem[] = await res.json();
        setNotifications(list);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
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

            // If notification arrived, refresh
            if (parsed.type === 'notification_created') {
              fetchNotifications();
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
  }, [currentUser, listeners, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        lastEvent,
        notifications,
        unreadCount,
        markAsRead,
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
