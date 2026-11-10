import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, type Firestore } from 'firebase/firestore';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {} as any;

// Firebase client configuration targeting user project malawi-harvest-hub
export const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'malawi-harvest-hub',
  appId: env.VITE_FIREBASE_APP_ID || '',
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'malawi-harvest-hub.firebaseapp.com',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'malawi-harvest-hub.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Initialize Firebase App instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Google Auth Provider with interactive account chooser
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Cloud Firestore if needed by app components
export const db: Firestore = getFirestore(app);

// Standardized Operation Types for telemetry & audits
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standardized error handling helper conforming to security rules & diagnosis guidelines
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore only if explicitly configured
 */
export async function testConnection(): Promise<void> {
  if (!firebaseConfig.apiKey) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client is offline. Verify your Firebase network configuration.');
    }
  }
}

// Perform boot connection check only if apiKey is present
if (firebaseConfig.apiKey) {
  testConnection().catch(() => {});
}

// --- Firebase Cloud Messaging (FCM) Client Integration ---
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';

let messagingPromise: Promise<Messaging | null> | null = null;

export async function getClientMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        const supported = await isSupported();
        if (!supported) {
          console.info('[FCM] Firebase Messaging is not supported in this browser environment.');
          return null;
        }
        return getMessaging(app);
      } catch (err) {
        console.warn('[FCM] Error checking Firebase Messaging support:', err);
        return null;
      }
    })();
  }
  return messagingPromise;
}

export async function getFcmSubscriptionStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  token: string | null;
}> {
  if (typeof window === 'undefined') {
    return { supported: false, permission: 'unsupported', subscribed: false, token: null };
  }
  const supported = 'Notification' in window && 'serviceWorker' in navigator;
  if (!supported) {
    return { supported: false, permission: 'unsupported', subscribed: false, token: null };
  }
  const storedToken = localStorage.getItem('mbewalink_fcm_token');
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Notification.permission === 'granted' && !!storedToken,
    token: storedToken,
  };
}

export async function requestFcmToken(userInfo?: {
  uid?: string;
  name?: string;
  role?: string;
  district?: string;
}): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const messaging = await getClientMessaging();
    if (!messaging) return null;

    if (!('Notification' in window)) {
      console.warn('[FCM] Notifications not supported in this browser.');
      return null;
    }

    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('[FCM] Push notification permission not granted by user.');
      return null;
    }

    let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        const swQuery = new URLSearchParams({
          projectId: firebaseConfig.projectId || 'malawi-harvest-hub',
          senderId: firebaseConfig.messagingSenderId || '',
          appId: firebaseConfig.appId || '',
          apiKey: firebaseConfig.apiKey || '',
        }).toString();
        serviceWorkerRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${swQuery}`);
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('[FCM] SW registration fallback:', swErr);
      }
    }

    // Retrieve VAPID key from environment variable or local config if available
    const vapidKey =
      (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY ||
      localStorage.getItem('mbewalink_vapid_key') ||
      undefined;

    const tokenOptions: any = {
      serviceWorkerRegistration,
    };
    if (vapidKey) {
      tokenOptions.vapidKey = vapidKey;
    }

    const token = await getToken(messaging, tokenOptions).catch(async (getTokenErr) => {
      console.warn('[FCM] Standard getToken notice, retrying with default config:', getTokenErr?.message || getTokenErr);
      return getToken(messaging, { serviceWorkerRegistration }).catch(() => null);
    });

    if (token) {
      localStorage.setItem('mbewalink_fcm_token', token);
      await fetch('/api/messaging/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          userUid: userInfo?.uid,
          userName: userInfo?.name,
          userRole: userInfo?.role,
          district: userInfo?.district,
          deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          userAgent: navigator.userAgent,
        }),
      }).catch((e) => console.warn('[FCM] Error syncing token to server:', e));
    }

    return token;
  } catch (err: any) {
    console.warn('[FCM] Could not obtain device token:', err?.message || err);
    return null;
  }
}

export async function unsubscribeFcmToken(token?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const currentToken = token || localStorage.getItem('mbewalink_fcm_token');
  if (!currentToken) return true;

  try {
    await fetch('/api/messaging/unregister-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken }),
    }).catch(() => null);
    localStorage.removeItem('mbewalink_fcm_token');
    return true;
  } catch (e) {
    console.warn('[FCM] Unsubscribe error:', e);
    return false;
  }
}

export async function onForegroundMessage(callback: (payload: any) => void): Promise<(() => void) | null> {
  try {
    const messaging = await getClientMessaging();
    if (!messaging) return null;
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  } catch {
    return null;
  }
}

