import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.tsx';
import { useRealtime } from './RealtimeContext.tsx';
import { DirectMessage, ChatConversation, MessageParticipantRole, DirectMessageRelationship } from '../types/index.ts';
import { safeParseJson } from '../lib/api.ts';

export interface ChatPeerInfo {
  uid: string;
  name: string;
  role?: MessageParticipantRole;
  district?: string;
  phone?: string;
  photoUrl?: string;
}

export interface ChatOrderContext {
  orderId?: number;
  orderNumber?: string;
  commodityName?: string;
}

interface ChatContextType {
  conversations: ChatConversation[];
  activePeer: ChatPeerInfo | null;
  activeContext: ChatOrderContext | null;
  messages: DirectMessage[];
  totalUnreadCount: number;
  isChatOpen: boolean;
  loadingMessages: boolean;
  sendingMessage: boolean;
  openChat: (peer: ChatPeerInfo, context?: ChatOrderContext) => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (text: string) => Promise<boolean>;
  markAsRead: (peerUid: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  selectConversation: (conv: ChatConversation) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Web Audio API notification chime
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Audio autostop or blocked by browser policy
  }
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activePeer, setActivePeer] = useState<ChatPeerInfo | null>(null);
  const [activeContext, setActiveContext] = useState<ChatOrderContext | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Keep ref of activePeer to avoid stale closures in realtime handlers
  const activePeerRef = useRef<ChatPeerInfo | null>(null);
  activePeerRef.current = activePeer;

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Fetch all user conversations
  const refreshConversations = useCallback(async () => {
    if (!currentUser?.uid) return;
    try {
      const res = await fetch(`/api/messages/conversations/${encodeURIComponent(currentUser.uid)}`);
      if (res.ok) {
        const data = await safeParseJson(res, []);
        if (Array.isArray(data)) {
          setConversations(data);
        }
      }
    } catch (err) {
      console.warn('[FCB Chat] Failed to fetch conversations:', err);
    }
  }, [currentUser?.uid]);

  // Load thread messages between currentUser and activePeer
  const loadThreadMessages = useCallback(
    async (peerUid: string, orderId?: number) => {
      if (!currentUser?.uid || !peerUid) return;
      setLoadingMessages(true);
      try {
        const orderParam = orderId && orderId > 0 ? `&orderId=${orderId}` : '';
        const res = await fetch(
          `/api/messages/conversation?user1=${encodeURIComponent(currentUser.uid)}&user2=${encodeURIComponent(
            peerUid
          )}${orderParam}`
        );
        if (res.ok) {
          const thread: DirectMessage[] = await safeParseJson(res, []);
          setMessages(thread);
        }
      } catch (err) {
        console.warn('[FCB Chat] Failed to fetch thread messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [currentUser?.uid]
  );

  // Mark all messages from a peer as read
  const markAsRead = useCallback(
    async (peerUid: string) => {
      if (!currentUser?.uid || !peerUid) return;
      try {
        await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userUid: currentUser.uid, peerUid }),
        });
        // Optimistically zero unread count
        setConversations((prev) =>
          prev.map((c) => (c.peerUid === peerUid ? { ...c, unreadCount: 0 } : c))
        );
      } catch (err) {
        console.warn('[FCB Chat] Failed to mark messages read:', err);
      }
    },
    [currentUser?.uid]
  );

  // Open chat with a specific user
  const openChat = useCallback(
    (peer: ChatPeerInfo, context?: ChatOrderContext) => {
      if (!peer || !peer.uid) {
        setIsChatOpen(true);
        return;
      }
      setActivePeer(peer);
      setActiveContext(context || null);
      setIsChatOpen(true);
      loadThreadMessages(peer.uid, context?.orderId);
      markAsRead(peer.uid);
    },
    [loadThreadMessages, markAsRead]
  );

  const selectConversation = useCallback(
    (conv: ChatConversation) => {
      openChat(
        {
          uid: conv.peerUid,
          name: conv.peerName,
          role: conv.peerRole,
          district: conv.peerDistrict,
          phone: conv.peerPhone,
          photoUrl: conv.peerPhotoUrl,
        },
        conv.orderId
          ? {
              orderId: conv.orderId,
              orderNumber: conv.orderNumber,
            }
          : undefined
      );
    },
    [openChat]
  );

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  // Send a message to activePeer
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      if (!currentUser?.uid || !activePeer?.uid || !text.trim()) return false;
      setSendingMessage(true);

      const optimisticMsg: DirectMessage = {
        id: Date.now(),
        messageId: `MSG-OPT-${Date.now()}`,
        orderId: activeContext?.orderId || 0,
        orderNumber: activeContext?.orderNumber || 'DIRECT-P2P',
        senderUid: currentUser.uid,
        senderName: currentUser.fullName || 'Mbewalink User',
        senderRole: (currentUser.role as MessageParticipantRole) || 'farmer',
        recipientUid: activePeer.uid,
        recipientName: activePeer.name,
        recipientRole: activePeer.role || 'buyer',
        relationship: 'peer_to_peer',
        messageText: text.trim(),
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: activeContext?.orderId || 0,
            orderNumber: activeContext?.orderNumber || 'DIRECT-P2P',
            senderUid: currentUser.uid,
            senderName: currentUser.fullName || 'Mbewalink User',
            senderRole: currentUser.role || 'farmer',
            recipientUid: activePeer.uid,
            recipientName: activePeer.name,
            recipientRole: activePeer.role || 'buyer',
            relationship: 'peer_to_peer',
            messageText: text.trim(),
          }),
        });

        if (res.ok) {
          const sent = await res.json();
          // Replace optimistic message with server message
          setMessages((prev) =>
            prev.map((m) => (m.messageId === optimisticMsg.messageId ? sent : m))
          );
          refreshConversations();
          return true;
        } else {
          console.warn('[FCB Chat] Failed to send message:', res.statusText);
          return false;
        }
      } catch (err) {
        console.error('[FCB Chat] Error sending message:', err);
        return false;
      } finally {
        setSendingMessage(false);
      }
    },
    [currentUser, activePeer, activeContext, refreshConversations]
  );

  // Initial load
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Real-time WebSocket subscriber
  useEffect(() => {
    const unsubMsg = subscribe('DIRECT_MESSAGE_SENT', (newMsg: DirectMessage) => {
      if (!currentUser?.uid) return;

      const isForMe = newMsg.recipientUid === currentUser.uid;
      const isFromMe = newMsg.senderUid === currentUser.uid;

      if (!isForMe && !isFromMe) return;

      // Update active thread if viewing this peer
      const currentPeer = activePeerRef.current;
      if (
        currentPeer &&
        (newMsg.senderUid === currentPeer.uid || newMsg.recipientUid === currentPeer.uid)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id || m.messageId === newMsg.messageId)) {
            return prev;
          }
          return [...prev, newMsg];
        });

        if (isForMe) {
          markAsRead(currentPeer.uid);
        }
      }

      // If message is incoming for me and not from active conversation, play notification chime
      if (isForMe && (!currentPeer || currentPeer.uid !== newMsg.senderUid)) {
        playNotificationChime();
      }

      // Update conversation list
      refreshConversations();
    });

    const unsubRead = subscribe('MESSAGES_READ', (payload: { userUid: string; peerUid: string }) => {
      if (!currentUser?.uid) return;
      if (payload.userUid === currentUser.uid) {
        setConversations((prev) =>
          prev.map((c) => (c.peerUid === payload.peerUid ? { ...c, unreadCount: 0 } : c))
        );
      }
      if (payload.peerUid === currentUser.uid) {
        // Peer has read my sent messages
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    });

    return () => {
      unsubMsg();
      unsubRead();
    };
  }, [currentUser?.uid, subscribe, markAsRead, refreshConversations]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activePeer,
        activeContext,
        messages,
        totalUnreadCount,
        isChatOpen,
        loadingMessages,
        sendingMessage,
        openChat,
        closeChat,
        toggleChat,
        sendMessage,
        markAsRead,
        refreshConversations,
        selectConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    return {
      conversations: [],
      activePeer: null,
      activeContext: null,
      messages: [],
      totalUnreadCount: 0,
      isChatOpen: false,
      loadingMessages: false,
      sendingMessage: false,
      openChat: () => {},
      closeChat: () => {},
      toggleChat: () => {},
      sendMessage: async () => false,
      markAsRead: async () => {},
      refreshConversations: async () => {},
      selectConversation: () => {},
    };
  }
  return context;
};
