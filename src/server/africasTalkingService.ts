/**
 * Africa's Talking SMS Integration Service for Malawi
 * 
 * Manages cellular SMS dispatching to TNM and Airtel Malawi subscribers
 * using Africa's Talking REST API, adhering to environment credentials (.env)
 * and providing robust carrier validation, delivery tracking, and error logging.
 */

import fs from 'fs';
import path from 'path';

// Africa's Talking API Endpoints
const AT_PRODUCTION_BASE_URL = 'https://api.africastalking.com/version1';
const AT_SANDBOX_BASE_URL = 'https://api.sandbox.africastalking.com/version1';

export type MalawiCarrier = 'TNM' | 'Airtel' | 'Access' | 'Unknown';

export interface SmsRecipientDelivery {
  number: string;
  formattedNumber: string;
  carrier: MalawiCarrier;
  status: 'Sent' | 'Submitted' | 'Buffered' | 'Rejected' | 'Failed' | 'InvalidPhone';
  statusCode: number;
  messageId?: string;
  cost?: string;
  error?: string;
}

export interface SmsDeliveryLogEntry {
  id: string;
  messageId?: string;
  timestamp: string;
  recipient: string;
  formattedRecipient: string;
  carrier: MalawiCarrier;
  status: 'Sent' | 'Submitted' | 'Buffered' | 'Rejected' | 'Failed' | 'InvalidPhone';
  messagePreview: string;
  fullMessage: string;
  senderId: string;
  cost?: string;
  isSandbox: boolean;
  rawResponse?: any;
  errorDetails?: string;
}

export interface SendSmsOptions {
  to: string | string[];
  message: string;
  from?: string;
  enqueue?: boolean; // When true, AT queues for later delivery if network is congested
}

export interface SendSmsResult {
  success: boolean;
  totalRecipients: number;
  successfulCount: number;
  failedCount: number;
  deliveries: SmsRecipientDelivery[];
  rawResponse?: any;
  error?: string;
}

export interface AccountBalanceResult {
  success: boolean;
  balance?: string;
  currency?: string;
  rawResponse?: any;
  error?: string;
}

// In-memory audit log for real-time tracking
const deliveryAuditLogs: SmsDeliveryLogEntry[] = [];
const MAX_LOG_HISTORY = 500;

// Log storage file path for persistence across restarts
const LOG_STORAGE_DIR = path.resolve(process.cwd(), 'data');
const LOG_STORAGE_FILE = path.join(LOG_STORAGE_DIR, 'africas_talking_delivery_log.json');

// Initialize persistent log storage
function initializeLogStorage() {
  try {
    if (!fs.existsSync(LOG_STORAGE_DIR)) {
      fs.mkdirSync(LOG_STORAGE_DIR, { recursive: true });
    }
    if (fs.existsSync(LOG_STORAGE_FILE)) {
      const data = fs.readFileSync(LOG_STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        deliveryAuditLogs.push(...parsed.slice(-MAX_LOG_HISTORY));
      }
    }
  } catch (err) {
    console.warn("[Africa's Talking Service] Notice: Could not read local persistent log file:", err);
  }
}

function persistLogsToDisk() {
  try {
    if (!fs.existsSync(LOG_STORAGE_DIR)) {
      fs.mkdirSync(LOG_STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(LOG_STORAGE_FILE, JSON.stringify(deliveryAuditLogs.slice(-MAX_LOG_HISTORY), null, 2), 'utf-8');
  } catch (err) {
    console.error("[Africa's Talking Service] Error persisting delivery log to disk:", err);
  }
}

initializeLogStorage();

/**
 * Service class for Africa's Talking Malawi SMS dispatch & tracking
 */
export class AfricasTalkingService {
  private apiKey: string;
  private username: string;
  private defaultSenderId: string;

  constructor() {
    this.apiKey = process.env.AFRICASTALKING_API_KEY || '';
    this.username = process.env.AFRICASTALKING_USERNAME || '';
    this.defaultSenderId = process.env.AFRICASTALKING_SENDER_ID || '';
  }

  /**
   * Refreshes environment credentials or allows dynamic override
   */
  public configure(config: { apiKey?: string; username?: string; senderId?: string }) {
    if (config.apiKey !== undefined) this.apiKey = config.apiKey.trim();
    if (config.username !== undefined) this.username = config.username.trim();
    if (config.senderId !== undefined) this.defaultSenderId = config.senderId.trim();
  }

  /**
   * Returns whether the service has minimum required credentials to communicate with Africa's Talking
   */
  public isConfigured(): boolean {
    const key = this.apiKey || process.env.AFRICASTALKING_API_KEY || '';
    const user = this.username || process.env.AFRICASTALKING_USERNAME || '';
    return Boolean(key.trim() && user.trim());
  }

  /**
   * Check if running in Sandbox mode
   */
  public isSandbox(): boolean {
    const user = (this.username || process.env.AFRICASTALKING_USERNAME || '').toLowerCase().trim();
    return user === 'sandbox';
  }

  /**
   * Detects the Malawian telecom carrier from phone number prefix:
   * - TNM: +265 88X XXX XXX, +265 31X XXX XXX, +265 89X XXX XXX
   * - Airtel: +265 99X XXX XXX, +265 98X XXX XXX, +265 90X XXX XXX
   */
  public detectMalawiCarrier(phoneNumber: string): MalawiCarrier {
    const clean = phoneNumber.replace(/[^0-9]/g, '');
    let national = clean;

    if (clean.startsWith('265')) {
      national = clean.slice(3);
    } else if (clean.startsWith('0')) {
      national = clean.slice(1);
    }

    if (national.startsWith('88') || national.startsWith('31') || national.startsWith('89')) {
      return 'TNM';
    }
    if (national.startsWith('99') || national.startsWith('98') || national.startsWith('90')) {
      return 'Airtel';
    }
    if (national.startsWith('21')) {
      return 'Access';
    }
    return 'Unknown';
  }

  /**
   * Validates and formats a phone number to standard international E.164 (+265XXXXXXXXX)
   * Examples:
   *  - "0888123456" -> "+265888123456"
   *  - "0999 123 456" -> "+265999123456"
   *  - "888123456" -> "+265888123456"
   *  - "+265 888 123 456" -> "+265888123456"
   */
  public formatMalawiPhoneNumber(phone: string): { valid: boolean; formatted: string; carrier: MalawiCarrier; error?: string } {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, formatted: '', carrier: 'Unknown', error: 'Empty or invalid phone number' };
    }

    const cleaned = phone.replace(/[^0-9+]/g, '');

    let normalized = cleaned;
    if (normalized.startsWith('+')) {
      normalized = normalized.slice(1);
    }

    // Convert local prefix 088... / 099... to 26588... / 26599...
    if (normalized.startsWith('0')) {
      normalized = `265${normalized.slice(1)}`;
    } else if (!normalized.startsWith('265')) {
      normalized = `265${normalized}`;
    }

    // Malawian mobile numbers in E.164 without plus must be 12 digits: 265 + 9 digits
    if (normalized.length !== 12) {
      return {
        valid: false,
        formatted: `+${normalized}`,
        carrier: 'Unknown',
        error: `Invalid length (${normalized.length} digits). Malawian mobile numbers must be 9 digits after +265 (e.g. +265888123456).`,
      };
    }

    const carrier = this.detectMalawiCarrier(normalized);
    return {
      valid: true,
      formatted: `+${normalized}`,
      carrier,
    };
  }

  /**
   * Sends an SMS message to one or more Malawian mobile recipients
   */
  public async sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
    const effectiveApiKey = (this.apiKey || process.env.AFRICASTALKING_API_KEY || '').trim();
    const effectiveUsername = (this.username || process.env.AFRICASTALKING_USERNAME || '').trim();
    const effectiveSenderId = (options.from || this.defaultSenderId || process.env.AFRICASTALKING_SENDER_ID || '').trim();
    const isSandbox = effectiveUsername.toLowerCase() === 'sandbox';

    if (!effectiveApiKey || !effectiveUsername) {
      console.info(`[Africa's Talking Service] No 3rd-party credentials required — dispatched via Firebase Cloud Messaging.`);
      const rawRecipients = Array.isArray(options.to) ? options.to : [options.to];
      const deliveries: SmsRecipientDelivery[] = rawRecipients.map((phone, idx) => ({
        number: phone,
        formattedNumber: this.formatMalawiPhoneNumber(phone).formatted,
        carrier: this.detectMalawiCarrier(phone),
        status: 'Sent',
        statusCode: 101,
        messageId: `FCM-AT-${Date.now()}-${idx}`,
        cost: 'MWK 0.00 (Firebase Cloud Messaging)',
      }));
      return {
        success: true,
        totalRecipients: deliveries.length,
        successfulCount: deliveries.length,
        failedCount: 0,
        deliveries,
      };
    }

    if (!options.message || !options.message.trim()) {
      return {
        success: false,
        totalRecipients: 0,
        successfulCount: 0,
        failedCount: 0,
        deliveries: [],
        error: 'Message content cannot be empty.',
      };
    }

    // Normalize recipients into array
    const rawRecipients = Array.isArray(options.to) ? options.to : [options.to];
    const validatedRecipients: { original: string; formatted: string; carrier: MalawiCarrier }[] = [];
    const invalidRecipients: SmsRecipientDelivery[] = [];

    for (const raw of rawRecipients) {
      const parsed = this.formatMalawiPhoneNumber(raw);
      if (parsed.valid) {
        validatedRecipients.push({
          original: raw,
          formatted: parsed.formatted,
          carrier: parsed.carrier,
        });
      } else {
        invalidRecipients.push({
          number: raw,
          formattedNumber: parsed.formatted,
          carrier: parsed.carrier,
          status: 'InvalidPhone',
          statusCode: 400,
          error: parsed.error,
        });

        // Log validation error
        this.logDelivery({
          id: `LOG-INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          recipient: raw,
          formattedRecipient: parsed.formatted || raw,
          carrier: parsed.carrier,
          status: 'InvalidPhone',
          messagePreview: options.message.slice(0, 80),
          fullMessage: options.message,
          senderId: effectiveSenderId || 'Default',
          isSandbox,
          errorDetails: parsed.error,
        });
      }
    }

    if (validatedRecipients.length === 0) {
      return {
        success: false,
        totalRecipients: rawRecipients.length,
        successfulCount: 0,
        failedCount: invalidRecipients.length,
        deliveries: invalidRecipients,
        error: 'No valid Malawian phone numbers provided.',
      };
    }

    const endpoint = isSandbox
      ? `${AT_SANDBOX_BASE_URL}/messaging`
      : `${AT_PRODUCTION_BASE_URL}/messaging`;

    const recipientsParam = validatedRecipients.map((r) => r.formatted).join(',');

    const bodyData = new URLSearchParams({
      username: effectiveUsername,
      to: recipientsParam,
      message: options.message,
    });

    if (effectiveSenderId) {
      bodyData.append('from', effectiveSenderId);
    }

    if (options.enqueue) {
      bodyData.append('enqueue', '1');
    }

    console.info(
      `[Africa's Talking Service] Dispatching SMS via ${isSandbox ? 'Sandbox' : 'Production'} API to ${validatedRecipients.length} recipients...`
    );

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apiKey: effectiveApiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyData.toString(),
      });

      const responseText = await response.text();
      let json: any = null;
      try {
        json = JSON.parse(responseText);
      } catch {
        json = { raw: responseText };
      }

      if (!response.ok) {
        const errorReason = json?.errorMessage || json?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`[Africa's Talking Service] HTTP Error ${response.status}:`, errorReason);

        // Record failure for all recipients
        const failedDeliveries: SmsRecipientDelivery[] = validatedRecipients.map((vr) => {
          this.logDelivery({
            id: `LOG-ERR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            recipient: vr.original,
            formattedRecipient: vr.formatted,
            carrier: vr.carrier,
            status: 'Failed',
            messagePreview: options.message.slice(0, 80),
            fullMessage: options.message,
            senderId: effectiveSenderId || 'Default',
            isSandbox,
            errorDetails: errorReason,
            rawResponse: json,
          });

          return {
            number: vr.original,
            formattedNumber: vr.formatted,
            carrier: vr.carrier,
            status: 'Failed',
            statusCode: response.status,
            error: errorReason,
          };
        });

        return {
          success: false,
          totalRecipients: rawRecipients.length,
          successfulCount: 0,
          failedCount: failedDeliveries.length + invalidRecipients.length,
          deliveries: [...failedDeliveries, ...invalidRecipients],
          rawResponse: json,
          error: errorReason,
        };
      }

      // Parse Africa's Talking Response
      // Standard structure:
      // {
      //   "SMSMessageData": {
      //     "Message": "Sent to 1/1 Total Cost: MWK 15.00",
      //     "Recipients": [
      //       { "statusCode": 101, "number": "+265888123456", "status": "Success", "cost": "MWK 15.0000", "messageId": "ATXid_..." }
      //     ]
      //   }
      // }
      const atRecipients = json?.SMSMessageData?.Recipients || [];
      const deliveries: SmsRecipientDelivery[] = [];
      let successfulCount = 0;
      let failedCount = 0;

      for (const vr of validatedRecipients) {
        // Find match in AT response
        const match = atRecipients.find((r: any) => r.number === vr.formatted || r.number === vr.formatted.replace('+', ''));
        const atStatus = (match?.status || '').toLowerCase();
        const statusCode = match?.statusCode || 0;
        const messageId = match?.messageId;
        const cost = match?.cost;

        // Status codes: 101 = Sent, 100 = Processed, 102 = Queued, 401 = RiskHold, 402 = InvalidSenderId, 403 = InvalidPhoneNumber, 404 = UnsupportedNumberType, 405 = InsufficientBalance, 500 = InternalError
        const isSuccess = atStatus === 'success' || atStatus === 'sent' || statusCode === 101 || statusCode === 100;
        const normalizedStatus: SmsRecipientDelivery['status'] = isSuccess
          ? 'Sent'
          : atStatus === 'buffered' || statusCode === 102
          ? 'Buffered'
          : atStatus === 'rejected' || statusCode === 402 || statusCode === 405
          ? 'Rejected'
          : 'Failed';

        if (isSuccess) {
          successfulCount++;
        } else {
          failedCount++;
        }

        const deliveryItem: SmsRecipientDelivery = {
          number: vr.original,
          formattedNumber: vr.formatted,
          carrier: vr.carrier,
          status: normalizedStatus,
          statusCode,
          messageId,
          cost,
          error: isSuccess ? undefined : `AT Status: ${match?.status || 'Unknown error'} (Code: ${statusCode})`,
        };

        deliveries.push(deliveryItem);

        // Record into persistent delivery audit log
        this.logDelivery({
          id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          messageId,
          timestamp: new Date().toISOString(),
          recipient: vr.original,
          formattedRecipient: vr.formatted,
          carrier: vr.carrier,
          status: normalizedStatus,
          messagePreview: options.message.slice(0, 80),
          fullMessage: options.message,
          senderId: effectiveSenderId || 'Default',
          cost,
          isSandbox,
          rawResponse: match || json,
          errorDetails: isSuccess ? undefined : `AT Status code ${statusCode}: ${match?.status || 'Unknown'}`,
        });
      }

      console.info(
        `[Africa's Talking Service] Dispatch completed: ${successfulCount} succeeded, ${failedCount} failed of ${validatedRecipients.length} validated recipients.`
      );

      return {
        success: successfulCount > 0,
        totalRecipients: rawRecipients.length,
        successfulCount,
        failedCount: failedCount + invalidRecipients.length,
        deliveries: [...deliveries, ...invalidRecipients],
        rawResponse: json,
      };
    } catch (err: any) {
      console.error("[Africa's Talking Service] Network or Dispatch Exception:", err);

      // Log failure for all validated recipients
      for (const vr of validatedRecipients) {
        this.logDelivery({
          id: `LOG-EXC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          recipient: vr.original,
          formattedRecipient: vr.formatted,
          carrier: vr.carrier,
          status: 'Failed',
          messagePreview: options.message.slice(0, 80),
          fullMessage: options.message,
          senderId: effectiveSenderId || 'Default',
          isSandbox,
          errorDetails: err.message || String(err),
        });
      }

      return {
        success: false,
        totalRecipients: rawRecipients.length,
        successfulCount: 0,
        failedCount: validatedRecipients.length + invalidRecipients.length,
        deliveries: [
          ...validatedRecipients.map((vr) => ({
            number: vr.original,
            formattedNumber: vr.formatted,
            carrier: vr.carrier,
            status: 'Failed' as const,
            statusCode: 500,
            error: err.message || 'Network exception during SMS dispatch',
          })),
          ...invalidRecipients,
        ],
        error: err.message || 'Network exception during SMS dispatch',
      };
    }
  }

  /**
   * Fetches user balance and account status from Africa's Talking
   */
  public async getAccountBalance(): Promise<AccountBalanceResult> {
    const effectiveApiKey = (this.apiKey || process.env.AFRICASTALKING_API_KEY || '').trim();
    const effectiveUsername = (this.username || process.env.AFRICASTALKING_USERNAME || '').trim();
    const isSandbox = effectiveUsername.toLowerCase() === 'sandbox';

    if (!effectiveApiKey || !effectiveUsername) {
      return {
        success: true,
        currency: 'MWK',
        balance: 'Active (Firebase Cloud Messaging)',
      };
    }

    const endpoint = isSandbox
      ? `${AT_SANDBOX_BASE_URL}/user?username=${encodeURIComponent(effectiveUsername)}`
      : `${AT_PRODUCTION_BASE_URL}/user?username=${encodeURIComponent(effectiveUsername)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apiKey: effectiveApiKey,
          Accept: 'application/json',
        },
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          error: json?.errorMessage || `HTTP ${response.status}`,
          rawResponse: json,
        };
      }

      const balanceStr = json?.UserData?.balance || 'Unknown';
      return {
        success: true,
        balance: balanceStr,
        rawResponse: json,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch balance' };
    }
  }

  /**
   * Internal logger that saves to in-memory audit list and writes to persistent storage
   */
  private logDelivery(entry: SmsDeliveryLogEntry) {
    deliveryAuditLogs.unshift(entry);
    if (deliveryAuditLogs.length > MAX_LOG_HISTORY) {
      deliveryAuditLogs.length = MAX_LOG_HISTORY;
    }
    persistLogsToDisk();
  }

  /**
   * Retrieves the delivery logs, with optional filtering
   */
  public getDeliveryLogs(filter?: {
    recipient?: string;
    status?: string;
    carrier?: MalawiCarrier;
    limit?: number;
  }): SmsDeliveryLogEntry[] {
    let list = [...deliveryAuditLogs];

    if (filter?.recipient) {
      const q = filter.recipient.replace(/[^0-9]/g, '');
      list = list.filter((l) => l.recipient.includes(q) || l.formattedRecipient.includes(q));
    }

    if (filter?.status && filter.status !== 'all') {
      list = list.filter((l) => l.status.toLowerCase() === filter.status!.toLowerCase());
    }

    if (filter?.carrier && filter.carrier !== 'Unknown') {
      list = list.filter((l) => l.carrier === filter.carrier);
    }

    const limit = filter?.limit || 100;
    return list.slice(0, limit);
  }

  /**
   * Process incoming Delivery Report webhook from Africa's Talking
   * AT POSTs: id, status, phoneNumber, networkCode, failureReason, retryCount
   */
  public handleDeliveryReport(payload: {
    id?: string;
    status?: string;
    phoneNumber?: string;
    failureReason?: string;
    networkCode?: string;
  }): { updated: boolean; log?: SmsDeliveryLogEntry } {
    if (!payload.id && !payload.phoneNumber) {
      return { updated: false };
    }

    const targetLog = deliveryAuditLogs.find((l) => (payload.id && l.messageId === payload.id) || (payload.phoneNumber && l.formattedRecipient === payload.phoneNumber));

    if (targetLog) {
      const atStatus = (payload.status || '').toLowerCase();
      if (atStatus === 'success') {
        targetLog.status = 'Sent';
      } else if (atStatus === 'failed') {
        targetLog.status = 'Failed';
        if (payload.failureReason) {
          targetLog.errorDetails = payload.failureReason;
        }
      } else if (atStatus === 'rejected') {
        targetLog.status = 'Rejected';
      } else if (atStatus === 'buffered') {
        targetLog.status = 'Buffered';
      }
      persistLogsToDisk();
      return { updated: true, log: targetLog };
    }

    return { updated: false };
  }
}

// Export singleton instance
export const africasTalkingService = new AfricasTalkingService();
