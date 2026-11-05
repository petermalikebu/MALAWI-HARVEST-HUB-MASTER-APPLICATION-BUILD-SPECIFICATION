import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  MALAWI_DISTRICTS,
  NORTHERN_DISTRICTS,
  CENTRAL_DISTRICTS,
  SOUTHERN_DISTRICTS,
  getDistrictRegion,
  getRegionColorClass,
  AgriChatMessage,
  AgriConsultation,
} from '../../types/index.ts';
import {
  Sparkles,
  MessageSquare,
  BookOpen,
  Scale,
  UserCheck,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Camera,
  X,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Award,
  Sprout,
  Coins,
  Droplets,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
  Clock,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { compressImageFile } from '../../lib/imageCompressor.ts';

interface CropGuide {
  id: string;
  name: string;
  chichewaName: string;
  category: string;
  optimalDistricts: string[];
  plantingSeason: string;
  harvestSeason: string;
  soilRequirements: string;
  fertilizerSchedule: {
    basal: string;
    topDressing: string;
    organic: string;
  };
  spacingAndPopulation: string;
  commonPestsAndDiseases: Array<{
    name: string;
    symptoms: string;
    remedy: string;
  }>;
  qualityStandardsMBS: {
    gradeA: string;
    maxMoisture: string;
    foreignMatterLimit: string;
    aflatoxinLimit?: string;
  };
  postHarvestAndStorage: string;
  valueAdditionIdeas: string[];
  keyBuyersInMalawi: string[];
}

interface AgriPlace {
  title: string;
  uri: string;
  reviewSnippets?: Array<{ snippetText?: string; sourceUri?: string }>;
}

interface WebSource {
  title: string;
  uri: string;
}

interface AgriIntelligenceViewProps {
  initialTab?: 'chat' | 'knowledge' | 'quality_lab' | 'consultations' | 'grounding';
  embedded?: boolean;
}

export const AgriIntelligenceView: React.FC<AgriIntelligenceViewProps> = ({
  initialTab = 'chat',
  embedded = false,
}) => {
  const { currentUser } = useAuth();
  const { subscribe } = useRealtime();
  const { language, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'quality_lab' | 'consultations' | 'grounding'>(initialTab);

  // --------------------------------------------------------------------------
  // 1. CHAT ASSISTANT STATE
  // --------------------------------------------------------------------------
  const [chatMessages, setChatMessages] = useState<AgriChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `Moni! Welcome to the **Mberalink Agricultural Chat Assistant & Knowledge Centre**. I am your digital agricultural advisor and farming companion.

You can ask me questions about **crop production, livestock, soil fertility, fertilizer timing, pest and disease diagnosis, harvesting, grain drying, grading to Grade A standards, hermetic PICS storage, and agricultural marketing**.

You can also attach a photo of your crops or harvested produce for visual analysis, or use the microphone to speak your question in English or Chichewa.`,
      chichewaSummary: `Takulandirani ku Mberalink Mlimi Wodziwa! Ndine mlangizi wanu wa zaulimi pa makina a AI. Funsani chilichonse chokhudza mbewu, manyowa, feteleza, matenda a m'munda, miyezo ya mbewu (Grade A), kapena misika ya m'Malawi.`,
      recommendedActions: [
        'Ask about pest identification (e.g. Fall Armyworm in maize or Rosette in groundnuts)',
        'Check proper fertilizer application rates for your district',
        'Learn how to properly dry and grade produce to maximize selling price',
        'Upload a crop photo for immediate visual assessment'
      ],
      qualityAndGradingTip: 'Produce meeting Grade A standards (moisture <13% for maize, <7.5% for groundnuts) earns up to 20-30% premium prices at commercial buying depots.',
      suggestedFollowUps: [
        'How do I control Fall Armyworm in vegetative maize?',
        'What are the critical steps to eliminate aflatoxin in groundnuts?',
        'How do I perform the bottle-salt test to verify moisture without a meter?',
        'What is the recommended fertilizer schedule for hybrid maize in Lilongwe?'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState(currentUser?.district || 'Lilongwe');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [chatLanguage, setChatLanguage] = useState<'en' | 'ny'>('en');

  // Image upload in chat
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Interaction (Speech-to-Text & Text-to-Speech)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = chatLanguage === 'ny' ? 'ny-MW' : 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognitionRef.current = recognition;
    }
  }, [chatLanguage]);

  const toggleVoiceListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Voice input is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.lang = chatLanguage === 'ny' ? 'ny-MW' : 'en-US';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech recognition start notice:', err);
      }
    }
  };

  const handleSpeakText = (messageId: string, textToSpeak: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Audio playback is not supported in this browser.');
      return;
    }

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown syntax for speech
    const cleanText = textToSpeak
      .replace(/[*#_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 800);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Handle Photo Attachment
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImageFile(file, { maxWidth: 1024, quality: 0.85 });
      setAttachedImagePreview(compressedDataUrl);
      setAttachedImageBase64(compressedDataUrl);
    } catch (err) {
      console.error('Image compression failed:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAttachedImagePreview(result);
        setAttachedImageBase64(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send message to AI Assistant
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuestion).trim();
    if (!query && !attachedImageBase64) return;

    const userMsgId = `user-${Date.now()}`;
    const newUserMsg: AgriChatMessage = {
      id: userMsgId,
      role: 'user',
      text: query || 'Uploaded crop/produce photo for visual diagnosis and grading assessment.',
      imageUrl: attachedImagePreview || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newUserMsg]);
    setInputQuestion('');
    const currentImg = attachedImageBase64;
    setAttachedImageBase64(null);
    setAttachedImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setChatLoading(true);

    try {
      // Build conversation history for context preservation
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        text: m.text,
      }));

      const res = await fetch('/api/ai/agri-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          imageBase64: currentImg,
          district: selectedDistrict,
          preferredLanguage: chatLanguage,
          topic: selectedTopic !== 'all' ? selectedTopic : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve agricultural advice.');
      }

      const assistantMsg: AgriChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.text || 'Advice processed successfully.',
        chichewaSummary: data.chichewaSummary,
        recommendedActions: data.recommendedActions,
        qualityAndGradingTip: data.qualityAndGradingTip,
        suggestedFollowUps: data.suggestedFollowUps,
        warningOrDisclaimer: data.warningOrDisclaimer,
        canEscalateToExpert: data.shouldEscalateToExpert,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackMsg: AgriChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `**Notice:** ${err.message || 'Network connectivity issue'}. Using verified Malawi agricultural extension guidelines:
- For crop pests (e.g. Fall Armyworm): Scout weekly and apply recommended insecticides (Chlorantraniliprole/Belt) into the whorl.
- For post-harvest quality: Always dry produce on tarpaulins to <13.0% moisture (Maize) and store in airtight PICS bags.
- For immediate local guidance, please visit your local Extension Planning Area (EPA) depot.`,
        chichewaSummary: 'Chifukwa cha intaneti, onetsetsani kuti mukutsatira malangizo a alangizi a zaulimi a ku EPA yanu. Yanikani mbewu pa matheka ndipo musasunge mbewu zonyowa.',
        recommendedActions: [
          'Verify that grain moisture is tested before bagging',
          'Use PICS triple bags for chemical-free storage',
          'Submit a direct ticket to an agricultural extension officer below'
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 2. KNOWLEDGE CENTRE STATE
  // --------------------------------------------------------------------------
  const [cropsList, setCropsList] = useState<CropGuide[]>([]);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [knowledgeCategory, setKnowledgeCategory] = useState('all');
  const [selectedCropModal, setSelectedCropModal] = useState<CropGuide | null>(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  useEffect(() => {
    const fetchKnowledge = async () => {
      setLoadingKnowledge(true);
      try {
        const res = await fetch('/api/agri/knowledge');
        const data = await res.json();
        if (data.success && Array.isArray(data.crops)) {
          setCropsList(data.crops);
        }
      } catch (err) {
        console.warn('Failed to fetch knowledge:', err);
      } finally {
        setLoadingKnowledge(false);
      }
    };
    fetchKnowledge();
  }, []);

  const filteredCrops = cropsList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      c.chichewaName.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      c.optimalDistricts.some((d) => d.toLowerCase().includes(knowledgeSearch.toLowerCase())) ||
      c.commonPestsAndDiseases.some((p) => p.name.toLowerCase().includes(knowledgeSearch.toLowerCase()));

    const matchesCategory =
      knowledgeCategory === 'all' ||
      c.category.toLowerCase().includes(knowledgeCategory.toLowerCase()) ||
      (knowledgeCategory === 'grains' && (c.category.includes('Grain') || c.category.includes('Cereal'))) ||
      (knowledgeCategory === 'legumes' && (c.category.includes('Legume') || c.category.includes('Pulse'))) ||
      (knowledgeCategory === 'oilseeds' && c.category.includes('Oilseed')) ||
      (knowledgeCategory === 'tubers' && c.category.includes('Root'));

    return matchesSearch && matchesCategory;
  });

  // --------------------------------------------------------------------------
  // 3. PRODUCE QUALITY & GRADING LAB STATE
  // --------------------------------------------------------------------------
  const [labCommodity, setLabCommodity] = useState('White Maize');
  const [labMoisture, setLabMoisture] = useState<number>(12.8);
  const [labForeignMatter, setLabForeignMatter] = useState<number>(1.2);
  const [labBroken, setLabBroken] = useState<number>(2.5);
  const [labMold, setLabMold] = useState<number>(0.0);
  const [labShrivelled, setLabShrivelled] = useState<number>(1.0);
  const [labAssessing, setLabAssessing] = useState(false);
  const [labResult, setLabResult] = useState<any>(null);

  const runQualityAssessment = async () => {
    setLabAssessing(true);
    try {
      const res = await fetch('/api/ai/quality-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodityName: labCommodity,
          moisturePercent: labMoisture,
          foreignMatterPercent: labForeignMatter,
          brokenPercent: labBroken,
          moldPercent: labMold,
          shrivelledPercent: labShrivelled,
        }),
      });
      const data = await res.json();
      setLabResult(data);
    } catch (err) {
      console.error('Quality assessment error:', err);
    } finally {
      setLabAssessing(false);
    }
  };

  useEffect(() => {
    runQualityAssessment();
  }, [labCommodity]);

  // --------------------------------------------------------------------------
  // 4. AGRICULTURAL EXPERT CONSULTATIONS STATE
  // --------------------------------------------------------------------------
  const [consultations, setConsultations] = useState<AgriConsultation[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [submittingConsultation, setSubmittingConsultation] = useState(false);
  const [consultationSuccess, setConsultationSuccess] = useState<string | null>(null);

  // New Consultation Form fields
  const [cFormTopic, setCFormTopic] = useState('White Maize Pest / Leaf Symptoms');
  const [cFormDistrict, setCFormDistrict] = useState(currentUser?.district || 'Lilongwe');
  const [cFormEPA, setCFormEPA] = useState('Chitedze EPA');
  const [cFormQuestion, setCFormQuestion] = useState('');
  const [cFormUrgency, setCFormUrgency] = useState<'normal' | 'high' | 'critical'>('high');
  const [cFormImage, setCFormImage] = useState<string | null>(null);

  // Expert Reply Modal State (For Peter/Joshua admins or extension officers)
  const [answeringConsultation, setAnsweringConsultation] = useState<AgriConsultation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyOfficerName, setReplyOfficerName] = useState(currentUser?.fullName || 'Peter Malikebu');
  const [replyOfficerTitle, setReplyOfficerTitle] = useState('Senior Agricultural Extension Specialist');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchConsultations = async () => {
    setLoadingConsultations(true);
    try {
      const res = await fetch('/api/agri/consultations');
      const data = await res.json();
      if (Array.isArray(data)) {
        setConsultations(data);
      }
    } catch (err) {
      console.warn('Consultations fetch notice:', err);
    } finally {
      setLoadingConsultations(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
    const unsub = subscribe('AGRI_CONSULTATION_CREATED', () => fetchConsultations());
    const unsub2 = subscribe('AGRI_CONSULTATION_ANSWERED', () => fetchConsultations());
    return () => {
      unsub();
      unsub2();
    };
  }, []);

  const handleSubmitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cFormQuestion.trim()) return;

    setSubmittingConsultation(true);
    setConsultationSuccess(null);

    try {
      const res = await fetch('/api/agri/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerUid: currentUser?.uid || 'guest-farmer',
          farmerName: currentUser?.fullName || 'Smallholder Farmer',
          farmerPhone: currentUser?.phoneNumber || '+265 ',
          district: cFormDistrict,
          epa: cFormEPA,
          cropOrTopic: cFormTopic,
          question: cFormQuestion,
          imageUrl: cFormImage || '',
          urgency: cFormUrgency,
          aiInitialSummary: `Submitted query regarding ${cFormTopic} in ${cFormDistrict}.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit consultation');

      setConsultationSuccess(`Consultation inquiry #${data.consultation?.consultationNumber} submitted successfully! An Extension Officer will review and respond.`);
      setCFormQuestion('');
      setCFormImage(null);
      setShowConsultationForm(false);
      fetchConsultations();
    } catch (err: any) {
      alert(err.message || 'Failed to submit consultation');
    } finally {
      setSubmittingConsultation(false);
    }
  };

  const handleExpertReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringConsultation || !replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/agri/consultations/${answeringConsultation.id}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertName: replyOfficerName,
          expertTitle: replyOfficerTitle,
          expertResponse: replyText,
          status: 'answered',
        }),
      });
      if (!res.ok) throw new Error('Failed to record expert response');
      setAnsweringConsultation(null);
      setReplyText('');
      fetchConsultations();
    } catch (err: any) {
      alert(err.message || 'Failed to submit expert reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Quick Action to Escalate from Chat to Expert Form
  const handleEscalateFromChat = (msg: AgriChatMessage) => {
    setCFormTopic('Visual Crop Diagnosis / Agricultural Consultation');
    setCFormQuestion(msg.text);
    if (msg.imageUrl) setCFormImage(msg.imageUrl);
    setActiveTab('consultations');
    setShowConsultationForm(true);
  };

  // --------------------------------------------------------------------------
  // 5. GROUNDING (MAPS & SEARCH) STATE
  // --------------------------------------------------------------------------
  const [mapsDistrict, setMapsDistrict] = useState<string>(currentUser?.district || 'Lilongwe');
  const [mapsQuery, setMapsQuery] = useState<string>(
    'Find major ADMARC crop buying depots, NFRA grain silos, and agricultural warehouses in Lilongwe, Malawi'
  );
  const [mapsLoading, setMapsLoading] = useState<boolean>(false);
  const [mapsResponse, setMapsResponse] = useState<string | null>(null);
  const [mapsPlaces, setMapsPlaces] = useState<AgriPlace[]>([]);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>(
    'Current market price of maize per 50kg bag and Kilombero rice in Malawi agricultural markets this week'
  );
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResponse, setSearchResponse] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<WebSource[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleRunMapsGrounding = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || mapsQuery).trim();
    if (!promptToSend) return;

    setMapsLoading(true);
    setMapsError(null);
    setMapsResponse(null);
    setMapsPlaces([]);

    try {
      const res = await fetch('/api/ai/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          district: mapsDistrict,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retrieve grounded Google Maps intelligence.');

      setMapsResponse(data.text || 'Location intelligence verified.');
      setMapsPlaces(Array.isArray(data.places) ? data.places : []);
    } catch (err: any) {
      setMapsError(err.message || 'An error occurred connecting to Google Maps.');
    } finally {
      setMapsLoading(false);
    }
  };

  const handleRunSearchGrounding = async () => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResponse(null);
    setSearchSources([]);

    try {
      const res = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: searchQuery }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retrieve live market intelligence.');

      setSearchResponse(data.text || 'Search data verified.');
      setSearchSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (err: any) {
      setSearchError(err.message || 'An error occurred during search.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${embedded ? '' : 'max-w-7xl mx-auto px-4 py-6 sm:px-6'}`}>
      {/* Header Banner */}
      <div className="bg-radial from-emerald-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-emerald-700/50">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Mlimi Wodziwa • Powered by Gemini 3.8 Flash
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              AI Agricultural Chat Assistant &amp; Knowledge Centre
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
              Interactive farming advisory, image-based plant disease diagnosis, MBS Grade A quality standards, voice interaction, and direct access to Agricultural Extension Officers across Malawi.
            </p>
          </div>

          {/* Quick Stats / Language Toggle */}
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-3 shrink-0">
            <div className="flex items-center bg-emerald-900/60 backdrop-blur-xs p-1 rounded-2xl border border-emerald-700/60 text-xs font-medium text-emerald-100">
              <button
                type="button"
                onClick={() => setChatLanguage('en')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  chatLanguage === 'en' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setChatLanguage('ny')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  chatLanguage === 'ny' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'hover:text-white'
                }`}
              >
                Chichewa
              </button>
            </div>

            <div className="text-xs text-emerald-200/80 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target Region: <strong>{selectedDistrict}</strong></span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 pt-6 border-t border-emerald-700/50 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'chat'
                ? 'bg-white text-emerald-900 shadow-md scale-102'
                : 'bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/70 border border-emerald-700/40'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            AI Chat Assistant
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'knowledge'
                ? 'bg-white text-emerald-900 shadow-md scale-102'
                : 'bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/70 border border-emerald-700/40'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            Knowledge Centre
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quality_lab')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'quality_lab'
                ? 'bg-white text-emerald-900 shadow-md scale-102'
                : 'bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/70 border border-emerald-700/40'
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            Quality &amp; Grading Lab
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('consultations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'consultations'
                ? 'bg-white text-emerald-900 shadow-md scale-102'
                : 'bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/70 border border-emerald-700/40'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Expert Consultations
            {consultations.filter((c) => c.status === 'pending_expert_review').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grounding')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'grounding'
                ? 'bg-white text-emerald-900 shadow-md scale-102'
                : 'bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/70 border border-emerald-700/40'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-600" />
            Depots &amp; Live Search
          </button>
        </div>
      </div>

      {/* TAB 1: AI AGRICULTURAL CHAT ASSISTANT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Stream */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-stone-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-stone-200 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  🌾
                </div>
                <div>
                  <h3 className="font-bold text-xs text-stone-900">Mberalink AI Farming Companion</h3>
                  <p className="text-[11px] text-stone-500">
                    Continuous conversational advisor • Context preserved across turns
                  </p>
                </div>
              </div>

              {/* District & Topic Filters */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white font-medium text-stone-700 focus:outline-emerald-600"
                >
                  {MALAWI_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d} District
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setChatMessages((prev) => [prev[0]]);
                  }}
                  title="Clear chat and restart"
                  className="p-1.5 rounded-xl border border-stone-200 bg-white text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 ${
                      msg.role === 'user'
                        ? 'bg-emerald-800 text-white rounded-br-xs'
                        : 'bg-stone-50 text-stone-800 border border-stone-200 rounded-bl-xs'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-3 text-[11px] opacity-80 border-b pb-1.5 border-current/10">
                      <span className="font-bold">
                        {msg.role === 'user' ? 'Mlimi (You)' : 'Mberalink AI Agronomist'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{msg.timestamp}</span>
                        {msg.role === 'assistant' && (
                          <button
                            type="button"
                            onClick={() => handleSpeakText(msg.id, msg.text)}
                            className="p-1 rounded-md hover:bg-stone-200/60 text-stone-600 transition-colors"
                            title={speakingMessageId === msg.id ? 'Stop audio' : 'Listen with voice audio (Text-to-Speech)'}
                          >
                            {speakingMessageId === msg.id ? (
                              <VolumeX className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Attached Image if user sent photo */}
                    {msg.imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-black/10 my-2 max-w-sm">
                        <img
                          src={msg.imageUrl}
                          alt="Uploaded crop or produce"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
                      {msg.text}
                    </div>

                    {/* Chichewa Summary Card */}
                    {msg.chichewaSummary && (
                      <div className="mt-3 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-950 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-amber-900 text-[11px] uppercase tracking-wider">
                            🇲🇼 Chidule mu Chichewa (National Language)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSpeakText(`${msg.id}-chichewa`, msg.chichewaSummary || '')}
                            className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" /> Mvetserani
                          </button>
                        </div>
                        <p className="leading-relaxed text-[11px] sm:text-xs">
                          {msg.chichewaSummary}
                        </p>
                      </div>
                    )}

                    {/* Recommended Actions Checklist */}
                    {msg.recommendedActions && msg.recommendedActions.length > 0 && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-950 text-xs space-y-2">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-900 text-[11px] uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          Recommended Field &amp; Post-Harvest Actions
                        </span>
                        <ul className="space-y-1.5 text-[11px] sm:text-xs text-emerald-900">
                          {msg.recommendedActions.map((act, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Product Quality & Market Value Tip */}
                    {msg.qualityAndGradingTip && (
                      <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800 text-[11px] flex items-start gap-2">
                        <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-stone-900 block font-semibold">Grade A Market Value Tip:</strong>
                          <span>{msg.qualityAndGradingTip}</span>
                        </div>
                      </div>
                    )}

                    {/* Disclaimer & Expert Escalation Option */}
                    {msg.warningOrDisclaimer && (
                      <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-[10px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>{msg.warningOrDisclaimer}</span>
                      </div>
                    )}

                    {/* Escalate to Human Extension Officer Button */}
                    {msg.canEscalateToExpert && (
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleEscalateFromChat(msg)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] shadow-xs transition-all"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Escalate to EPA Extension Officer
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Suggested Follow-up Prompts */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 max-w-2xl">
                      {msg.suggestedFollowUps.map((f, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(f)}
                          className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-stone-600 hover:text-emerald-800 text-[11px] font-medium transition-colors text-left"
                        >
                          💬 {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-start gap-3 text-xs text-stone-500">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center animate-spin">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 text-stone-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                    <span>Analyzing agricultural advice &amp; verifying Malawian agronomic standards...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer & Toolbar */}
            <div className="p-3 sm:p-4 bg-white border-t border-stone-200 space-y-3">
              {/* Image Preview if user selected a photo */}
              {attachedImagePreview && (
                <div className="flex items-center gap-3 p-2 bg-stone-50 rounded-2xl border border-stone-200 max-w-md">
                  <img
                    src={attachedImagePreview}
                    alt="Preview"
                    className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-stone-800 truncate">Crop photo ready for diagnosis</p>
                    <p className="text-[10px] text-stone-500">Will be analyzed for pests, diseases, or grain quality</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedImageBase64(null);
                      setAttachedImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Photo Upload Button */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload picture of crop, leaf disease, or produce quality"
                  className="p-2.5 rounded-2xl border border-stone-200 bg-stone-50 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0"
                >
                  <Camera className="w-5 h-5" />
                </button>

                {/* Voice Input Microphone Button */}
                <button
                  type="button"
                  onClick={toggleVoiceListening}
                  title={isListening ? 'Stop listening' : 'Speak your question (Voice Input)'}
                  className={`p-2.5 rounded-2xl border transition-all shrink-0 ${
                    isListening
                      ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Question Input Textarea */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder={
                      isListening
                        ? 'Listening to your voice in Chichewa or English...'
                        : 'Ask any farming question or describe crop symptoms...'
                    }
                    className="w-full px-4 py-2.5 rounded-2xl border border-stone-300 focus:outline-emerald-600 text-xs sm:text-sm bg-white"
                  />
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={chatLoading || (!inputQuestion.trim() && !attachedImageBase64)}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 shrink-0 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask AI</span>
                </button>
              </form>

              {/* Status footer */}
              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                <span>
                  Language: <strong>{chatLanguage === 'ny' ? 'Chichewa (Malawi)' : 'English'}</strong> • Region: <strong>{selectedDistrict}</strong>
                </span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" /> MBS Quality Grounded
                </span>
              </div>
            </div>
          </div>

          {/* Quick Questions & Agricultural Guidance Sidebar */}
          <div className="space-y-6">
            {/* Quick Topic Prompts Card */}
            <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-stone-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Common Farmer Questions
              </h4>
              <p className="text-[11px] text-stone-500">
                Click any prompt to instantly consult the assistant:
              </p>
              <div className="space-y-2">
                {[
                  'How do I control Fall Armyworm in vegetative maize?',
                  'How do I eliminate aflatoxin in groundnuts?',
                  'What is the recommended fertilizer rate per hectare for hybrid maize in Lilongwe?',
                  'How do I perform the bottle-salt test to verify moisture without a meter?',
                  'What are the MBS Grade A quality requirements for Kilombero rice?',
                  'How to make Mbeya organic compost manure?',
                  'How to prevent weevils in stored beans without toxic chemicals?',
                  'What value addition products can I make from cassava?'
                ].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-2.5 rounded-2xl border border-stone-100 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-200 text-stone-700 hover:text-emerald-900 text-xs transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{prompt}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            {/* Post-Harvest Standards Summary Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 p-5 text-amber-950 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <Scale className="w-4 h-4 text-amber-700" />
                MBS Grain Moisture Limits
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                To qualify for <strong>Grade A premium prices</strong>, commodities must not exceed these safe storage moisture ceilings:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-center">
                  <span className="block text-[11px] text-stone-500 font-medium">White Maize</span>
                  <span className="font-bold text-amber-950 text-sm">&lt; 13.0%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-center">
                  <span className="block text-[11px] text-stone-500 font-medium">Groundnuts</span>
                  <span className="font-bold text-amber-950 text-sm">&lt; 7.5%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-center">
                  <span className="block text-[11px] text-stone-500 font-medium">Soya Beans</span>
                  <span className="font-bold text-amber-950 text-sm">&lt; 11.5%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-center">
                  <span className="block text-[11px] text-stone-500 font-medium">Sugar Beans</span>
                  <span className="font-bold text-amber-950 text-sm">&lt; 12.0%</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('quality_lab')}
                className="w-full mt-2 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                Test in Grading Lab <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AGRICULTURAL KNOWLEDGE CENTRE */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          {/* Search & Topic Filters */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={knowledgeSearch}
                  onChange={(e) => setKnowledgeSearch(e.target.value)}
                  placeholder="Search crops, pests, soil management, harvesting guidelines, or value addition..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-300 focus:outline-emerald-600 text-xs sm:text-sm bg-white"
                />
              </div>

              <select
                value={knowledgeCategory}
                onChange={(e) => setKnowledgeCategory(e.target.value)}
                className="px-3.5 py-2.5 rounded-2xl border border-stone-300 focus:outline-emerald-600 text-xs sm:text-sm bg-white font-medium text-stone-700 shrink-0"
              >
                <option value="all">All Agricultural Categories</option>
                <option value="grains">Grains &amp; Cereals (Maize, Rice, Sorghum)</option>
                <option value="legumes">Legumes &amp; Pulses (Soya, Sugar Beans)</option>
                <option value="oilseeds">Oilseeds &amp; Nuts (Groundnuts, Sunflower)</option>
                <option value="tubers">Roots &amp; Tubers (Cassava, Potatoes)</option>
              </select>
            </div>

            {/* Quick Topic Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-stone-500 font-semibold text-[11px] uppercase tracking-wider">
                Browse Topics:
              </span>
              {[
                { label: 'Maize Production', q: 'maize' },
                { label: 'Aflatoxin Control', q: 'aflatoxin' },
                { label: 'Fertilizer Application', q: 'fertilizer' },
                { label: 'Hermetic PICS Bags', q: 'storage' },
                { label: 'Kilombero Rice', q: 'rice' },
                { label: 'Chalimbana Nuts', q: 'groundnuts' },
                { label: 'Fall Armyworm', q: 'armyworm' },
                { label: 'Cassava Starch', q: 'cassava' },
              ].map((badge, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setKnowledgeSearch(badge.q)}
                  className={`px-3 py-1.5 rounded-xl border font-medium transition-all ${
                    knowledgeSearch === badge.q
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {badge.label}
                </button>
              ))}
            </div>
          </div>

          {/* Crops Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCrops.map((crop) => (
              <div
                key={crop.id}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                        {crop.category}
                      </span>
                      <h3 className="text-lg font-extrabold text-stone-900 mt-0.5">
                        {crop.name}
                      </h3>
                      <p className="text-xs text-stone-500 italic">{crop.chichewaName}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0">
                      MBS Grade A
                    </span>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-2 text-xs text-stone-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span><strong>Planting:</strong> {crop.plantingSeason.slice(0, 40)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span><strong>Key Districts:</strong> {crop.optimalDistricts.slice(0, 3).join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span><strong>Max Moisture:</strong> <strong className="text-emerald-700">{crop.qualityStandardsMBS.maxMoisture}</strong></span>
                    </div>
                  </div>

                  {/* Pest Alert Preview */}
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] space-y-1">
                    <span className="font-bold text-stone-800 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Key Pest / Disease:
                    </span>
                    <p className="text-stone-600 leading-snug">
                      <strong>{crop.commonPestsAndDiseases[0]?.name}:</strong> {crop.commonPestsAndDiseases[0]?.remedy.slice(0, 90)}...
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedCropModal(crop)}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                  >
                    View Full Guide &amp; Standards <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('chat');
                      handleSendMessage(`How can I maximize my yield and achieve Grade A market price for ${crop.name} in Malawi?`);
                    }}
                    className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold"
                    title="Ask AI Assistant about this crop"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredCrops.length === 0 && (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-bold text-stone-800 text-base">No Matching Agricultural Records Found</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Try searching for general terms like "maize", "groundnut", "fertilizer", "storage", or "aflatoxin".
              </p>
            </div>
          )}

          {/* Full Crop Modal */}
          {selectedCropModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setSelectedCropModal(null)}
                  className="absolute top-5 right-5 p-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    {selectedCropModal.category} • Agricultural Reference Guide
                  </span>
                  <h2 className="text-2xl font-black text-stone-900">
                    {selectedCropModal.name}
                  </h2>
                  <p className="text-sm text-stone-500 italic">{selectedCropModal.chichewaName}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                    <span className="font-bold text-stone-900 block">Optimal Regions &amp; Districts</span>
                    <p className="text-stone-600">{selectedCropModal.optimalDistricts.join(', ')}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <span className="font-bold text-emerald-950 block">MBS Grade A Moisture Standard</span>
                    <p className="text-emerald-900 font-bold text-sm">{selectedCropModal.qualityStandardsMBS.maxMoisture}</p>
                  </div>
                </div>

                {/* Agronomy & Fertilizer */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-stone-900 border-b pb-2 flex items-center gap-1.5">
                    <Sprout className="w-4 h-4 text-emerald-700" /> Agronomic Techniques &amp; Fertilizer Schedule
                  </h4>
                  <div className="space-y-2 text-xs text-stone-700 leading-relaxed">
                    <p><strong>Spacing:</strong> {selectedCropModal.spacingAndPopulation}</p>
                    <p><strong>Soil:</strong> {selectedCropModal.soilRequirements}</p>
                    <p><strong>Basal Fertilizer:</strong> {selectedCropModal.fertilizerSchedule.basal}</p>
                    <p><strong>Top Dressing:</strong> {selectedCropModal.fertilizerSchedule.topDressing}</p>
                    <p><strong>Organic Compost:</strong> {selectedCropModal.fertilizerSchedule.organic}</p>
                  </div>
                </div>

                {/* Pests & Diseases */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-stone-900 border-b pb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Pests &amp; Disease Diagnostic Library
                  </h4>
                  <div className="space-y-3">
                    {selectedCropModal.commonPestsAndDiseases.map((p, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                        <strong className="text-stone-900 block">{p.name}</strong>
                        <p className="text-stone-600"><strong>Symptoms:</strong> {p.symptoms}</p>
                        <p className="text-emerald-800"><strong>Remedy:</strong> {p.remedy}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Post Harvest, Quality & Value Addition */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-stone-900 border-b pb-2 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-700" /> Post-Harvest Handling, Standards &amp; Value Addition
                  </h4>
                  <div className="space-y-2 text-xs text-stone-700 leading-relaxed">
                    <p><strong>Handling &amp; Storage:</strong> {selectedCropModal.postHarvestAndStorage}</p>
                    <p><strong>MBS Grade A Criteria:</strong> {selectedCropModal.qualityStandardsMBS.gradeA}</p>
                    <p><strong>Value Addition Ideas:</strong> {selectedCropModal.valueAdditionIdeas.join(', ')}</p>
                    <p><strong>Key Buyers in Malawi:</strong> {selectedCropModal.keyBuyersInMalawi.join(', ')}</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const crop = selectedCropModal;
                      setSelectedCropModal(null);
                      setActiveTab('chat');
                      handleSendMessage(`I want a complete step-by-step drying, sorting, and storage plan for ${crop.name} to guarantee Grade A price in Malawi.`);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
                  >
                    Consult AI Assistant on This Crop
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCE QUALITY & GRADING LAB */}
      {activeTab === 'quality_lab' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quality Assessment Calculator Inputs */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                MBS MS 31 / COMESA Calibration
              </span>
              <h3 className="text-lg font-extrabold text-stone-900">
                Quality &amp; Grading Simulator
              </h3>
              <p className="text-xs text-stone-500">
                Adjust harvest parameters to calculate expected Grade and financial gain per ton.
              </p>
            </div>

            <div className="space-y-4">
              {/* Commodity Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Select Harvested Commodity
                </label>
                <select
                  value={labCommodity}
                  onChange={(e) => setLabCommodity(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white font-bold text-emerald-800"
                >
                  <option value="White Maize">White Maize (Chimanga)</option>
                  <option value="Chalimbana Groundnuts">Chalimbana Groundnuts (Mtedza)</option>
                  <option value="Soya Beans">Soya Beans (Non-GMO)</option>
                  <option value="Kilombero Rice">Kilombero Aromatic Rice</option>
                  <option value="Sugar Beans">Red Kidney / Sugar Beans</option>
                </select>
              </div>

              {/* Moisture Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-stone-700">Moisture Content (%)</span>
                  <span className="font-bold text-emerald-800">{labMoisture}%</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={22}
                  step={0.1}
                  value={labMoisture}
                  onChange={(e) => setLabMoisture(parseFloat(e.target.value))}
                  className="w-full accent-emerald-700"
                />
                <span className="text-[10px] text-stone-500 block">
                  Grade A threshold: &lt;13.0% for maize, &lt;7.5% for groundnuts
                </span>
              </div>

              {/* Foreign Matter Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-stone-700">Foreign Matter &amp; Chaff (%)</span>
                  <span className="font-bold text-emerald-800">{labForeignMatter}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.1}
                  value={labForeignMatter}
                  onChange={(e) => setLabForeignMatter(parseFloat(e.target.value))}
                  className="w-full accent-emerald-700"
                />
                <span className="text-[10px] text-stone-500 block">Stones, dust, husks (Max 1.5% for Grade A)</span>
              </div>

              {/* Broken Grain Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-stone-700">Broken Kernels (%)</span>
                  <span className="font-bold text-emerald-800">{labBroken}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={0.5}
                  value={labBroken}
                  onChange={(e) => setLabBroken(parseFloat(e.target.value))}
                  className="w-full accent-emerald-700"
                />
              </div>

              {/* Mold Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-stone-700">Visible Mold (%)</span>
                  <span className={`font-bold ${labMold > 0 ? 'text-rose-600' : 'text-emerald-800'}`}>
                    {labMold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={labMold}
                  onChange={(e) => setLabMold(parseFloat(e.target.value))}
                  className="w-full accent-rose-600"
                />
                <span className="text-[10px] text-rose-600 block">Aflatoxin indicator (&gt;1% triggers rejection)</span>
              </div>

              <button
                type="button"
                onClick={runQualityAssessment}
                disabled={labAssessing}
                className="w-full py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {labAssessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                Evaluate Produce Grade
              </button>
            </div>
          </div>

          {/* Assessment Results & Financial Premium Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {labResult && (
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
                  <div>
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                      Evaluation Outcome • {labResult.commodityName}
                    </span>
                    <h3 className="text-2xl font-black text-stone-900 mt-1 flex items-center gap-2">
                      {labResult.grade}
                      {labResult.mbsCertified ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 inline" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-amber-500 inline" />
                      )}
                    </h3>
                  </div>

                  {/* Estimated Price Badge */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-right">
                    <span className="text-[11px] text-stone-500 block font-medium">Estimated Market Value</span>
                    <span className="text-xl font-black text-emerald-800">
                      MWK {labResult.estimatedMarketPriceMwkPerKg?.toLocaleString()} / kg
                    </span>
                  </div>
                </div>

                {/* Financial Gain per Ton Analysis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                    <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-700" /> Grade A Target Price
                    </span>
                    <span className="text-xl font-extrabold text-emerald-900 block">
                      MWK {labResult.gradeAPotentialPriceMwkPerKg?.toLocaleString()} / kg
                    </span>
                    <p className="text-[11px] text-emerald-700">Maximum price paid at commercial depots</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                    <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-700" /> Potential Revenue Loss / Gain
                    </span>
                    <span className="text-xl font-extrabold text-amber-900 block">
                      + MWK {labResult.potentialGainPerTonMwk?.toLocaleString()} / Ton
                    </span>
                    <p className="text-[11px] text-amber-700">Extra earnings unlocked by sorting &amp; drying</p>
                  </div>
                </div>

                {/* Deductions & Specific Defects */}
                {labResult.deductions && labResult.deductions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 text-rose-600" /> Defects Detected by Laboratory Rules:
                    </h4>
                    <div className="space-y-1.5">
                      {labResult.deductions.map((d: string, i: number) => (
                        <div key={i} className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-900 text-xs flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Practical Recommendations to achieve Grade A */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Actions to Elevate Produce to Grade A:
                  </h4>
                  <div className="space-y-2">
                    {labResult.recommendations?.map((r: string, i: number) => (
                      <div key={i} className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800 text-xs flex items-start gap-2.5">
                        <span className="font-bold text-emerald-700">{i + 1}.</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Farm-level testing tutorial: The Glass Jar and Dry Salt Test */}
            <div className="bg-stone-50 rounded-3xl border border-stone-200 p-6 text-xs text-stone-700 space-y-3">
              <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                🧂 Practical Farm Method: The Glass Jar &amp; Dry Salt Moisture Test
              </div>
              <p className="leading-relaxed">
                If you do not have an electronic moisture meter, you can test grain moisture safely at village level using dry table salt:
              </p>
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>Take a clean, completely dry glass jar with a tight lid.</li>
                <li>Fill the jar two-thirds full with sampled grain from various sacks.</li>
                <li>Add 2 tablespoons of dry table salt (make sure salt is dry by warming in pan first).</li>
                <li>Fasten the lid tightly and shake vigorously for 1 minute, then leave to stand for 15 minutes.</li>
                <li><strong>Observation:</strong> If salt sticks to the glass inside, moisture is <strong>above 14% (too damp to store)</strong>. If the salt falls freely to the bottom like dry powder, moisture is <strong>below 13% (safe for Grade A storage)</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AGRICULTURAL EXPERT CONSULTATIONS DESK */}
      {activeTab === 'consultations' && (
        <div className="space-y-6">
          {/* Top Consultation Actions */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                EPA Extension Service • Chitedze Research Link
              </span>
              <h3 className="text-lg font-extrabold text-stone-900">
                Agricultural Expert Support Desk
              </h3>
              <p className="text-xs text-stone-500">
                Directly consult Agricultural Extension Development Officers (AEDO) and agronomists for verified field guidance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowConsultationForm(!showConsultationForm)}
              className="px-5 py-2.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              {showConsultationForm ? 'Close Inquiry Form' : 'Submit Expert Inquiry'}
            </button>
          </div>

          {/* Success Banner */}
          {consultationSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{consultationSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setConsultationSuccess(null)}
                className="text-emerald-700 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* New Consultation Submission Form */}
          {showConsultationForm && (
            <form onSubmit={handleSubmitConsultation} className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-5">
              <div className="border-b pb-3">
                <h4 className="font-bold text-sm text-stone-900">
                  New Agricultural Consultation with Extension Officers
                </h4>
                <p className="text-xs text-stone-500">
                  Provide detailed crop, soil, pest, or quality symptoms. Attached photos help experts diagnose immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">District *</label>
                  <select
                    value={cFormDistrict}
                    onChange={(e) => setCFormDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  >
                    {MALAWI_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">Extension Planning Area (EPA)</label>
                  <input
                    type="text"
                    value={cFormEPA}
                    onChange={(e) => setCFormEPA(e.target.value)}
                    placeholder="e.g. Kamwendo EPA, Chitedze EPA"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">Urgency Level</label>
                  <select
                    value={cFormUrgency}
                    onChange={(e) => setCFormUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 bg-white font-semibold"
                  >
                    <option value="normal">Normal (Routine advice)</option>
                    <option value="high">High (Spreading pest / disease)</option>
                    <option value="critical">Critical (Imminent crop loss / harvest decay)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-700 font-bold mb-1">Crop or Agricultural Topic *</label>
                <input
                  type="text"
                  value={cFormTopic}
                  onChange={(e) => setCFormTopic(e.target.value)}
                  placeholder="e.g. Fall Armyworm on hybrid maize, Chalimbana groundnut aflatoxin, Soya bean rust"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-stone-700 font-bold mb-1">Detailed Inquiry / Symptoms *</label>
                <textarea
                  rows={4}
                  value={cFormQuestion}
                  onChange={(e) => setCFormQuestion(e.target.value)}
                  placeholder="Describe the problem, when it started, appearance of leaves/stems/pods, acreage affected, and any chemical or cultural practices already attempted..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white leading-relaxed"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="expertPhotoInput"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const res = await compressImageFile(f, { maxWidth: 1024, quality: 0.85 });
                      setCFormImage(res);
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="expertPhotoInput"
                    className="px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4 text-stone-500" />
                    {cFormImage ? 'Change Attached Photo' : 'Attach Field Photo'}
                  </label>
                  {cFormImage && (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Photo Attached
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConsultationForm(false)}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-xs text-stone-600 hover:bg-stone-100 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingConsultation}
                    className="px-6 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                  >
                    {submittingConsultation && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Submit to Extension Officers
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Consultations List */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
              Recent Consultations &amp; Official Extension Responses ({consultations.length})
            </h4>

            {consultations.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-bold text-xs">
                      #{item.consultationNumber}
                    </span>
                    <h4 className="font-bold text-sm text-stone-900">{item.cropOrTopic}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'answered'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status === 'under_review'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.status === 'answered'
                        ? 'Answered by Specialist'
                        : item.status === 'under_review'
                        ? 'Under Extension Review'
                        : 'Pending Extension Review'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-stone-700 leading-relaxed font-normal">
                      <strong>Farmer Question:</strong> {item.question}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-500 pt-1">
                      <span>Farmer: <strong>{item.farmerName}</strong></span>
                      <span>District: <strong>{item.district}</strong> ({item.epa || 'EPA'})</span>
                      <span>Submitted: <strong>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}</strong></span>
                    </div>

                    {/* AI Preliminary Triage Summary */}
                    {item.aiInitialSummary && (
                      <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-700 text-[11px] space-y-1">
                        <strong className="text-stone-900 block flex items-center gap-1 font-semibold">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> AI Initial Triage Summary:
                        </strong>
                        <p>{item.aiInitialSummary}</p>
                      </div>
                    )}
                  </div>

                  {item.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-stone-200 max-h-48">
                      <img
                        src={item.imageUrl}
                        alt="Crop Problem"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Expert Official Response */}
                {item.status === 'answered' && item.expertResponse && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <UserCheck className="w-4 h-4 text-emerald-700" />
                        Official Recommendation from: {item.expertName || 'Extension Development Officer'}
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        {item.expertTitle || 'Agricultural Specialist'}
                      </span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-line text-emerald-900 text-xs sm:text-sm">
                      {item.expertResponse}
                    </p>
                  </div>
                )}

                {/* Admin/Expert Reply Action for Peter or Joshua or Admins */}
                {currentUser?.role === 'admin' && item.status !== 'answered' && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setAnsweringConsultation(item)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
                    >
                      Answer as Agricultural Officer
                    </button>
                  </div>
                )}
              </div>
            ))}

            {consultations.length === 0 && (
              <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
                <UserCheck className="w-12 h-12 text-stone-300 mx-auto" />
                <h3 className="font-bold text-stone-800 text-base">No Consultations Currently Recorded</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Click the button above to submit an agricultural inquiry directly to local extension officers.
                </p>
              </div>
            )}
          </div>

          {/* Answering Modal for Admins / Extension Specialists */}
          {answeringConsultation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <form onSubmit={handleExpertReply} className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setAnsweringConsultation(null)}
                  className="absolute top-5 right-5 p-2 rounded-2xl bg-stone-100 text-stone-500 hover:text-stone-800"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                    Extension Planning Area • Official Advisory Reply
                  </span>
                  <h3 className="text-lg font-black text-stone-900">
                    Respond to Consultation #{answeringConsultation.consultationNumber}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Farmer: {answeringConsultation.farmerName} • Topic: {answeringConsultation.cropOrTopic}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Extension Officer Name *</label>
                    <input
                      type="text"
                      value={replyOfficerName}
                      onChange={(e) => setReplyOfficerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Title / Designation *</label>
                    <input
                      type="text"
                      value={replyOfficerTitle}
                      onChange={(e) => setReplyOfficerTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Official Advisory &amp; Recommended Treatment *
                  </label>
                  <textarea
                    rows={5}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Provide specific, safe pesticide dosage, cultural practices, drying procedures, or harvesting guidelines..."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 focus:outline-emerald-600 text-xs bg-white leading-relaxed"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAnsweringConsultation(null)}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-xs text-stone-600 hover:bg-stone-100 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                  >
                    {submittingReply && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Record Official Reply &amp; Notify Farmer
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: GROUNDED DEPOTS & LIVE SEARCH */}
      {activeTab === 'grounding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Google Maps Grounding: ADMARC Depots & Silos */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Geographical Grounding • Google Maps Platform
                </span>
                <h3 className="text-lg font-extrabold text-stone-900">
                  Find ADMARC Depots &amp; Grain Silos
                </h3>
                <p className="text-xs text-stone-500">
                  Locate verified crop collection depots, NFRA silos, and weighbridges across Malawi's 28 districts.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Select Target District
                  </label>
                  <select
                    value={mapsDistrict}
                    onChange={(e) => setMapsDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-medium text-stone-700 focus:outline-emerald-600"
                  >
                    {MALAWI_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Search Location Query
                  </label>
                  <input
                    type="text"
                    value={mapsQuery}
                    onChange={(e) => setMapsQuery(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-emerald-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRunMapsGrounding()}
                  disabled={mapsLoading}
                  className="w-full py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {mapsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
                  Locate Facilities in {mapsDistrict}
                </button>
              </div>

              {mapsError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {mapsError}
                </div>
              )}

              {mapsResponse && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 space-y-3 leading-relaxed max-h-60 overflow-y-auto">
                  <p className="whitespace-pre-line">{mapsResponse}</p>
                </div>
              )}

              {mapsPlaces.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Verified Google Maps Locations ({mapsPlaces.length}):
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {mapsPlaces.map((pl, i) => (
                      <a
                        key={i}
                        href={pl.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-white border border-stone-200 hover:border-emerald-500 text-xs font-medium text-stone-800 hover:text-emerald-800 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="truncate">{pl.title}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-1" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Google Search Grounding: Live Market & Weather Intelligence */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                  Web Intelligence • Google Search Grounding
                </span>
                <h3 className="text-lg font-extrabold text-stone-900">
                  Live Market Prices &amp; Weather Data
                </h3>
                <p className="text-xs text-stone-500">
                  Query real-time agricultural market bulletins, minimum farmgate price announcements, and rainfall forecasts.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Live Search Query
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-emerald-600"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    'Maize price per 50kg bag Malawi this week',
                    'Groundnut prices Mitundu market Lilongwe',
                    'Department of Climate Change rainfall forecast Malawi',
                    'Ministry of Agriculture minimum farmgate prices 2026',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSearchQuery(chip)}
                      className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-blue-50 hover:text-blue-800 text-[11px] text-stone-600 transition-colors"
                    >
                      {chip.slice(0, 32)}...
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRunSearchGrounding}
                  disabled={searchLoading}
                  className="w-full py-2.5 rounded-2xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search Live Market Intelligence
                </button>
              </div>

              {searchError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {searchError}
                </div>
              )}

              {searchResponse && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 space-y-3 leading-relaxed max-h-60 overflow-y-auto">
                  <p className="whitespace-pre-line">{searchResponse}</p>
                </div>
              )}

              {searchSources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Verified Web Sources ({searchSources.length}):
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {searchSources.map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-white border border-stone-200 hover:border-blue-500 text-xs font-medium text-stone-800 hover:text-blue-800 flex items-center justify-between transition-colors"
                      >
                        <span className="truncate">{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-1" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
