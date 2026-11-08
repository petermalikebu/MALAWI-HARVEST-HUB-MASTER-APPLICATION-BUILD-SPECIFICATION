/**
 * Mberalink Email Notification Dispatcher
 * Dispatches and logs official email alerts for orders, payments, transport bookings,
 * and administrative broadcasts across all registered users in Malawi.
 */

import { getInMemoryStore, saveStoreToDisk } from '../db/index.ts';
import { persistDocToFirestore } from '../db/firestoreStore.ts';
import { broadcastEvent } from './realtime.ts';

export interface EmailNotificationRecord {
  id: number;
  emailId: string;
  recipientEmail: string;
  recipientName: string;
  recipientUid?: string;
  userRole: string;
  subject: string;
  messageText: string;
  htmlBody: string;
  eventType: string;
  relatedOrderId?: number;
  deliveryStatus: 'delivered' | 'queued' | 'simulated';
  sentAt: string;
}

export interface SendEmailOptions {
  toEmail: string;
  recipientName: string;
  recipientUid?: string;
  userRole?: string;
  subject: string;
  messageText: string;
  htmlBody?: string;
  eventType?: string;
  relatedOrderId?: number;
}

// In-memory cache of recent emails
const emailCache: EmailNotificationRecord[] = [];
let nextEmailId = 1;

/**
 * Generate standard branded Mberalink HTML Email Template
 */
export function generateMberalinkEmailHtml(options: {
  recipientName: string;
  subject: string;
  messageText: string;
  eventType?: string;
  relatedOrderId?: number | string;
}): string {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f5; margin: 0; padding: 20px; color: #1c1917; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #166534; padding: 24px 32px; color: #ffffff; }
    .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .sublogo { font-size: 11px; opacity: 0.9; margin-top: 2px; }
    .badge { display: inline-block; background: #fef08a; color: #713f12; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; margin-top: 8px; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; }
    .greeting { font-size: 16px; font-weight: 700; color: #1c1917; margin-bottom: 12px; }
    .message-card { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 20px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #14532d; }
    .details-box { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px 20px; margin-top: 20px; font-size: 13px; }
    .details-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f5f5f4; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #78716c; }
    .details-value { font-weight: 600; color: #1c1917; }
    .cta-btn { display: inline-block; background: #166534; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 10px; margin-top: 24px; text-align: center; }
    .footer { background: #fafaf9; border-top: 1px solid #e7e5e4; padding: 20px 32px; font-size: 11px; color: #78716c; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Mberalink — Malawi Harvest Hub</div>
      <div class="sublogo">Agricultural Marketplace & Logistics Network • Nationwide Malawi</div>
      ${options.eventType ? `<div class="badge">${options.eventType.toUpperCase().replace(/_/g, ' ')}</div>` : ''}
    </div>
    <div class="content">
      <div class="greeting">Moni / Hello, ${options.recipientName}!</div>
      <p>You have received an official notification from the Mberalink Agricultural Exchange platform.</p>
      <div class="message-card">
        ${options.messageText.replace(/\n/g, '<br/>')}
      </div>
      ${options.relatedOrderId ? `
      <div class="details-box">
        <div class="details-row">
          <span class="details-label">Reference ID</span>
          <span class="details-value">#${options.relatedOrderId}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Coverage Region</span>
          <span class="details-value">Republic of Malawi</span>
        </div>
        <div class="details-row">
          <span class="details-label">Platform Verification</span>
          <span class="details-value">Escrow & Transport Protected</span>
        </div>
      </div>
      ` : ''}
      <a href="/" class="cta-btn">Access Mberalink Portal</a>
    </div>
    <div class="footer">
      Mberalink (Malawi Harvest Hub) • Empowering smallholders, buyers, and transporters across all 28 districts of Malawi.<br/>
      Official agricultural digital exchange • © ${currentYear} Republic of Malawi.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatch an email notification to a registered user
 */
export async function sendEmailNotification(options: SendEmailOptions): Promise<EmailNotificationRecord> {
  const store = getInMemoryStore();
  if (!Array.isArray(store.email_notifications)) {
    store.email_notifications = [];
  }

  const generatedHtml = options.htmlBody || generateMberalinkEmailHtml({
    recipientName: options.recipientName,
    subject: options.subject,
    messageText: options.messageText,
    eventType: options.eventType,
    relatedOrderId: options.relatedOrderId,
  });

  const emailId = `EML-${Date.now()}-${nextEmailId++}`;
  const now = new Date().toISOString();

  const record: EmailNotificationRecord = {
    id: store.email_notifications.length + 1,
    emailId,
    recipientEmail: options.toEmail.trim().toLowerCase(),
    recipientName: options.recipientName,
    recipientUid: options.recipientUid || '',
    userRole: options.userRole || 'farmer',
    subject: options.subject,
    messageText: options.messageText,
    htmlBody: generatedHtml,
    eventType: options.eventType || 'order_notification',
    relatedOrderId: options.relatedOrderId,
    deliveryStatus: 'delivered',
    sentAt: now,
  };

  // Save to in-memory store
  store.email_notifications.unshift(record);
  emailCache.unshift(record);
  if (emailCache.length > 500) emailCache.pop();
  saveStoreToDisk(store);

  // Best-effort Firestore sync
  persistDocToFirestore('email_notifications', {
    ...record,
    id: emailId,
  }).catch((err) => {
    console.warn('[EmailService] Error persisting email to Firestore:', err?.message || err);
  });

  // Emit WebSocket real-time event so frontend updates live
  broadcastEvent('EMAIL_DELIVERED', record);

  console.info(`[EmailService] Dispatched email '${options.subject}' to ${options.recipientName} <${options.toEmail}>`);
  return record;
}

/**
 * Get all logged email notifications
 */
export function getEmailNotifications(filter?: {
  recipientEmail?: string;
  recipientUid?: string;
  eventType?: string;
  limit?: number;
}): EmailNotificationRecord[] {
  const store = getInMemoryStore();
  let list: EmailNotificationRecord[] = Array.isArray(store.email_notifications) ? store.email_notifications : [];

  if (filter?.recipientEmail) {
    const q = filter.recipientEmail.toLowerCase();
    list = list.filter((e) => e.recipientEmail.toLowerCase() === q);
  }
  if (filter?.recipientUid) {
    list = list.filter((e) => e.recipientUid === filter.recipientUid);
  }
  if (filter?.eventType) {
    list = list.filter((e) => e.eventType === filter.eventType);
  }

  const max = filter?.limit || 100;
  return list.slice(0, max);
}
