import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'node:fs';
import path from 'node:path';

function getFirebaseConfig() {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.warn('[firebase-admin] Fallback reading config:', err);
  }
  return {
    projectId: 'chromatic-flame-t83d0',
    messagingSenderId: '1098287344957',
  };
}

const firebaseConfig = getFirebaseConfig();

const adminApp = !getApps().length
  ? initializeApp({
      projectId: firebaseConfig.projectId,
    })
  : getApp();

export const adminAuth = getAuth(adminApp);
export const adminMessaging = getMessaging(adminApp);
