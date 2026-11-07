/**
 * Mberalink Real-World SMS Gateway Dispatch Engine
 * Supports real-time cellular SMS delivery to physical mobile phones in Malawi
 * via Africa's Talking (Malawi/Pan-Africa), Twilio, or Malawian Telecom Webhook.
 */

import { africasTalkingService } from './africasTalkingService.ts';

export interface SmsGatewayResult {
  success: boolean;
  provider: 'africas_talking' | 'textbee' | 'twilio' | 'webhook' | 'device_intent';
  messageId?: string;
  statusText: string;
  rawResponse?: any;
}

export interface SmsGatewayConfig {
  africasTalkingApiKey?: string;
  africasTalkingUsername?: string;
  africasTalkingSenderId?: string;
  textbeeApiKey?: string;
  textbeeDeviceId?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  webhookUrl?: string;
}

// In-memory gateway configuration cache (allows dynamic admin configuration from UI as well)
let cachedConfig: SmsGatewayConfig = {
  africasTalkingApiKey: process.env.AFRICASTALKING_API_KEY || '',
  africasTalkingUsername: process.env.AFRICASTALKING_USERNAME || '',
  africasTalkingSenderId: process.env.AFRICASTALKING_SENDER_ID || '',
  textbeeApiKey: process.env.TEXTBEE_API_KEY || '',
  textbeeDeviceId: process.env.TEXTBEE_DEVICE_ID || '',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  webhookUrl: process.env.SMS_GATEWAY_WEBHOOK_URL || '',
};

export function getSmsGatewayConfig(): SmsGatewayConfig {
  return {
    ...cachedConfig,
    africasTalkingApiKey: cachedConfig.africasTalkingApiKey || process.env.AFRICASTALKING_API_KEY || '',
    africasTalkingUsername: cachedConfig.africasTalkingUsername || process.env.AFRICASTALKING_USERNAME || '',
    africasTalkingSenderId: cachedConfig.africasTalkingSenderId || process.env.AFRICASTALKING_SENDER_ID || '',
    textbeeApiKey: cachedConfig.textbeeApiKey || process.env.TEXTBEE_API_KEY || '',
    textbeeDeviceId: cachedConfig.textbeeDeviceId || process.env.TEXTBEE_DEVICE_ID || '',
    twilioAccountSid: cachedConfig.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: cachedConfig.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumber: cachedConfig.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || '',
    webhookUrl: cachedConfig.webhookUrl || process.env.SMS_GATEWAY_WEBHOOK_URL || '',
  };
}

export function updateSmsGatewayConfig(newConfig: Partial<SmsGatewayConfig>) {
  cachedConfig = {
    ...cachedConfig,
    ...newConfig,
  };
  africasTalkingService.configure({
    apiKey: cachedConfig.africasTalkingApiKey,
    username: cachedConfig.africasTalkingUsername,
    senderId: cachedConfig.africasTalkingSenderId,
  });
}

/**
 * Standardize Malawian mobile numbers (+265...)
 * Converts '0888123456' -> '+265888123456'
 * Converts '999123456' -> '+265999123456'
 */
export function formatMalawiPhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9+]/g, '');

  if (clean.startsWith('+')) {
    return clean;
  }

  if (clean.startsWith('265')) {
    return `+${clean}`;
  }

  if (clean.startsWith('0')) {
    return `+265${clean.slice(1)}`;
  }

  // If 88... or 99... without leading zero
  if (clean.length === 9) {
    return `+265${clean}`;
  }

  return clean;
}

/**
 * Dispatches an automated SMS to a physical mobile device
 */
export async function dispatchRealSms(params: {
  toPhone: string;
  recipientName: string;
  messageText: string;
}): Promise<SmsGatewayResult> {
  const config = getSmsGatewayConfig();
  const formattedPhone = formatMalawiPhoneNumber(params.toPhone);

  // 1. Try Africa's Talking (Premier Pan-African telecom gateway with Malawi coverage)
  if (config.africasTalkingApiKey && config.africasTalkingUsername) {
    try {
      const atResult = await africasTalkingService.sendSms({
        to: formattedPhone,
        message: params.messageText,
        from: config.africasTalkingSenderId,
      });

      const firstDelivery = atResult.deliveries[0];
      const deliveryStatus = firstDelivery?.status || (atResult.success ? 'Sent' : 'Failed');

      return {
        success: atResult.success,
        provider: 'africas_talking',
        messageId: firstDelivery?.messageId || `AT-${Date.now()}`,
        statusText: `Africa's Talking Gateway: ${deliveryStatus} to ${firstDelivery?.formattedNumber || formattedPhone} (${firstDelivery?.carrier || 'Malawi'})`,
        rawResponse: atResult.rawResponse,
      };
    } catch (err: any) {
      console.error("Africa's Talking SMS dispatch failed:", err);
      // Fall through to other providers if configured
    }
  }

  // 2. Try TextBee.dev (100% Free Android SIM Gateway - Ideal for Malawi Airtel & TNM)
  if (config.textbeeApiKey && config.textbeeDeviceId) {
    try {
      const endpoint = `https://api.textbee.dev/api/v1/gateway/devices/${config.textbeeDeviceId}/send-sms`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': config.textbeeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [formattedPhone],
          message: params.messageText,
        }),
      });

      const json = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        provider: 'textbee',
        messageId: json?.data?.id || `TB-${Date.now()}`,
        statusText: response.ok
          ? `TextBee Android Gateway: Dispatched via local SIM to ${formattedPhone}`
          : `TextBee Error: ${json?.message || 'Failed to dispatch via Android device'}`,
        rawResponse: json,
      };
    } catch (err: any) {
      console.error('TextBee SMS dispatch failed:', err);
    }
  }

  // 2. Try Twilio
  if (config.twilioAccountSid && config.twilioAuthToken && config.twilioPhoneNumber) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');

      const bodyData = new URLSearchParams({
        To: formattedPhone,
        From: config.twilioPhoneNumber,
        Body: params.messageText,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyData.toString(),
      });

      const json = await response.json();
      return {
        success: response.ok,
        provider: 'twilio',
        messageId: json?.sid || `TW-${Date.now()}`,
        statusText: response.ok ? `Twilio SMS Dispatched to ${formattedPhone}` : `Twilio Error: ${json?.message}`,
        rawResponse: json,
      };
    } catch (err: any) {
      console.error('Twilio SMS dispatch failed:', err);
    }
  }

  // 3. Try Generic Telecom SMS Webhook (e.g. TNM / Airtel Malawi Bulk SMS API proxy)
  if (config.webhookUrl) {
    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          name: params.recipientName,
          message: params.messageText,
          timestamp: new Date().toISOString(),
        }),
      });

      const json = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        provider: 'webhook',
        messageId: json?.id || `WH-${Date.now()}`,
        statusText: response.ok ? `Telecom Webhook Delivered to ${formattedPhone}` : 'Telecom Webhook returned non-200',
        rawResponse: json,
      };
    } catch (err: any) {
      console.error('Telecom Webhook SMS dispatch failed:', err);
    }
  }

  // 4. Default / Device Handset Intent Mode
  // If no automated server gateway key is plugged into .env yet, the system formats the native device SMS intent
  return {
    success: true,
    provider: 'device_intent',
    statusText: `Ready for Handset Messaging Dispatch: Tap 'Send via Phone SMS App' to dispatch over Airtel/TNM SIM, or plug in Africa's Talking/Twilio credentials in Settings for automatic server broadcasting.`,
  };
}
