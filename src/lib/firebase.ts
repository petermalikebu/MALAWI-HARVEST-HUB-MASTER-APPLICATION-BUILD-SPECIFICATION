import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
// Firebase client configuration matching firebase-applet-config.json
export const firebaseConfig = {
  projectId: 'chromatic-flame-t83d0',
  appId: '1:1098287344957:web:544ebecfe9a240ed0d2954',
  apiKey: 'AIzaSyAfCVQNKUo8lHzG-OTySgPuDPqplOdGpqI',
  authDomain: 'chromatic-flame-t83d0.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-malawiharvesthub-99d5446a-4240-4f63-bfb7-0fc2ac59896f',
  storageBucket: 'chromatic-flame-t83d0.firebasestorage.app',
  messagingSenderId: '1098287344957',
  measurementId: '',
  oAuthClientId: '1098287344957-eu717i9ukc7glr49b5uhs57nilfiiuri.apps.googleusercontent.com',
  recaptchaSiteKey: '',
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

// Initialize Cloud Firestore with the dedicated database ID provisioned in firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Standardized Operation Types for Firestore telemetry & audits
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
 * Standardized error handling helper conforming to Firestore security rules & diagnosis guidelines
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
 * Validates connection to Firestore upon application initialization
 */
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client is offline. Please check your Firebase network and configuration.');
    }
  }
}

// Perform boot connection check
testConnection().catch(() => {});

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
        serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch (swErr) {
        console.warn('[FCM] SW registration fallback:', swErr);
      }
    }

    const token = await getToken(messaging, {
      serviceWorkerRegistration,
    }).catch(async (getTokenErr) => {
      console.warn('[FCM] Standard getToken error, attempting fallback:', getTokenErr?.message || getTokenErr);
      return null;
    });

    if (token) {
      fetch('/api/messaging/register-token', {
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
