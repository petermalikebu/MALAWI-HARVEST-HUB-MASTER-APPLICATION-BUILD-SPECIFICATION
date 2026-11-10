import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { DirectMessage, DirectMessageRelationship, MessageParticipantRole } from '../../types/index.ts';
import { safeParseResponse } from '../../lib/api.ts';
import {
  X,
  Send,
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
  Truck,
  Sprout,
  ShoppingCart,
  MessageSquare,
  Lock,
} from 'lucide-react';

interface DirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderNumber: string;
  recipientUid: string;
  recipientName: string;
  recipientRole: MessageParticipantRole;
  relationship: DirectMessageRelationship;
  commodityName?: string;
}

export const DirectChatModal: React.FC<DirectChatModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  recipientUid,
  recipientName,
  recipientRole,
  relationship,
  commodityName,
}) => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/order/${orderId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      setError(null);
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time listener for incoming messages
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribe('DIRECT_MESSAGE_SENT', (newMsg: DirectMessage) => {
      if (newMsg.orderId === orderId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id || m.messageId === newMsg.messageId)) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
    });
    return () => unsubscribe();
  }, [isOpen, orderId, subscribe]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !currentUser) return;

    if (currentUser.status === 'suspended') {
      setError('Your account is currently suspended by administration. Direct messaging is disabled.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderNumber,
          senderUid: currentUser.uid,
          senderName: currentUser.fullName,
          senderRole: currentUser.role,
          recipientUid,
          recipientName,
          recipientRole,
          relationship,
          messageText: text,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok && parsed.data?.message) {
        setInputText('');
        setMessages((prev) => [...prev, parsed.data.message]);
      } else {
        setError(parsed.error || 'Failed to send message');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setSending(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'transporter':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'farmer':
        return <Sprout className="w-4 h-4 text-emerald-600" />;
      case 'buyer':
        return <ShoppingCart className="w-4 h-4 text-amber-600" />;
      default:
        return <User className="w-4 h-4 text-stone-600" />;
    }
  };

  const getRelationshipBadge = () => {
    switch (relationship) {
      case 'buyer_transporter':
        return 'Buyer ↔ Transporter Direct Haulage Channel';
      case 'farmer_buyer':
        return 'Farmer ↔ Buyer Direct Trade Channel';
      case 'farmer_transporter':
        return 'Farmer ↔ Transporter Farm-Gate Logistics Channel';
      default:
        return 'Direct Protected Channel';
    }
  };

  // Quick chips for faster communication on mobile & desktop
  const getQuickChips = () => {
    switch (relationship) {
      case 'buyer_transporter':
        return [
          'What is your truck arrival time at the collection depot?',
          'Please share your vehicle registration and driver contact.',
          'Cargo has arrived safely and is ready for offloading.',
          'Are there any road delays or weather issues on the route?',
        ];
      case 'farmer_buyer':
        return [
          'Bags are verified, weighed, and ready at the farm gate.',
          'Commodity moisture content and grading certificate is ready.',
          'Please confirm when transport will be arriving for collection.',
          'Payment is safely held in Mbewalink Escrow.',
        ];
      case 'farmer_transporter':
        return [
          'Farm gate directions and collection point confirmed.',
          'Loading labor crew is ready at the farm to load bags.',
          'The truck has arrived safely at the farm collection point.',
          'Access road is cleared and accessible for heavy trucks.',
        ];
      default:
        return [
          'Hello, checking in on the order status.',
          'Please let me know if you need any additional details.',
        ];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-[650px] max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-white">
              {getRoleIcon(recipientRole)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">{recipientName}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-800 text-stone-300 border border-stone-700">
                  {recipientRole}
                </span>
              </div>
              <div className="text-[11px] text-stone-400 flex items-center gap-2">
                <span>Order #{orderNumber}</span>
                {commodityName && <span>&bull; {commodityName}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Notice Bar */}
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs">
              <strong className="text-emerald-900">{getRelationshipBadge()}</strong> &bull; Direct messages are monitored and audited by Administrators to ensure fair trade and cargo security.
            </span>
          </div>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs">
              <Clock className="w-6 h-6 animate-spin mb-2 text-stone-400" />
              <span>Loading conversation history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
              <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mb-3 shadow-xs">
                <MessageSquare className="w-6 h-6 text-stone-400" />
              </div>
              <h4 className="font-bold text-stone-800 text-sm">Start Direct Communication</h4>
              <p className="text-xs text-stone-500 max-w-sm mt-1">
                Communicate directly regarding Order #{orderNumber}. Coordinates, vehicle arrival, quality verification, and collection updates will be securely recorded.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isSender = m.senderUid === currentUser?.uid;
              return (
                <div
                  key={m.id || m.messageId}
                  className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-stone-400 font-medium">
                    <span>{isSender ? 'You' : m.senderName}</span>
                    <span className="capitalize text-stone-400 font-mono">({m.senderRole})</span>
                    <span>&bull;</span>
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[82%] sm:max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs shadow-2xs leading-relaxed ${
                      isSender
                        ? 'bg-emerald-800 text-white rounded-tr-none'
                        : 'bg-white text-stone-800 border border-stone-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.messageText}</p>

                    {m.flaggedForReview && (
                      <div className="mt-1.5 pt-1.5 border-t border-amber-300/30 flex items-center gap-1 text-[10px] text-amber-200 font-semibold">
                        <AlertTriangle className="w-3 h-3 text-amber-300" />
                        <span>Flagged for administrative compliance review</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-white border-t border-stone-100 overflow-x-auto whitespace-nowrap flex items-center gap-1.5 no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">Quick:</span>
          {getQuickChips().map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(chip)}
              disabled={sending}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200/60 shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Error notification */}
        {error && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${recipientName} (${recipientRole})...`}
            disabled={sending || currentUser?.status === 'suspended'}
            className="flex-1 px-3 py-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white focus:outline-emerald-700 transition-all"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim() || currentUser?.status === 'suspended'}
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
