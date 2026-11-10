import React, { useState, useEffect, useRef } from 'react';
import { useChat, ChatPeerInfo } from '../../context/ChatContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { MessageParticipantRole } from '../../types/index.ts';
import {
  MessageSquare,
  X,
  Send,
  Search,
  ShieldCheck,
  User,
  Users,
  Clock,
  Check,
  CheckCheck,
  Phone,
  MapPin,
  Minimize2,
  Maximize2,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  Truck,
  Sprout,
  Shield,
  BadgeCheck,
  ArrowRight,
} from 'lucide-react';
import { safeParseJson } from '../../lib/api.ts';

const ROLE_BADGE_CONFIG: Record<
  MessageParticipantRole,
  { labelEn: string; labelCh: string; bg: string; text: string; icon: any }
> = {
  farmer: { labelEn: 'Farmer', labelCh: 'Mlimi', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: Sprout },
  buyer: { labelEn: 'Buyer', labelCh: 'Wogula', bg: 'bg-blue-100', text: 'text-blue-800', icon: User },
  transporter: { labelEn: 'Transporter', labelCh: 'Wonyamula', bg: 'bg-amber-100', text: 'text-amber-800', icon: Truck },
  agent: { labelEn: 'District Agent', labelCh: 'Mlangizi wa Boma', bg: 'bg-purple-100', text: 'text-purple-800', icon: Shield },
  admin: { labelEn: 'Admin', labelCh: 'Bwana Woyang\'anira', bg: 'bg-rose-100', text: 'text-rose-800', icon: ShieldCheck },
  finance_admin: { labelEn: 'Finance Escrow', labelCh: 'Za Chuma', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: ShieldCheck },
};

export const FcbMessagingCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const {
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
    selectConversation,
  } = useChat();

  const [inputDraft, setInputDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPeerDirectory, setShowPeerDirectory] = useState(false);
  const [directoryPeers, setDirectoryPeers] = useState<ChatPeerInfo[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<string>('all');
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activePeer && isChatOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, activePeer, isChatOpen, isMinimized]);

  // Fetch peers directory when opening directory view
  useEffect(() => {
    if (showPeerDirectory && currentUser?.uid) {
      fetchPeers();
    }
  }, [showPeerDirectory, directoryRoleFilter, searchQuery]);

  const fetchPeers = async () => {
    if (!currentUser?.uid) return;
    setLoadingDirectory(true);
    try {
      const q = encodeURIComponent(searchQuery);
      const r = encodeURIComponent(directoryRoleFilter);
      const res = await fetch(`/api/messages/peers?userUid=${currentUser.uid}&search=${q}&role=${r}`);
      if (res.ok) {
        const data = await safeParseJson(res, []);
        if (Array.isArray(data)) {
          setDirectoryPeers(data);
        }
      }
    } catch (err) {
      console.warn('[FCB Chat] Failed to load directory peers:', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputDraft.trim() || sendingMessage) return;
    const text = inputDraft;
    setInputDraft('');
    await sendMessage(text);
  };

  const handleQuickPrompt = async (promptText: string) => {
    setInputDraft(promptText);
  };

  if (!currentUser) return null;

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.peerName.toLowerCase().includes(q) ||
      (c.peerDistrict && c.peerDistrict.toLowerCase().includes(q)) ||
      (c.lastMessage?.messageText && c.lastMessage.messageText.toLowerCase().includes(q))
    );
  });

  // Quick reply prompt chips depending on active peer role
  const quickReplies = [
    language === 'ch' ? 'Moni! Kodi mbewu zili zokonzeka?' : 'Moni! Is the produce ready for pickup?',
    language === 'ch' ? 'Kodi chinyezi (moisture) nchovomerezeka?' : 'What is the certified moisture percentage?',
    language === 'ch' ? 'Ndalama za malonda zili mu Escrow.' : 'Payment is secured in Mbewalink Escrow.',
    language === 'ch' ? 'Tithandizane zonyamula mawa m\'mawa.' : 'Can we coordinate transport for tomorrow morning?',
  ];

  return (
    <>
      {/* Floating Toggle Button (Always visible bottom-right when chat is closed or minimized) */}
      {(!isChatOpen || isMinimized) && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            onClick={() => {
              if (isMinimized) {
                setIsMinimized(false);
              } else {
                toggleChat();
              }
            }}
            className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-700 to-green-800 text-white font-bold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all ring-4 ring-emerald-500/20"
            title="Open FCB Real-Time Messaging"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-white" />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {totalUnreadCount}
                </span>
              )}
            </div>
            <span className="text-xs tracking-wide">
              {language === 'ch' ? 'FCB Mauthenga' : 'FCB Messages'}
            </span>
          </button>
        </div>
      )}

      {/* Main Chat Drawer / Window */}
      {isChatOpen && !isMinimized && (
        <div className="fixed bottom-5 right-3 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              {activePeer ? (
                <button
                  onClick={() => openChat(null as any)}
                  className="p-1 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
                  title="Back to conversations"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center text-white">
                  <MessageSquare className="w-4 h-4" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight truncate max-w-[200px]">
                    {activePeer ? activePeer.name : language === 'ch' ? 'Mbewalink FCB Mauthenga' : 'FCB Direct Messaging'}
                  </h3>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-mono font-bold">
                    P2P
                  </span>
                </div>
                <p className="text-[10px] text-stone-300 flex items-center gap-1 truncate">
                  {activePeer ? (
                    <>
                      <span className="capitalize">{activePeer.role || 'Member'}</span>
                      {activePeer.district && <span>• {activePeer.district}</span>}
                    </>
                  ) : (
                    language === 'ch' ? 'Macheza achinsinsi pakati pa ogwiritsa ntchito' : 'Secure peer-to-peer conversations across Malawi'
                  )}
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={closeChat}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-hidden flex flex-col bg-stone-50">
            {/* VIEW 1: ACTIVE THREAD WITH PEER */}
            {activePeer ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Active Context Banner if related to an order */}
                {activeContext?.orderNumber && (
                  <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[11px] text-amber-900 flex items-center justify-between shrink-0">
                    <span className="font-semibold">
                      Ref: {activeContext.orderNumber} {activeContext.commodityName && `• ${activeContext.commodityName}`}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-200 px-1.5 py-0.5 rounded text-amber-900">
                      Escrow Order
                    </span>
                  </div>
                )}

                {/* Compliance Security Banner */}
                <div className="bg-emerald-50/70 border-b border-emerald-150 px-3 py-1 text-[10px] text-emerald-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Mbewalink Verified • Escrow protected channel</span>
                  </div>
                  {activePeer.phone && (
                    <a
                      href={`tel:${activePeer.phone}`}
                      className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                  )}
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-xs text-stone-400">
                      <span>Loading conversation history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-xs text-stone-900">
                        {language === 'ch' ? `Yambani macheza ndi ${activePeer.name}` : `Start conversation with ${activePeer.name}`}
                      </h4>
                      <p className="text-[11px] text-stone-500 max-w-xs">
                        {language === 'ch'
                          ? 'Tumizani uthenga wotetezeka. Mauthenga onse amafika munthawi yomweyo pa foni ndi pa kompyuta.'
                          : 'Exchange verified messages on commodities, transport logistics, and payments in real time.'}
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderUid === currentUser.uid;
                      return (
                        <div
                          key={m.id || m.messageId}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                              isMe
                                ? 'bg-emerald-700 text-white rounded-br-xs'
                                : 'bg-white text-stone-900 border border-stone-200 rounded-bl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.messageText}</p>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-stone-400 px-1">
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <span>
                                {m.isRead ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-600 inline" />
                                ) : (
                                  <Check className="w-3 h-3 text-stone-400 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts Bar */}
                <div className="px-3 py-1.5 bg-stone-100/80 border-t border-stone-200/60 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
                  {quickReplies.map((qr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(qr)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-[10px] font-medium text-stone-700 rounded-full border border-stone-200 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
                    >
                      {qr}
                    </button>
                  ))}
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={handleSend}
                  className="p-2.5 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={inputDraft}
                    onChange={(e) => setInputDraft(e.target.value)}
                    placeholder={
                      language === 'ch' ? `Lemblerani ${activePeer.name}...` : `Message ${activePeer.name}...`
                    }
                    className="flex-1 bg-stone-100 rounded-xl px-3 py-2 text-xs focus:outline-emerald-600 border border-stone-200 text-stone-900"
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    disabled={!inputDraft.trim() || sendingMessage}
                    className="p-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white transition-colors shadow-xs shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : showPeerDirectory ? (
              /* VIEW 2: PEER DIRECTORY (START NEW CHAT) */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 bg-white border-b border-stone-200 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-700" />
                      <span>{language === 'ch' ? 'Directory ya Ogwiritsa Ntchito' : 'Platform Peer Directory'}</span>
                    </h4>
                    <button
                      onClick={() => setShowPeerDirectory(false)}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      {language === 'ch' ? 'Bwererani' : 'Back to Inbox'}
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by name, district, or trading area..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-100 rounded-xl border border-stone-200 focus:outline-emerald-600"
                    />
                  </div>

                  {/* Role filter buttons */}
                  <div className="flex items-center gap-1 overflow-x-auto text-[10px] pt-0.5">
                    {['all', 'farmer', 'buyer', 'transporter', 'agent'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setDirectoryRoleFilter(role)}
                        className={`px-2 py-0.5 rounded-lg capitalize whitespace-nowrap font-medium transition-colors ${
                          directoryRoleFilter === role
                            ? 'bg-emerald-800 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {role === 'all' ? 'All Roles' : role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Directory List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {loadingDirectory ? (
                    <div className="h-32 flex items-center justify-center text-xs text-stone-400">
                      Loading verified peers...
                    </div>
                  ) : directoryPeers.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-xs text-stone-400">
                      <span>No members found matching your search.</span>
                    </div>
                  ) : (
                    directoryPeers.map((peer) => {
                      const roleConfig = ROLE_BADGE_CONFIG[peer.role as MessageParticipantRole] || ROLE_BADGE_CONFIG.farmer;
                      const RoleIcon = roleConfig.icon;
                      return (
                        <div
                          key={peer.uid}
                          onClick={() => {
                            setShowPeerDirectory(false);
                            openChat(peer);
                          }}
                          className="bg-white rounded-2xl border border-stone-200 p-2.5 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {peer.photoUrl ? (
                                <img src={peer.photoUrl} alt={peer.name} className="w-full h-full object-cover" />
                              ) : (
                                peer.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs text-stone-900 truncate">{peer.name}</h5>
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-500 truncate">
                                <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${roleConfig.bg} ${roleConfig.text}`}>
                                  {language === 'ch' ? roleConfig.labelCh : roleConfig.labelEn}
                                </span>
                                {peer.district && <span>• {peer.district}</span>}
                              </div>
                            </div>
                          </div>
                          <button className="px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] shrink-0">
                            Chat
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* VIEW 3: INBOX / CONVERSATIONS LIST */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search & New Message Header */}
                <div className="p-3 bg-white border-b border-stone-200 space-y-2 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-100 rounded-xl border border-stone-200 focus:outline-emerald-600"
                      />
                    </div>
                    <button
                      onClick={() => setShowPeerDirectory(true)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 shrink-0"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{language === 'ch' ? 'Tumizani' : 'New Chat'}</span>
                    </button>
                  </div>
                </div>

                {/* Conversation Items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {filteredConversations.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-stone-500">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-xs text-stone-800">
                        {language === 'ch' ? 'Palibe mauthenga panopa' : 'No conversations yet'}
                      </h4>
                      <p className="text-[11px] text-stone-500 max-w-xs">
                        {language === 'ch'
                          ? 'Dofani "New Chat" kuti mulankhulane ndi alimi, ogula, oyendetsa katundu, kapena mlangizi wa m\'boma mwanu.'
                          : 'Connect with farmers, buyers, transporters, or your local district agent for verified deals.'}
                      </p>
                      <button
                        onClick={() => setShowPeerDirectory(true)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-xs"
                      >
                        Start First Conversation
                      </button>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => {
                      const roleConfig = ROLE_BADGE_CONFIG[conv.peerRole as MessageParticipantRole] || ROLE_BADGE_CONFIG.farmer;
                      return (
                        <div
                          key={conv.peerUid}
                          onClick={() => selectConversation(conv)}
                          className="bg-white rounded-2xl border border-stone-200 p-2.5 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-10 h-10 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {conv.peerPhotoUrl ? (
                                <img src={conv.peerPhotoUrl} alt={conv.peerName} className="w-full h-full object-cover" />
                              ) : (
                                conv.peerName.slice(0, 2).toUpperCase()
                              )}
                              {conv.unreadCount > 0 && (
                                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-bold text-xs text-stone-900 truncate">{conv.peerName}</h5>
                                <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${roleConfig.bg} ${roleConfig.text}`}>
                                  {language === 'ch' ? roleConfig.labelCh : roleConfig.labelEn}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                {conv.lastMessage?.messageText || 'Conversation started'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-stone-400">
                              {conv.lastMessage?.createdAt
                                ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-700 text-white font-black text-[9px]">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
