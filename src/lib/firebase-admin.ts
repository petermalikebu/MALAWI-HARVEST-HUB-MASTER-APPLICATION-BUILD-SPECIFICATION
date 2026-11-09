import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'node:fs';
import path from 'node:path';

function getFirebaseAdminOptions() {
  const targetProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'malawi-harvest-hub';

  // 1. Check for FIREBASE_SERVICE_ACCOUNT_KEY (env var: either inline JSON string or file path)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        return { credential: cert(parsed), projectId: parsed.project_id || targetProjectId };
      } else if (fs.existsSync(raw)) {
        const fileContent = JSON.parse(fs.readFileSync(raw, 'utf8'));
        return { credential: cert(fileContent), projectId: fileContent.project_id || targetProjectId };
      }
    } catch (err) {
      console.warn('[firebase-admin] Error loading FIREBASE_SERVICE_ACCOUNT_KEY:', err);
    }
  }

  // 2. Check for GOOGLE_APPLICATION_CREDENTIALS file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      const fileContent = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
      return { credential: cert(fileContent), projectId: fileContent.project_id || targetProjectId };
    } catch (err) {
      console.warn('[firebase-admin] Error loading GOOGLE_APPLICATION_CREDENTIALS:', err);
    }
  }

  // 3. Check for root service-account.json file
  const rootSaPath = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(rootSaPath)) {
    try {
      const fileContent = JSON.parse(fs.readFileSync(rootSaPath, 'utf8'));
      return { credential: cert(fileContent), projectId: fileContent.project_id || targetProjectId };
    } catch (err) {
      console.warn('[firebase-admin] Error reading service-account.json:', err);
    }
  }

  // 4. Default project configuration for malawi-harvest-hub
  return {
    projectId: targetProjectId,
  };
}

const adminApp: App = !getApps().length
  ? initializeApp(getFirebaseAdminOptions())
  : getApp();

export const adminAuth = getAuth(adminApp);
export const adminMessaging = getMessaging(adminApp);
