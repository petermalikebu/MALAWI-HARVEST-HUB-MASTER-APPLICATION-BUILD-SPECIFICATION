/**
 * Mbewalink Mock Cellular SMS Gateway Service
 * 
 * Simulates high-throughput cellular SMS transmission to TNM and Airtel Malawi subscribers.
 * Used for nationwide administrative announcements, keypad farmer alerts,
 * and district agent field dispatches with zero paid third-party dependencies.
 */

import { getInMemoryStore, saveStoreToDisk } from '../db/index.ts';
import { broadcastEvent } from './realtime.ts';
import { formatMalawiPhoneNumber } from './smsGateway.ts';

export type MalawiTelco = 'TNM' | 'Airtel' | 'Access';

export interface MockSmsReceipt {
  messageId: string;
  recipientPhone: string;
  recipientName: string;
  district: string;
  carrier: MalawiTelco;
  segments: number;
  characterCount: number;
  status: 'delivered' | 'sent' | 'buffered';
  costMwk: number;
  dispatchedAt: string;
  latencyMs: number;
}

export interface BroadcastAnnouncementParams {
  title: string;
  messageText: string;
  targetDistrict: string;
  targetAudience: 'all_farmers' | 'offline_farmers' | 'agents' | 'all';
  language: 'ch' | 'en';
  adminUid: string;
  adminName: string;
}

export interface BroadcastResult {
  success: boolean;
  broadcast: any;
  recipientCount: number;
  stats: {
    tnmCount: number;
    airtelCount: number;
    offlineFarmersCount: number;
    onlineFarmersCount: number;
    agentsCount: number;
    totalSmsSegments: number;
    estimatedCostMwk: number;
  };
  deliveries: MockSmsReceipt[];
  message: string;
}

/**
 * Detects the Malawian telecom carrier from a standard or local phone number
 */
export function detectMalawiCarrier(phone: string): MalawiTelco {
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.includes('88') || clean.includes('89')) {
    return 'TNM';
  }
  if (clean.includes('99') || clean.includes('98')) {
    return 'Airtel';
  }
  if (clean.includes('21') || clean.includes('22')) {
    return 'Access';
  }
  // Default to TNM (Malawi's pioneer carrier)
  return 'TNM';
}

/**
 * Simulates dispatch of a single SMS through the mock cellular gateway
 */
export function dispatchSingleMockSms(params: {
  recipientPhone: string;
  recipientName: string;
  district: string;
  messageText: string;
  recipientType?: 'farmer' | 'offline_farmer' | 'agent' | 'user';
  relatedRecordNumber?: string;
  eventType?: string;
  language?: 'ch' | 'en';
}): MockSmsReceipt {
  const store = getInMemoryStore();
  if (!Array.isArray(store.sms_notifications)) {
    store.sms_notifications = [];
  }

  const formattedPhone = formatMalawiPhoneNumber(params.recipientPhone) || params.recipientPhone;
  const carrier = detectMalawiCarrier(formattedPhone);
  const nextId = store.sms_notifications.length + 1;
  const seq = String(nextId).padStart(4, '0');
  const carrierPrefix = carrier.toUpperCase();
  const messageId = `MOCK-SMS-${carrierPrefix}-${new Date().getFullYear()}-${seq}`;

  const charCount = params.messageText.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));
  const costMwk = segments * 18.5; // Standard MWK rate per segment
  const latencyMs = Math.floor(80 + Math.random() * 120);

  const smsRecord: any = {
    id: nextId,
    smsId: messageId,
    recipientPhone: formattedPhone,
    recipientName: params.recipientName,
    recipientType: params.recipientType || 'offline_farmer',
    district: params.district || 'Lilongwe',
    messageText: params.messageText,
    messageLanguage: params.language || 'ch',
    eventType: params.eventType || 'broadcast_announcement',
    relatedRecordNumber: params.relatedRecordNumber || messageId,
    deliveryStatus: 'delivered',
    failureReason: '',
    carrierNetwork: carrier,
    costMwk,
    latencyMs,
    sentAt: new Date(),
  };

  store.sms_notifications.unshift(smsRecord);

  // Broadcast event for live UI listener
  broadcastEvent('SMS_DELIVERED', smsRecord);

  return {
    messageId,
    recipientPhone: formattedPhone,
    recipientName: params.recipientName,
    district: params.district,
    carrier,
    segments,
    characterCount: charCount,
    status: 'delivered',
    costMwk,
    dispatchedAt: new Date().toISOString(),
    latencyMs,
  };
}

/**
 * Executes a simulated nationwide or district-targeted SMS broadcast announcement
 */
export function simulateBroadcastAnnouncement(params: BroadcastAnnouncementParams): BroadcastResult {
  const store = getInMemoryStore();
  if (!Array.isArray(store.sms_broadcasts)) {
    store.sms_broadcasts = [];
  }

  const isAllDistricts =
    !params.targetDistrict ||
    params.targetDistrict === 'All Districts' ||
    params.targetDistrict.toLowerCase().includes('all') ||
    params.targetDistrict.toLowerCase().includes('nationwide');

  const audience = params.targetAudience || 'all_farmers';
  const lang = params.language === 'en' ? 'en' : 'ch';

  // Target recipients aggregation
  interface RecipientTarget {
    phone: string;
    name: string;
    district: string;
    type: 'farmer' | 'offline_farmer' | 'agent' | 'user';
  }

  const recipients: RecipientTarget[] = [];
  const seenPhones = new Set<string>();

  const addRecipient = (phone: string, name: string, district: string, type: 'farmer' | 'offline_farmer' | 'agent' | 'user') => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 7) return;
    if (!seenPhones.has(clean)) {
      seenPhones.add(clean);
      recipients.push({ phone, name, district, type });
    }
  };

  // 1. Online Users (from store.users)
  const allUsers = store.users || [];
  for (const u of allUsers) {
    const uDistrict = u.assignedDistrict || u.district || 'Lilongwe';
    const matchesDistrict = isAllDistricts || uDistrict.toLowerCase() === params.targetDistrict.toLowerCase();

    if (matchesDistrict) {
      if (audience === 'all_farmers' || audience === 'all') {
        if (u.role === 'farmer' && u.phoneNumber) {
          addRecipient(u.phoneNumber, u.fullName || 'Registered Farmer', uDistrict, 'farmer');
        }
      }
      if (audience === 'agents' || audience === 'all') {
        if (u.role === 'agent') {
          addRecipient(u.phoneNumber || '+265 999 444 321', u.fullName || 'District Agent', uDistrict, 'agent');
        }
      }
    }
  }

  // 2. Keypad Offline Farmers (from store.offline_farmers)
  const offlineList = store.offline_farmers || [];
  for (const f of offlineList) {
    const fDistrict = f.district || 'Lilongwe';
    const matchesDistrict = isAllDistricts || fDistrict.toLowerCase() === params.targetDistrict.toLowerCase();

    if (matchesDistrict) {
      if (audience === 'all_farmers' || audience === 'offline_farmers' || audience === 'all') {
        if (f.phoneNumber) {
          addRecipient(f.phoneNumber, f.fullName || 'Farmer', fDistrict, 'offline_farmer');
        }
      }
    }
  }

  // If no recipients exist in a newly selected district, add simulated sample district stakeholders so broadcast does not return empty
  if (recipients.length === 0) {
    const fallbackDistrict = isAllDistricts ? 'Lilongwe' : params.targetDistrict;
    recipients.push({
      phone: '+265 888 123 456',
      name: `${fallbackDistrict} Farmer Cooperative Lead`,
      district: fallbackDistrict,
      type: 'farmer',
    });
    recipients.push({
      phone: '+265 999 765 432',
      name: `${fallbackDistrict} District Extension Agent`,
      district: fallbackDistrict,
      type: 'agent',
    });
  }

  const broadcastSeq = String(store.sms_broadcasts.length + 1).padStart(3, '0');
  const broadcastId = `BCAST-${new Date().getFullYear()}-${broadcastSeq}`;

  const newBroadcast: any = {
    id: store.sms_broadcasts.length + 1,
    broadcastId,
    title: String(params.title).trim(),
    targetDistrict: isAllDistricts ? 'All 28 Districts (Nationwide)' : params.targetDistrict,
    targetAudience: audience,
    messageText: String(params.messageText).trim(),
    language: lang,
    sentByAdminUid: params.adminUid || 'admin',
    sentByAdminName: params.adminName || 'System Administrator',
    recipientCount: recipients.length,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };

  store.sms_broadcasts.unshift(newBroadcast);

  // Dispatch mock SMS to each recipient
  const deliveries: MockSmsReceipt[] = [];
  let tnmCount = 0;
  let airtelCount = 0;
  let offlineFarmersCount = 0;
  let onlineFarmersCount = 0;
  let agentsCount = 0;
  let totalCost = 0;

  for (const r of recipients) {
    const receipt = dispatchSingleMockSms({
      recipientPhone: r.phone,
      recipientName: r.name,
      district: r.district,
      messageText: newBroadcast.messageText,
      recipientType: r.type,
      relatedRecordNumber: broadcastId,
      eventType: 'broadcast_announcement',
      language: lang,
    });

    deliveries.push(receipt);
    if (receipt.carrier === 'TNM') tnmCount++;
    else airtelCount++;

    if (r.type === 'offline_farmer') offlineFarmersCount++;
    else if (r.type === 'farmer') onlineFarmersCount++;
    else if (r.type === 'agent') agentsCount++;

    totalCost += receipt.costMwk;
  }

  saveStoreToDisk(store);

  // Emit Real-time WebSocket event
  broadcastEvent('SMS_BROADCAST_SENT', {
    broadcast: newBroadcast,
    deliveriesCount: deliveries.length,
    stats: {
      tnmCount,
      airtelCount,
      totalCost,
    },
  });

  const targetDescription = isAllDistricts ? 'all 28 districts nationwide' : `${params.targetDistrict} District`;

  return {
    success: true,
    broadcast: newBroadcast,
    recipientCount: recipients.length,
    stats: {
      tnmCount,
      airtelCount,
      offlineFarmersCount,
      onlineFarmersCount,
      agentsCount,
      totalSmsSegments: deliveries.reduce((acc, d) => acc + d.segments, 0),
      estimatedCostMwk: totalCost,
    },
    deliveries,
    message: `Official SMS announcement dispatched successfully via cellular gateway to ${recipients.length} farmers & agents across ${targetDescription}.`,
  };
}

/**
 * Returns mock gateway status and metrics
 */
export function getMockSmsGatewayStatus() {
  const store = getInMemoryStore();
  const allNotifications = store.sms_notifications || [];
  const broadcasts = store.sms_broadcasts || [];

  const tnmCount = allNotifications.filter((s: any) => s.carrierNetwork === 'TNM').length;
  const airtelCount = allNotifications.filter((s: any) => s.carrierNetwork === 'Airtel').length;

  return {
    gateway: 'Mbewalink Mock Cellular SMS Gateway',
    status: 'online',
    tnmStatus: 'connected',
    airtelStatus: 'connected',
    carrierUptime: '99.9%',
    totalDispatched: allNotifications.length,
    totalBroadcasts: broadcasts.length,
    tnmCount,
    airtelCount,
    lastDispatchedAt: allNotifications[0]?.sentAt || null,
  };
}
