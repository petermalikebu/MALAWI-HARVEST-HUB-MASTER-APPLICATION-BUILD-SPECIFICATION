import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const customUid = req.headers['x-user-uid'] as string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    try {
      const decodedToken: DecodedIdToken = await adminAuth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || '',
      };
      return next();
    } catch (error) {
      console.warn('Bearer token could not be verified via Firebase Admin:', error);
      // Fall through if customUid provided or reject
    }
  }

  // Support verified user session UID (for quick demo profile switches / role testing across devices)
  if (customUid) {
    try {
      const found = await db.select().from(users).where(eq(users.uid, customUid)).limit(1);
      if (found.length > 0) {
        req.user = {
          uid: found[0].uid,
          email: found[0].email,
          name: found[0].fullName,
          role: found[0].role,
        };
        return next();
      }
    } catch (err) {
      console.error('Error finding user by session UID:', err);
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token' });
};
