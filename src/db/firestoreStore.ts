import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';

// Load Firebase configuration
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.error('[FirestoreStore] Could not read firebase-applet-config.json:', e);
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreDb: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const COLLECTIONS = [
  'users',
  'categories',
  'commodities',
  'orders',
  'transport_jobs',
  'transactions',
  'revenue_ledger',
  'platform_settings',
  'notifications',
  'audit_logs',
  'support_tickets',
  'password_reset_requests',
  'market_prices',
  'agri_consultations',
  'offline_farmers',
  'sms_notifications',
  'sms_broadcasts',
  'email_notifications',
  'fcm_tokens',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

// Helper to sanitize dates & objects for Firestore
function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore);
  }
  if (val !== null && typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out;
  }
  return val;
}

// Helper to parse Firestore dates back to JS Dates
function parseFromFirestore(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (Array.isArray(val)) {
    return val.map(parseFromFirestore);
  }
  if (typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = parseFromFirestore(v);
    }
    return out;
  }
  return val;
}

// Determine document ID for a table record
export function getDocId(collectionName: string, item: any): string {
  if (collectionName === 'users' && item.uid) {
    return String(item.uid);
  }
  if (collectionName === 'platform_settings' && item.key) {
    return String(item.key);
  }
  if (item.id !== undefined && item.id !== null) {
    return String(item.id);
  }
  if (item.uid) return String(item.uid);
  if (item.key) return String(item.key);
  if (item.orderNumber) return String(item.orderNumber);
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Persist a document directly to Cloud Firestore.
 */
export async function persistDocToFirestore(collectionName: string, item: any): Promise<void> {
  try {
    const docId = getDocId(collectionName, item);
    const sanitized = sanitizeForFirestore(item);
    await setDoc(doc(firestoreDb, collectionName, docId), sanitized, { merge: true });
  } catch (err: any) {
    console.error(`[FirestoreStore] Error saving to Firestore ${collectionName}:`, err?.message || err);
  }
}

/**
 * Delete a document from Cloud Firestore.
 */
export async function deleteDocFromFirestore(collectionName: string, docId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestoreDb, collectionName, docId));
  } catch (err: any) {
    console.error(`[FirestoreStore] Error deleting from Firestore ${collectionName}/${docId}:`, err?.message || err);
  }
}

/**
 * Load all documents for a collection from Cloud Firestore.
 */
export async function fetchCollectionFromFirestore(collectionName: string): Promise<any[]> {
  try {
    const snap = await getDocs(collection(firestoreDb, collectionName));
    const items: any[] = [];
    snap.forEach((d) => {
      const data = parseFromFirestore(d.data());
      items.push(data);
    });
    return items;
  } catch (err: any) {
    console.error(`[FirestoreStore] Error fetching collection ${collectionName}:`, err?.message || err);
    return [];
  }
}

/**
 * Setup Realtime synchronization with Cloud Firestore.
 * Updates the in-memory store whenever a remote instance creates or modifies a document.
 */
export function setupFirestoreRealtimeSync(
  store: Record<string, any[]>,
  onUpdateCallback?: (collectionName: string, data: any) => void
) {
  console.log('[FirestoreStore] Setting up live Cloud Firestore synchronization across instances...');

  for (const collName of COLLECTIONS) {
    try {
      onSnapshot(
        collection(firestoreDb, collName),
        (snap) => {
          let updated = false;
          snap.docChanges().forEach((change) => {
            const data = parseFromFirestore(change.doc.data());
            const docId = change.doc.id;
            const currentList = store[collName] || [];

            if (change.type === 'added' || change.type === 'modified') {
              const idx = currentList.findIndex((item) => {
                if (collName === 'users') {
                  return (data.uid && item.uid === data.uid) || (data.id && item.id === data.id);
                }
                if (collName === 'platform_settings') {
                  return data.key && item.key === data.key;
                }
                return String(item.id) === String(data.id) || getDocId(collName, item) === docId;
              });

              if (idx >= 0) {
                currentList[idx] = { ...currentList[idx], ...data };
              } else {
                currentList.push(data);
              }
              updated = true;
            } else if (change.type === 'removed') {
              const idx = currentList.findIndex((item) => {
                if (collName === 'users') {
                  return (data.uid && item.uid === data.uid) || (data.id && item.id === data.id);
                }
                if (collName === 'platform_settings') {
                  return data.key && item.key === data.key;
                }
                return String(item.id) === String(data.id) || getDocId(collName, item) === docId;
              });
              if (idx >= 0) {
                currentList.splice(idx, 1);
                updated = true;
              }
            }
          });

          if (updated && onUpdateCallback) {
            onUpdateCallback(collName, store[collName]);
          }
        },
        (error) => {
          console.warn(`[FirestoreStore] onSnapshot warning for ${collName}:`, error?.message || error);
        }
      );
    } catch (err: any) {
      console.warn(`[FirestoreStore] Failed to attach listener for ${collName}:`, err?.message || err);
    }
  }
}
