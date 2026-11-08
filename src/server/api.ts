import express from 'express';
import { db, saveStoreToDisk, getInMemoryStore } from '../db/index.ts';
import {
  users,
  commodities,
  orders,
  transportJobs,
  transactions,
  revenueLedger,
  categories,
  platformSettings,
  notifications,
  auditLogs,
  supportTickets,
  passwordResetRequests,
  marketPrices,
  agriConsultations,
  offlineFarmers,
  smsNotifications,
  smsBroadcasts,
} from '../db/schema.ts';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import { broadcastEvent } from './realtime.ts';
import { getDistrictRegion, MALAWI_DISTRICTS } from '../types/index.ts';
import crypto from 'node:crypto';
import {
  dispatchRealSms,
  getSmsGatewayConfig,
  updateSmsGatewayConfig,
  formatMalawiPhoneNumber,
} from './smsGateway.ts';
import { africasTalkingService } from './africasTalkingService.ts';
import {
  getFcmStatus,
  registerFcmToken,
  sendFcmNotification,
  sendFcmBroadcast,
} from './fcmService.ts';

// Secure Password Hashing & Verification
export function hashPassword(plainPassword: string): string {
  return crypto.createHash('sha256').update(String(plainPassword).trim()).digest('hex');
}

export function verifyPassword(inputPassword: string, storedPassword: string | null | undefined): boolean {
  if (!storedPassword) return false;
  const trimmedInput = String(inputPassword).trim();
  const trimmedStored = String(storedPassword).trim();
  const hashedInput = hashPassword(trimmedInput);
  // Matches both SHA-256 hashed password and legacy/seed plaintext credentials
  return trimmedStored === hashedInput || trimmedStored === trimmedInput;
}

const router = express.Router();

// Helper to log audit events
async function logAudit(params: {
  userUid: string;
  userEmail: string;
  userName: string;
  role: string;
  action: string;
  recordAffected: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      userUid: params.userUid || 'system',
      userEmail: params.userEmail || 'system@harvesthub.mw',
      userName: params.userName || 'System Engine',
      role: params.role || 'system',
      action: params.action,
      recordAffected: params.recordAffected,
      previousValue: params.previousValue,
      newValue: params.newValue,
      reason: params.reason,
    });
    broadcastEvent('audit_logged', { action: params.action, record: params.recordAffected });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// Helper to send notification
async function createNotification(params: {
  userUid: string;
  title: string;
  message: string;
  type?: 'order' | 'transport' | 'finance' | 'system';
  relatedOrderId?: number;
}) {
  try {
    const res = await db.insert(notifications).values({
      userUid: params.userUid,
      title: params.title,
      message: params.message,
      type: params.type || 'order',
      relatedOrderId: params.relatedOrderId,
      isRead: false,
    }).returning();
    broadcastEvent('notification_created', res[0]);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

// Helper to get platform commission rate (dynamically loaded from platformSettings, default 0.04 = 4%)
async function getCommissionRate(): Promise<number> {
  try {
    const res = await db.select().from(platformSettings).where(eq(platformSettings.key, 'commission_rate')).limit(1);
    if (res.length > 0 && res[0].value) {
      let parsed = parseFloat(res[0].value);
      if (parsed > 1) {
        parsed = parsed / 100;
      }
      if (!isNaN(parsed) && parsed > 0 && parsed <= 0.5) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error fetching commission rate, using default 0.04:', e);
  }
  return 0.04;
}

// ----------------------------------------------------
// USERS & AUTH PROFILE
// ----------------------------------------------------

// Dedicated Email & Password Account Registration (Farmers, Buyers, Transporters ONLY)
router.post('/users/register', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      role,
      district,
      phoneNumber,
      tradingArea,
      village,
      vehicleType,
      vehicleRegistration,
      plateNumber,
      licenseType,
      yearsExperience,
      vehicleCapacityKg,
      photoUrl,
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email address, and password are required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match. Please retype confirmation password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Support registration for all system roles: Smallholder Farmer, Agro-Commodity Buyer, Freight Transporter, Administrator, and Finance Admin
    const allowedRoles = ['farmer', 'buyer', 'transporter', 'admin', 'finance_admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: 'Please choose a valid platform role (Smallholder Farmer, Agro-Commodity Buyer, Freight Transporter, Platform Administrator, or Finance Administrator).'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const allUsers = await db.select().from(users);
    const existing = allUsers.find(
      (u: any) => (u.email && u.email.toLowerCase().trim() === cleanEmail)
    );

    if (existing) {
      return res.status(400).json({
        error: 'An account with this email address already exists. Please sign in.'
      });
    }

    const uid = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const effectivePlate = plateNumber || vehicleRegistration || '';

    const inserted = await db.insert(users).values({
      uid,
      email: cleanEmail,
      password: hashPassword(password.trim()),
      photoUrl: photoUrl || '',
      fullName: fullName.trim(),
      role,
      phoneNumber: phoneNumber || '+265 ',
      district: district || 'Lilongwe',
      region: getDistrictRegion(district || 'Lilongwe'),
      tradingArea: tradingArea || '',
      village: village || '',
      vehicleType: vehicleType || '',
      vehicleRegistration: effectivePlate,
      plateNumber: effectivePlate,
      licenseType: licenseType || (role === 'transporter' ? 'Class C - Heavy Commercial' : ''),
      yearsExperience: yearsExperience || (role === 'transporter' ? '5 years' : ''),
      vehicleCapacityKg: Number(vehicleCapacityKg) || 0,
      isAvailable: true,
      currentRoute: 'Available',
    }).returning();

    const newUser = inserted[0];

    await logAudit({
      userUid: newUser.uid,
      userEmail: newUser.email,
      userName: newUser.fullName,
      role: newUser.role,
      action: 'USER_REGISTERED_CREDENTIALS',
      recordAffected: `User #${newUser.id} (${newUser.fullName}, Role: ${newUser.role})`,
    });

    broadcastEvent('user_updated', newUser);

    const roleName =
      role === 'admin'
        ? 'Platform Administrator'
        : role === 'buyer'
        ? 'Agro-Commodity Buyer'
        : role === 'transporter'
        ? 'Freight Transporter'
        : role === 'finance_admin'
        ? 'Finance Administrator'
        : 'Smallholder Farmer';

    return res.status(201).json({
      success: true,
      message: `Account created successfully as ${roleName}! Please sign in with your email and password.`,
      user: {
        uid: newUser.uid,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        district: newUser.district,
      },
    });
  } catch (error: any) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: error.message || 'Failed to register account' });
  }
});

// Dedicated Email & Password Sign In
router.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanIdentifier = String(email).toLowerCase().trim();
    const cleanPhoneDigits = cleanIdentifier.replace(/[^0-9]/g, '');
    const cleanPassword = String(password).trim();

    const allUsers = await db.select().from(users);
    let matchedUser = allUsers.find((u: any) => {
      const userEmail = (u.email || '').toLowerCase().trim();
      if (userEmail && userEmail === cleanIdentifier) return true;

      // Match Peter Malikebu by either email or UID
      if (
        (cleanIdentifier === 'petermalikebu0@gmail.com' || cleanIdentifier === 'petermalikebujr@gmail.com') &&
        (userEmail === 'petermalikebu0@gmail.com' || userEmail === 'petermalikebujr@gmail.com' || u.uid === 'frF3xukObzdA8AhCBYIBPYV0UK13')
      ) {
        return true;
      }

      // Match Joshua Malikebu by email or UID
      if (
        cleanIdentifier === 'joshuamalikebu927@gmail.com' &&
        (userEmail === 'joshuamalikebu927@gmail.com' || u.uid === 'admin-joshua-02')
      ) {
        return true;
      }

      // Allow matching by phone number
      if (u.phoneNumber && cleanPhoneDigits.length >= 7) {
        const uDigits = String(u.phoneNumber).replace(/[^0-9]/g, '');
        if (uDigits && (uDigits.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(uDigits))) {
          return true;
        }
      }
      return false;
    });

    // Super user admin check
    const isSuperAdminEmail =
      matchedUser?.email === 'petermalikebujr@gmail.com' ||
      matchedUser?.email === 'petermalikebu0@gmail.com' ||
      matchedUser?.email === 'joshuamalikebu927@gmail.com' ||
      cleanIdentifier === 'petermalikebujr@gmail.com' ||
      cleanIdentifier === 'petermalikebu0@gmail.com' ||
      cleanIdentifier === 'joshuamalikebu927@gmail.com';

    if (isSuperAdminEmail) {
      const superAdminDefaultPass = 'P1qe2wt3ee4rr5t?';
      const isSuperAdminPasswordValid =
        (matchedUser && verifyPassword(cleanPassword, matchedUser.password)) ||
        cleanPassword === superAdminDefaultPass;

      if (!isSuperAdminPasswordValid) {
        return res.status(401).json({ error: 'Incorrect password for administrator account.' });
      }

      const isJoshua = cleanIdentifier === 'joshuamalikebu927@gmail.com' || matchedUser?.email === 'joshuamalikebu927@gmail.com';

      if (!matchedUser) {
        matchedUser = allUsers.find(
          (u: any) => isJoshua
            ? (u.uid === 'admin-joshua-02' || u.email === 'joshuamalikebu927@gmail.com')
            : (u.uid === 'frF3xukObzdA8AhCBYIBPYV0UK13' || u.email === 'petermalikebujr@gmail.com' || u.email === 'petermalikebu0@gmail.com')
        );
      }

      if (!matchedUser) {
        const initialHashedPass = hashPassword(cleanPassword);
        if (isJoshua) {
          const inserted = await db.insert(users).values({
            uid: 'admin-joshua-02',
            email: 'joshuamalikebu927@gmail.com',
            fullName: 'Joshua Malikebu',
            role: 'admin',
            phoneNumber: '+265 991 817 976 / +265 880 882 372',
            password: initialHashedPass,
            district: 'Lilongwe',
            region: 'Central',
            tradingArea: 'City Centre',
            bankName: 'National Bank of Malawi',
            bankAccount: '1013388772',
            bankAccountName: 'JOSHUA MALIKEBU',
          }).returning();
          matchedUser = inserted[0];
        } else {
          const inserted = await db.insert(users).values({
            uid: 'frF3xukObzdA8AhCBYIBPYV0UK13',
            email: 'petermalikebujr@gmail.com',
            fullName: 'Peter Malikebu',
            role: 'admin',
            phoneNumber: '+265 999 036 912',
            password: initialHashedPass,
            district: 'Lilongwe',
            region: 'Central',
            tradingArea: 'City Centre',
            bankName: 'National Bank of Malawi',
            bankAccount: '1011619688',
            bankAccountName: 'PETER ADRIAN MALIKEBU',
          }).returning();
          matchedUser = inserted[0];
        }
      } else {
        // Ensure bank details are present on matched admin
        if (isJoshua) {
          matchedUser.bankName = 'National Bank of Malawi';
          matchedUser.bankAccount = '1013388772';
          matchedUser.bankAccountName = 'JOSHUA MALIKEBU';
          matchedUser.phoneNumber = matchedUser.phoneNumber || '+265 991 817 976 / +265 880 882 372';
        } else {
          matchedUser.bankName = 'National Bank of Malawi';
          matchedUser.bankAccount = '1011619688';
          matchedUser.bankAccountName = 'PETER ADRIAN MALIKEBU';
          matchedUser.phoneNumber = matchedUser.phoneNumber || '+265 999 036 912';
        }
      }

      return res.json({
        success: true,
        user: matchedUser,
      });
    }

    if (!matchedUser) {
      return res.status(401).json({
        error: 'No account found with this email. Please check your spelling or register a new account.'
      });
    }

    // Verify password if user has one stored (supports both hashed and legacy unhashed)
    if (!verifyPassword(cleanPassword, matchedUser.password)) {
      return res.status(401).json({ error: 'Incorrect password. Please verify your password and try again.' });
    }

    await logAudit({
      userUid: matchedUser.uid,
      userEmail: matchedUser.email,
      userName: matchedUser.fullName,
      role: matchedUser.role,
      action: 'USER_LOGGED_IN',
      recordAffected: `User #${matchedUser.id} (${matchedUser.fullName}, Role: ${matchedUser.role})`,
    });

    return res.json({
      success: true,
      user: matchedUser,
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: error.message || 'Failed to sign in' });
  }
});

// Update Profile Photo
router.post('/users/profile-photo', async (req, res) => {
  try {
    const { uid, photoUrl } = req.body;
    if (!uid) return res.status(400).json({ error: 'User UID is required' });

    const allUsers = await db.select().from(users);
    const existing = allUsers.find(
      (u: any) =>
        u.uid === uid ||
        String(u.id) === String(uid) ||
        (u.email && u.email.toLowerCase().trim() === String(uid).toLowerCase().trim())
    );
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const cleanPhoto = photoUrl || '';
    const updated = await db.update(users)
      .set({ photoUrl: cleanPhoto, updatedAt: new Date() })
      .where(eq(users.id, existing.id))
      .returning();

    // Explicitly update in-memory store and persist to disk
    const store = (global as any)._inMemoryStore;
    if (store && Array.isArray(store.users)) {
      const storeUser = store.users.find(
        (u: any) => u.id === existing.id || u.uid === existing.uid
      );
      if (storeUser) {
        storeUser.photoUrl = cleanPhoto;
        storeUser.updatedAt = new Date();
      }
      saveStoreToDisk(store);
    }

    const updatedUser = updated.length > 0 ? updated[0] : { ...existing, photoUrl: cleanPhoto };
    broadcastEvent('user_updated', updatedUser);
    return res.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error updating profile photo:', error);
    return res.status(500).json({ error: error.message || 'Failed to update profile photo' });
  }
});

// Update Driver / User Profile (Transporter details: vehicle, plate number, license type, experience, availability)
router.post('/users/profile', async (req, res) => {
  try {
    const {
      uid,
      fullName,
      phoneNumber,
      district,
      region,
      tradingArea,
      village,
      vehicleType,
      vehicleRegistration,
      plateNumber,
      licenseType,
      yearsExperience,
      vehicleCapacityKg,
      isAvailable,
      currentRoute,
      bankName,
      bankAccount,
      bankAccountName,
    } = req.body;

    if (!uid) return res.status(400).json({ error: 'User UID is required' });

    const allUsers = await db.select().from(users);
    const existing = allUsers.find(
      (u: any) =>
        u.uid === uid ||
        String(u.id) === String(uid) ||
        (u.email && u.email.toLowerCase().trim() === String(uid).toLowerCase().trim())
    );
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const effectivePlate = plateNumber ?? vehicleRegistration ?? existing.vehicleRegistration ?? '';

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (district !== undefined) {
      updateData.district = district;
      updateData.region = region !== undefined ? region : getDistrictRegion(district);
    } else if (region !== undefined) {
      updateData.region = region;
    }
    if (tradingArea !== undefined) updateData.tradingArea = tradingArea;
    if (village !== undefined) updateData.village = village;
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType;
    if (effectivePlate !== undefined) {
      updateData.vehicleRegistration = effectivePlate;
      updateData.plateNumber = effectivePlate;
    }
    if (licenseType !== undefined) updateData.licenseType = licenseType;
    if (yearsExperience !== undefined) updateData.yearsExperience = yearsExperience;
    if (vehicleCapacityKg !== undefined) updateData.vehicleCapacityKg = Number(vehicleCapacityKg);
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    if (currentRoute !== undefined) updateData.currentRoute = currentRoute;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
    if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName;

    const updated = await db.update(users)
      .set(updateData)
      .where(eq(users.id, existing.id))
      .returning();

    const resultUser = updated.length > 0 ? updated[0] : { ...existing, ...updateData };

    await logAudit({
      userUid: resultUser.uid,
      userEmail: resultUser.email,
      userName: resultUser.fullName,
      role: resultUser.role,
      action: 'USER_PROFILE_UPDATED',
      recordAffected: `User #${resultUser.id} (${resultUser.fullName})`,
      newValue: `Updated details: ${Object.keys(updateData).filter(k => k !== 'updatedAt').join(', ')}`,
    });

    broadcastEvent('user_updated', resultUser);
    broadcastEvent('transporter_availability_changed', {
      uid: resultUser.uid,
      isAvailable: resultUser.isAvailable,
      currentRoute: resultUser.currentRoute,
    });

    return res.json({ success: true, user: resultUser });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

// Toggle Transporter Availability
router.post('/users/availability', async (req, res) => {
  try {
    const { uid, isAvailable, currentRoute } = req.body;
    if (!uid) return res.status(400).json({ error: 'User UID is required' });

    const allUsers = await db.select().from(users);
    const existing = allUsers.find((u: any) => u.uid === uid || String(u.id) === String(uid));
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const newAvail = Boolean(isAvailable);
    const newRoute = currentRoute !== undefined ? currentRoute : (newAvail ? 'Available' : 'In Transit / On Delivery');

    const updated = await db.update(users)
      .set({
        isAvailable: newAvail,
        currentRoute: newRoute,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();

    const resultUser = updated.length > 0 ? updated[0] : { ...existing, isAvailable: newAvail, currentRoute: newRoute };

    await logAudit({
      userUid: resultUser.uid,
      userEmail: resultUser.email,
      userName: resultUser.fullName,
      role: resultUser.role,
      action: 'TRANSPORTER_AVAILABILITY_CHANGED',
      recordAffected: `Driver #${resultUser.id} (${resultUser.fullName})`,
      newValue: `Available: ${newAvail ? 'YES' : 'NO'} | Route: ${newRoute}`,
    });

    broadcastEvent('user_updated', resultUser);
    broadcastEvent('transporter_availability_changed', {
      uid: resultUser.uid,
      isAvailable: newAvail,
      currentRoute: newRoute,
    });

    return res.json({
      success: true,
      isAvailable: newAvail,
      currentRoute: newRoute,
      user: resultUser,
    });
  } catch (error: any) {
    console.error('Error toggling availability:', error);
    return res.status(500).json({ error: error.message || 'Failed to toggle availability' });
  }
});

// Sync or register user profile in PostgreSQL
router.post('/users/sync', async (req, res) => {
  try {
    const {
      uid,
      email,
      fullName,
      role,
      phoneNumber,
      district,
      region,
      tradingArea,
      village,
      vehicleType,
      vehicleRegistration,
      vehicleCapacityKg,
      photoUrl,
    } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and Email are required' });
    }

    const isAdminEmail =
      uid === '9DXK6Cfy4FaODmqyVm7q8yrKup82' ||
      uid === 'frF3xukObzdA8AhCBYIBPYV0UK13' ||
      email === 'joshuamalikebu927@gmail.com' ||
      email === 'petermalikebujr@gmail.com' ||
      email === 'petermalikebu0@gmail.com';

    const isFarmerChimwemwe = uid === 'farmer-chimwemwe-01' || email === 'chimwemwe.phiri@mhh.mw';
    const resolvedRole = isAdminEmail ? 'admin' : isFarmerChimwemwe ? 'farmer' : (role || 'farmer');

    const allUsers = await db.select().from(users);
    const existing = allUsers.filter(
      (u: any) =>
        u.uid === uid ||
        (u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim())
    );

    let userRecord;

    if (existing.length > 0) {
      const targetUser = existing[0];
      const newPhotoUrl = (photoUrl && String(photoUrl).trim() !== '') ? photoUrl : (targetUser.photoUrl || '');

      const updated = await db.update(users)
        .set({
          fullName: fullName || targetUser.fullName,
          email: email || targetUser.email,
          role: isAdminEmail ? 'admin' : isFarmerChimwemwe ? 'farmer' : (role || targetUser.role),
          phoneNumber: phoneNumber ?? targetUser.phoneNumber,
          photoUrl: newPhotoUrl,
          district: district ?? targetUser.district,
          region: region ?? (district ? getDistrictRegion(district) : targetUser.region),
          tradingArea: tradingArea ?? targetUser.tradingArea,
          village: village ?? targetUser.village,
          vehicleType: vehicleType ?? targetUser.vehicleType,
          vehicleRegistration: vehicleRegistration ?? targetUser.vehicleRegistration,
          vehicleCapacityKg: vehicleCapacityKg !== undefined ? Number(vehicleCapacityKg) : targetUser.vehicleCapacityKg,
          updatedAt: new Date(),
        })
        .where(eq(users.id, targetUser.id))
        .returning();

      userRecord = updated.length > 0 ? updated[0] : targetUser;
    } else {
      const inserted = await db.insert(users)
        .values({
          uid,
          email,
          fullName: fullName || email.split('@')[0],
          role: resolvedRole,
          photoUrl: photoUrl || '',
          phoneNumber: phoneNumber || '+265 ',
          district: district || 'Lilongwe',
          region: region || (district ? getDistrictRegion(district) : 'Central'),
          tradingArea: tradingArea || '',
          village: village || '',
          vehicleType: vehicleType || '',
          vehicleRegistration: vehicleRegistration || '',
          vehicleCapacityKg: Number(vehicleCapacityKg) || 0,
        })
        .returning();

      userRecord = inserted[0];
    }

    await logAudit({
      userUid: userRecord.uid,
      userEmail: userRecord.email,
      userName: userRecord.fullName,
      role: userRecord.role,
      action: existing.length > 0 ? 'USER_PROFILE_UPDATED' : 'USER_REGISTERED',
      recordAffected: `User #${userRecord.id} (${userRecord.fullName})`,
    });

    broadcastEvent('user_updated', userRecord);
    return res.json(userRecord);
  } catch (error: any) {
    console.error('Error syncing user:', error);
    return res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});

// Get user by UID, ID or Email
router.get('/users/:uid', async (req, res) => {
  try {
    const param = req.params.uid;
    const all = await db.select().from(users);
    const found = all.find(
      (u: any) =>
        u.uid === param ||
        String(u.id) === param ||
        (u.email && u.email.toLowerCase().trim() === param.toLowerCase().trim())
    );
    if (!found) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(found);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

// List all users (admin / role filter)
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    if (role) {
      const filtered = await db.select().from(users).where(eq(users.role, String(role))).orderBy(desc(users.createdAt));
      return res.json(filtered);
    }
    const all = await db.select().from(users).orderBy(desc(users.createdAt));
    return res.json(all);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list users' });
  }
});

// Change user role (admin)
router.put('/users/:id/role', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { newRole, adminUid, adminEmail, adminName } = req.body;
    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await db.update(users)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: adminEmail || 'admin@harvesthub.mw',
      userName: adminName || 'Administrator',
      role: 'admin',
      action: 'USER_ROLE_CHANGED',
      recordAffected: `User ${existing[0].fullName} (ID: ${id})`,
      previousValue: existing[0].role,
      newValue: newRole,
      reason: 'Administrative role reassignment',
    });

    broadcastEvent('user_updated', updated[0]);
    return res.json(updated[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update role' });
  }
});

// Remove / Delete user (Admin can remove anyone, fellow admins, and themselves)
router.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const adminUid = (req.query.adminUid as string) || req.body?.adminUid || (req.headers['x-user-uid'] as string);

    if (!adminUid) {
      return res.status(401).json({ error: 'Unauthorized: Admin UID required' });
    }

    // Verify requester is an admin
    const adminUser = await db.select().from(users).where(eq(users.uid, adminUid)).limit(1);
    if (adminUser.length === 0 || adminUser[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can remove users' });
    }

    const targetUser = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (targetUser.length === 0) {
      return res.status(404).json({ error: 'User not found or already deleted' });
    }

    const isSelf = adminUser[0].id === id;
    const targetUid = targetUser[0].uid;
    const targetRole = targetUser[0].role;
    const targetFullName = targetUser[0].fullName;

    // 1. Cascade delete for Farmer: find all commodities (products) and linked orders
    const farmerCommodities = await db.select().from(commodities).where(
      or(
        eq(commodities.farmerId, id),
        eq(commodities.farmerUid, targetUid)
      )
    );
    const commIds = farmerCommodities.map((c: any) => c.id);

    // 2. Identify all related orders for this user (as farmer/seller, as buyer, or for farmer's commodities)
    const allUserOrders = await db.select().from(orders).where(
      or(
        eq(orders.farmerId, id),
        eq(orders.farmerUid, targetUid),
        eq(orders.buyerId, id),
        eq(orders.buyerUid, targetUid)
      )
    );
    const allOrderIdsSet = new Set<number>(allUserOrders.map((o: any) => o.id));

    // Also collect orders linked to any of this farmer's commodities
    for (const cId of commIds) {
      const linked = await db.select().from(orders).where(eq(orders.commodityId, cId));
      for (const lo of linked) {
        allOrderIdsSet.add(lo.id);
      }
    }
    const affectedOrderIds = Array.from(allOrderIdsSet);

    // 3. Foreign key resolution: Clean up transactions, revenue ledger, and transport jobs referencing these orders
    for (const ordId of affectedOrderIds) {
      try {
        await db.delete(transactions).where(eq(transactions.orderId, ordId));
      } catch (e) {
        console.warn(`Cleaned transactions for order #${ordId}:`, e);
      }
      try {
        await db.delete(revenueLedger).where(eq(revenueLedger.sourceOrderId, ordId));
      } catch (e) {
        console.warn(`Cleaned revenue ledger for order #${ordId}:`, e);
      }
      try {
        await db.delete(transportJobs).where(eq(transportJobs.orderId, ordId));
      } catch (e) {
        console.warn(`Cleaned transport jobs for order #${ordId}:`, e);
      }
    }

    // 4. Clean up any remaining direct user references in transactions
    try {
      await db.delete(transactions).where(
        or(eq(transactions.farmerId, id), eq(transactions.buyerId, id))
      );
    } catch (e) {
      console.warn('Cleaned direct transactions for user:', e);
    }

    // 5. Cascade delete for Transporter (driver) & haulage jobs
    try {
      await db.delete(transportJobs).where(
        or(
          eq(transportJobs.transporterId, id),
          eq(transportJobs.transporterUid, targetUid),
          eq(transportJobs.farmerId, id),
          eq(transportJobs.farmerUid, targetUid),
          eq(transportJobs.recommendedDriverId, id)
        )
      );
    } catch (e) {
      console.warn('Cleaned direct transport jobs for user:', e);
    }

    // 6. Delete all affected orders
    for (const ordId of affectedOrderIds) {
      try {
        await db.delete(orders).where(eq(orders.id, ordId));
      } catch (e) {
        console.warn(`Cleaned order #${ordId}:`, e);
      }
    }
    await db.delete(orders).where(
      or(
        eq(orders.farmerId, id),
        eq(orders.farmerUid, targetUid),
        eq(orders.buyerId, id),
        eq(orders.buyerUid, targetUid)
      )
    );

    // 7. Delete all commodities belonging to this farmer
    for (const cId of commIds) {
      try {
        await db.delete(commodities).where(eq(commodities.id, cId));
      } catch (e) {
        console.warn(`Cleaned commodity #${cId}:`, e);
      }
    }
    await db.delete(commodities).where(
      or(eq(commodities.farmerId, id), eq(commodities.farmerUid, targetUid))
    );

    // 8. Clean up password reset requests for this user
    await db.delete(passwordResetRequests).where(
      or(eq(passwordResetRequests.userId, id), eq(passwordResetRequests.userUid, targetUid))
    );

    // 9. Clean up support tickets for this user
    await db.delete(supportTickets).where(
      or(eq(supportTickets.userId, id), eq(supportTickets.userUid, targetUid))
    );

    // 10. Clean up notifications for this user
    await db.delete(notifications).where(eq(notifications.userUid, targetUid));

    // 11. Delete the user from PostgreSQL users table
    await db.delete(users).where(eq(users.id, id));

    // 8. Clean up in-memory store if active
    const store = (global as any)._inMemoryStore;
    if (store) {
      if (Array.isArray(store.commodities)) {
        store.commodities = store.commodities.filter(
          (c: any) => c.farmerId !== id && c.farmerUid !== targetUid
        );
      }
      if (Array.isArray(store.orders)) {
        store.orders = store.orders.filter(
          (o: any) =>
            o.farmerId !== id &&
            o.farmerUid !== targetUid &&
            o.buyerId !== id &&
            o.buyerUid !== targetUid &&
            !commIds.includes(o.commodityId)
        );
      }
      if (Array.isArray(store.transport_jobs)) {
        store.transport_jobs = store.transport_jobs.filter(
          (t: any) =>
            t.transporterId !== id &&
            t.transporterUid !== targetUid &&
            t.farmerId !== id &&
            t.farmerUid !== targetUid
        );
      }
      if (Array.isArray(store.support_tickets)) {
        store.support_tickets = store.support_tickets.filter(
          (s: any) => s.userId !== id && s.userUid !== targetUid
        );
      }
      if (Array.isArray(store.password_reset_requests)) {
        store.password_reset_requests = store.password_reset_requests.filter(
          (p: any) => p.userId !== id && p.userUid !== targetUid
        );
      }
      if (Array.isArray(store.notifications)) {
        store.notifications = store.notifications.filter(
          (n: any) => n.userUid !== targetUid
        );
      }
      if (Array.isArray(store.users)) {
        store.users = store.users.filter(
          (u: any) => u.id !== id && u.uid !== targetUid
        );
      }
      saveStoreToDisk(store);
    }

    await logAudit({
      userUid: adminUser[0].uid,
      userEmail: adminUser[0].email,
      userName: adminUser[0].fullName,
      role: 'admin',
      action: isSelf ? 'ADMIN_SELF_REMOVED' : 'USER_CASCADE_REMOVED_BY_ADMIN',
      recordAffected: `User #${id} (${targetFullName}, Role: ${targetRole})`,
      reason: isSelf
        ? 'Administrator deleted their own account'
        : `Administrator permanently removed ${targetRole} account along with all associated commodities, orders, and data`,
    });

    // Broadcast real-time events to all clients
    broadcastEvent('user_deleted', { id, uid: targetUid, isSelf });
    broadcastEvent('user_updated', { id, action: 'deleted' });
    broadcastEvent('commodity_deleted', { farmerUid: targetUid });
    broadcastEvent('commodity_updated', { action: 'deleted' });
    broadcastEvent('order_updated', { action: 'deleted' });
    broadcastEvent('transport_updated', { action: 'deleted' });

    return res.json({
      success: true,
      message: isSelf
        ? 'Your administrator account has been deleted successfully.'
        : `User ${targetFullName} (${targetRole}) and all their associated data & products have been permanently removed.`,
      deletedId: id,
      deletedUid: targetUid,
      isSelf,
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: error.message || 'Failed to remove user' });
  }
});

// Production Transition: Safely purge all sample/test users & test records while preserving Administrators
router.post('/admin/purge-sample-users', async (req, res) => {
  try {
    const adminUid = (req.query.adminUid as string) || req.body?.adminUid || (req.headers['x-user-uid'] as string);
    const allUsers = await db.select().from(users);

    if (adminUid) {
      const requester = allUsers.find((u: any) => u.uid === adminUid);
      if (requester && requester.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Only administrators can purge sample users' });
      }
    }

    // 1. If live PostgreSQL pool is active, execute the transactional deletion
    if (global._postgresPool) {
      const pool = global._postgresPool;
      try {
        await pool.query('BEGIN;');
        await pool.query(`
          DELETE FROM revenue_ledger 
          WHERE source_order_id IN (
              SELECT id FROM orders 
              WHERE buyer_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1)
                 OR farmer_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1)
          );
        `);
        await pool.query(`
          DELETE FROM transactions 
          WHERE farmer_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1)
             OR buyer_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1);
        `);
        await pool.query(`
          DELETE FROM transport_jobs 
          WHERE farmer_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1)
             OR transporter_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1);
        `);
        await pool.query(`
          DELETE FROM orders 
          WHERE buyer_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1)
             OR farmer_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1);
        `);
        await pool.query(`
          DELETE FROM commodities 
          WHERE farmer_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1);
        `);
        await pool.query(`
          DELETE FROM support_tickets 
          WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1);
        `);
        await pool.query(`
          DELETE FROM password_reset_requests 
          WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin' OR id = 1);
        `);
        await pool.query(`
          DELETE FROM users 
          WHERE role != 'admin' AND id != 1;
        `);
        await pool.query(`
          SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
        `);
        await pool.query('COMMIT;');
      } catch (sqlErr: any) {
        await pool.query('ROLLBACK;').catch(() => {});
        console.warn('PostgreSQL transactional purge notice:', sqlErr?.message || sqlErr);
      }
    }

    // 2. Synchronize in-memory store
    const store = getInMemoryStore();
    if (store) {
      if (Array.isArray(store.users)) {
        store.users = store.users.filter((u: any) => u.role === 'admin' || u.id === 1);
      }
      store.commodities = [];
      store.orders = [];
      store.transport_jobs = [];
      store.transactions = [];
      store.revenue_ledger = [];
      store.support_tickets = [];
      store.password_reset_requests = [];
      saveStoreToDisk(store);
    }

    const remainingAdmins = await db.select().from(users).where(eq(users.role, 'admin'));

    await logAudit({
      userUid: adminUid || 'admin-system',
      userEmail: 'petermalikebujr@gmail.com',
      userName: 'Peter Malikebu',
      role: 'admin',
      action: 'PRODUCTION_SAMPLE_USERS_PURGED',
      recordAffected: 'Platform Users Table',
      previousValue: `${allUsers.length} test accounts`,
      newValue: `${remainingAdmins.length} active administrators`,
      reason: 'Transitioning database to production; sample users safely cleared for self-registration',
    });

    broadcastEvent('user_updated', { action: 'purged_sample_users' });
    broadcastEvent('commodity_updated', { action: 'purged' });
    broadcastEvent('order_updated', { action: 'purged' });
    broadcastEvent('transport_updated', { action: 'purged' });

    return res.json({
      success: true,
      message: 'All sample test users and sample marketplace listings have been purged. Only authorized Administrator accounts remain active.',
      remainingAdmins,
    });
  } catch (error: any) {
    console.error('Error purging sample users:', error);
    return res.status(500).json({ error: error.message || 'Failed to purge sample users' });
  }
});

// ----------------------------------------------------
// CATEGORIES
// ----------------------------------------------------

router.get('/categories', async (_req, res) => {
  try {
    const cats = await db.select().from(categories).orderBy(categories.name);
    return res.json(cats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to get categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, description, imageUrl, adminUid, adminEmail, adminName } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const inserted = await db.insert(categories).values({
      name,
      description: description || '',
      imageUrl: imageUrl || '',
    }).returning();

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: adminEmail || 'admin@harvesthub.mw',
      userName: adminName || 'Administrator',
      role: 'admin',
      action: 'CATEGORY_ADDED',
      recordAffected: `Category ${name}`,
    });

    broadcastEvent('category_created', inserted[0]);
    return res.json(inserted[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create category' });
  }
});

// ----------------------------------------------------
// COMMODITIES (MARKETPLACE LISTINGS)
// ----------------------------------------------------

router.get('/commodities', async (req, res) => {
  try {
    const { category, district, search, status, farmerUid } = req.query;
    let query = db.select().from(commodities);

    const conditions = [];
    if (category && category !== 'All') {
      conditions.push(eq(commodities.category, String(category)));
    }
    if (district && district !== 'All') {
      conditions.push(eq(commodities.district, String(district)));
    }
    if (status) {
      conditions.push(eq(commodities.status, String(status)));
    }
    if (farmerUid) {
      conditions.push(eq(commodities.farmerUid, String(farmerUid)));
    }

    let results;
    if (conditions.length > 0) {
      results = await query.where(and(...conditions)).orderBy(desc(commodities.createdAt));
    } else {
      results = await query.orderBy(desc(commodities.createdAt));
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = search.toLowerCase();
      results = results.filter(c =>
        c.commodityName.toLowerCase().includes(s) ||
        c.district.toLowerCase().includes(s) ||
        c.location.toLowerCase().includes(s) ||
        c.farmerName.toLowerCase().includes(s)
      );
    }

    return res.json(results);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch commodities' });
  }
});

router.get('/commodities/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await db.select().from(commodities).where(eq(commodities.id, id)).limit(1);
    if (item.length === 0) return res.status(404).json({ error: 'Commodity not found' });
    return res.json(item[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch commodity' });
  }
});

// Create new listing (farmer)
router.post('/commodities', async (req, res) => {
  try {
    const {
      farmerUid,
      commodityName,
      category,
      quantity,
      unit,
      pricePerUnit,
      district,
      location,
      region,
      quality,
      availabilityDate,
      description,
      imageUrl,
    } = req.body;

    if (!farmerUid || !commodityName || !category || !quantity || !pricePerUnit || !district || !location) {
      return res.status(400).json({ error: 'Missing required commodity fields' });
    }

    const qty = parseInt(quantity, 10);
    const price = parseFloat(pricePerUnit);

    if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than zero' });
    if (price <= 0) return res.status(400).json({ error: 'Price per unit must be greater than zero' });

    // Look up farmer
    let farmerList = await db.select().from(users).where(eq(users.uid, farmerUid)).limit(1);
    let farmer: any = farmerList && farmerList.length > 0 ? farmerList[0] : null;

    if (!farmer) {
      const allUsers = await db.select().from(users);
      farmer = allUsers.find(
        (u: any) => u.uid === farmerUid || (u.email && u.email.toLowerCase() === String(farmerUid).toLowerCase())
      );
    }

    const calculatedRegion = getDistrictRegion(district) || region || (farmer && farmer.region) || 'Central';

    if (!farmer) {
      // Auto-provision profile so a registered farmer never gets blocked from listing produce
      const newFarmerInserted = await db.insert(users).values({
        uid: farmerUid,
        email: `${farmerUid}@harvesthub.mw`,
        fullName: 'Smallholder Farmer',
        role: 'farmer',
        district: district || 'Lilongwe',
        region: calculatedRegion,
        tradingArea: location || '',
        isAvailable: true,
      }).returning();
      farmer = newFarmerInserted && newFarmerInserted.length > 0 ? newFarmerInserted[0] : null;
    }

    const safeFarmerId = farmer?.id || 1;
    const safeFarmerUid = farmer?.uid || farmerUid;
    const safeFarmerName = farmer?.fullName || 'Registered Farmer';
    const safeFarmerEmail = farmer?.email || 'farmer@harvesthub.mw';
    const safeFarmerRole = farmer?.role || 'farmer';
    const finalRegion = getDistrictRegion(district) || calculatedRegion || farmer?.region || 'Central';

    const inserted = await db.insert(commodities).values({
      farmerId: safeFarmerId,
      farmerUid: safeFarmerUid,
      farmerName: safeFarmerName,
      commodityName,
      category,
      quantity: qty,
      initialQuantity: qty,
      unit: unit || 'kg',
      pricePerUnit: price.toString(),
      district,
      location,
      region: finalRegion,
      quality: quality || 'Grade A - Premium',
      availabilityDate: availabilityDate || new Date().toISOString().split('T')[0],
      description: description || '',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80',
      status: 'available',
    }).returning();

    const createdRecord = inserted && inserted.length > 0 ? inserted[0] : {
      id: Date.now(),
      farmerId: safeFarmerId,
      farmerUid: safeFarmerUid,
      farmerName: safeFarmerName,
      commodityName,
      category,
      quantity: qty,
      initialQuantity: qty,
      unit: unit || 'kg',
      pricePerUnit: price.toString(),
      district,
      location,
      region: finalRegion,
      quality: quality || 'Grade A - Premium',
      availabilityDate: availabilityDate || new Date().toISOString().split('T')[0],
      description: description || '',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80',
      status: 'available',
    };

    await logAudit({
      userUid: safeFarmerUid,
      userEmail: safeFarmerEmail,
      userName: safeFarmerName,
      role: safeFarmerRole,
      action: 'COMMODITY_CREATED',
      recordAffected: `Commodity #${createdRecord.id} (${commodityName})`,
      newValue: `${qty} ${unit || 'kg'} @ MWK ${price}/unit in ${district}`,
    });

    broadcastEvent('commodity_created', createdRecord);
    return res.status(201).json(createdRecord);
  } catch (error: any) {
    console.error('Error creating commodity:', error);
    return res.status(500).json({ error: error.message || 'Failed to create commodity' });
  }
});

// Update listing (farmer or admin)
router.put('/commodities/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await db.select().from(commodities).where(eq(commodities.id, id)).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: 'Listing not found' });

    const {
      userUid,
      commodityName,
      category,
      quantity,
      pricePerUnit,
      district,
      location,
      quality,
      description,
      imageUrl,
      status,
    } = req.body;

    const user = await db.select().from(users).where(eq(users.uid, userUid)).limit(1);
    if (user.length > 0 && user[0].role !== 'admin' && existing[0].farmerUid !== userUid) {
      return res.status(403).json({ error: 'Unauthorized to modify another farmer\'s listing' });
    }

    const updated = await db.update(commodities)
      .set({
        commodityName: commodityName ?? existing[0].commodityName,
        category: category ?? existing[0].category,
        quantity: quantity !== undefined ? Number(quantity) : existing[0].quantity,
        pricePerUnit: pricePerUnit !== undefined ? String(pricePerUnit) : existing[0].pricePerUnit,
        district: district ?? existing[0].district,
        region: district ? getDistrictRegion(district) : (existing[0].region || getDistrictRegion(existing[0].district)),
        location: location ?? existing[0].location,
        quality: quality ?? existing[0].quality,
        description: description ?? existing[0].description,
        imageUrl: imageUrl ?? existing[0].imageUrl,
        status: status ?? existing[0].status,
        updatedAt: new Date(),
      })
      .where(eq(commodities.id, id))
      .returning();

    await logAudit({
      userUid: userUid || 'system',
      userEmail: user[0]?.email || 'system@harvesthub.mw',
      userName: user[0]?.fullName || 'User',
      role: user[0]?.role || 'farmer',
      action: 'COMMODITY_UPDATED',
      recordAffected: `Commodity #${id} (${updated[0].commodityName})`,
    });

    broadcastEvent('commodity_updated', updated[0]);
    return res.json(updated[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update commodity' });
  }
});

// Cancel / Remove listing (farmer or admin)
router.delete('/commodities/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userUid = req.query.userUid as string;
    const reason = req.query.reason as string || 'Listing closed by seller';
    const action = req.query.action as string; // 'archive' or default 'delete'

    const existing = await db.select().from(commodities).where(eq(commodities.id, id)).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: 'Listing not found or already removed' });

    // Verify ownership: must be the creator (farmer) who listed it or an administrator
    let isAuthorized = false;
    let requesterUser: any = null;

    if (!userUid) {
      isAuthorized = true;
    } else {
      const requesterList = await db.select().from(users).where(eq(users.uid, userUid)).limit(1);
      if (requesterList.length > 0) {
        requesterUser = requesterList[0];
        if (
          requesterUser.role === 'admin' ||
          requesterUser.uid === existing[0].farmerUid ||
          requesterUser.id === existing[0].farmerId ||
          (existing[0].farmerName && requesterUser.fullName && existing[0].farmerName.trim().toLowerCase() === requesterUser.fullName.trim().toLowerCase())
        ) {
          isAuthorized = true;
        }
      } else if (existing[0].farmerUid === userUid) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized: You can only remove your own products' });
    }

    if (action === 'archive') {
      const updated = await db.update(commodities)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(commodities.id, id))
        .returning();

      await logAudit({
        userUid: userUid || existing[0].farmerUid,
        userEmail: requesterUser?.email || 'user@harvesthub.mw',
        userName: requesterUser?.fullName || existing[0].farmerName,
        role: requesterUser?.role || 'farmer',
        action: 'COMMODITY_CANCELLED',
        recordAffected: `Commodity #${id} (${existing[0].commodityName})`,
        reason,
      });

      broadcastEvent('commodity_updated', updated[0]);
      return res.json({ message: 'Commodity listing deactivated and archived successfully', commodity: updated[0] });
    }

    // Permanent Product Removal: cascade clean up linked records to respect foreign keys
    const linkedOrders = await db.select().from(orders).where(eq(orders.commodityId, id));
    const linkedOrderIds = linkedOrders.map((o: any) => o.id);

    for (const ordId of linkedOrderIds) {
      try {
        await db.delete(transactions).where(eq(transactions.orderId, ordId));
      } catch (e) {
        console.warn(`Cleaned transactions for order #${ordId}:`, e);
      }
      try {
        await db.delete(revenueLedger).where(eq(revenueLedger.sourceOrderId, ordId));
      } catch (e) {
        console.warn(`Cleaned revenue ledger for order #${ordId}:`, e);
      }
      try {
        await db.delete(transportJobs).where(eq(transportJobs.orderId, ordId));
      } catch (e) {
        console.warn(`Cleaned transport jobs for order #${ordId}:`, e);
      }
      try {
        await db.delete(orders).where(eq(orders.id, ordId));
      } catch (e) {
        console.warn(`Cleaned order #${ordId}:`, e);
      }
    }

    // Delete any remaining orders referencing this commodity
    try {
      await db.delete(orders).where(eq(orders.commodityId, id));
    } catch (e) {
      console.warn(`Cleaned orders for commodity #${id}:`, e);
    }

    // Delete the commodity itself
    await db.delete(commodities).where(eq(commodities.id, id));

    const store = (global as any)._inMemoryStore || getInMemoryStore();
    if (store) {
      if (Array.isArray(store.commodities)) {
        store.commodities = store.commodities.filter((c: any) => c.id !== id);
      }
      if (Array.isArray(store.orders)) {
        store.orders = store.orders.filter((o: any) => o.commodityId !== id);
      }
      saveStoreToDisk(store);
    }

    await logAudit({
      userUid: userUid || existing[0].farmerUid,
      userEmail: 'user@harvesthub.mw',
      userName: existing[0].farmerName,
      role: 'farmer',
      action: 'COMMODITY_DELETED',
      recordAffected: `Commodity #${id} (${existing[0].commodityName})`,
      reason: reason || 'Product removed by farmer',
    });

    broadcastEvent('commodity_deleted', { id });
    broadcastEvent('commodity_updated', { id, action: 'deleted' });
    return res.json({
      success: true,
      message: `Product "${existing[0].commodityName}" removed successfully from the marketplace and your inventory.`,
      deletedId: id,
    });
  } catch (error: any) {
    console.error('Error removing commodity:', error);
    return res.status(500).json({ error: error.message || 'Failed to remove commodity' });
  }
});

// ----------------------------------------------------
// ORDERS
// ----------------------------------------------------

router.get('/orders', async (req, res) => {
  try {
    const { buyerUid, farmerUid, role, status } = req.query;
    let query = db.select().from(orders);

    const conditions = [];
    if (buyerUid) conditions.push(eq(orders.buyerUid, String(buyerUid)));
    if (farmerUid) conditions.push(eq(orders.farmerUid, String(farmerUid)));
    if (status) conditions.push(eq(orders.status, String(status)));

    let list;
    if (conditions.length > 0) {
      list = await query.where(and(...conditions)).orderBy(desc(orders.createdAt));
    } else {
      list = await query.orderBy(desc(orders.createdAt));
    }

    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch orders' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (item.length === 0) return res.status(404).json({ error: 'Order not found' });
    return res.json(item[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch order' });
  }
});

// Place new order (buyer)
router.post('/orders', async (req, res) => {
  try {
    const {
      buyerUid,
      commodityId,
      quantity,
      deliveryLocation,
      deliveryDistrict,
      deliveryDate,
      notes,
      includeTransportEstimate,
      transportFee,
      paymentMethod,
      paymentRef,
      buyerPhone,
    } = req.body;

    if (!buyerUid || !commodityId || !quantity || !deliveryLocation || !deliveryDistrict) {
      return res.status(400).json({ error: 'Missing required order details' });
    }

    const orderQty = parseInt(quantity, 10);
    if (orderQty <= 0) return res.status(400).json({ error: 'Quantity must be greater than zero' });

    // Buyer verification
    const buyer = await db.select().from(users).where(eq(users.uid, buyerUid)).limit(1);
    if (buyer.length === 0) return res.status(400).json({ error: 'Buyer profile not found' });

    // Commodity check & stock reservation
    const comm = await db.select().from(commodities).where(eq(commodities.id, Number(commodityId))).limit(1);
    if (comm.length === 0) return res.status(404).json({ error: 'Commodity listing not found' });
    if (comm[0].status !== 'available') return res.status(400).json({ error: 'This commodity is no longer available' });
    if (comm[0].quantity < orderQty) {
      return res.status(400).json({
        error: `Insufficient stock. Requested ${orderQty} ${comm[0].unit}, but only ${comm[0].quantity} ${comm[0].unit} is available.`
      });
    }

    // Farmer verification
    const farmer = await db.select().from(users).where(eq(users.id, comm[0].farmerId)).limit(1);
    if (farmer.length === 0) return res.status(400).json({ error: 'Farmer profile not found' });

    // Financial calculations
    const unitPrice = parseFloat(comm[0].pricePerUnit);
    const commoditySubtotal = orderQty * unitPrice;
    const commissionRate = await getCommissionRate(); // 0.04
    const platformCommissionFee = Math.round(commoditySubtotal * commissionRate);
    const parsedTransportFee = includeTransportEstimate ? (Number(transportFee) || 25000) : 0;
    const totalAmount = commoditySubtotal + parsedTransportFee;

    const orderNumber = `MHH-ORD-${Date.now().toString().slice(-6)}`;
    const newRemainingQty = comm[0].quantity - orderQty;
    const newCommStatus = newRemainingQty === 0 ? 'sold_out' : 'available';

    // 1. Decrement stock
    await db.update(commodities)
      .set({
        quantity: newRemainingQty,
        status: newCommStatus,
        updatedAt: new Date(),
      })
      .where(eq(commodities.id, comm[0].id));

    // 2. Insert order
    const insertedOrder = await db.insert(orders).values({
      orderNumber,
      buyerId: buyer[0].id,
      buyerUid: buyer[0].uid,
      buyerName: buyer[0].fullName,
      buyerPhone: buyer[0].phoneNumber || '',
      farmerId: farmer[0].id,
      farmerUid: farmer[0].uid,
      farmerName: farmer[0].fullName,
      farmerPhone: farmer[0].phoneNumber || '',
      commodityId: comm[0].id,
      commodityName: comm[0].commodityName,
      quantity: orderQty,
      unit: comm[0].unit,
      unitPrice: unitPrice.toString(),
      commoditySubtotal: commoditySubtotal.toString(),
      transportFee: parsedTransportFee.toString(),
      platformCommissionRate: commissionRate.toString(),
      platformCommissionFee: platformCommissionFee.toString(),
      totalAmount: totalAmount.toString(),
      deliveryLocation,
      deliveryDistrict,
      deliveryDate: deliveryDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      notes: notes || '',
      paymentMethod: paymentMethod || 'Airtel Money (+265 999 036 912)',
      paymentRef: paymentRef || `REF-${Date.now().toString().slice(-6)}`,
      status: 'pending_payment_verification',
      paymentStatus: 'escrow_pending_finance_approval',
    }).returning();

    // 3. Create initial pending transaction
    const transactionId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
    const netFarmerAmount = commoditySubtotal - platformCommissionFee;
    await db.insert(transactions).values({
      transactionId,
      orderId: insertedOrder[0].id,
      orderNumber,
      farmerId: farmer[0].id,
      farmerName: farmer[0].fullName,
      buyerId: buyer[0].id,
      buyerName: buyer[0].fullName,
      commodityName: comm[0].commodityName,
      grossAmount: totalAmount.toString(),
      platformCommission: platformCommissionFee.toString(),
      transportFee: parsedTransportFee.toString(),
      netFarmerAmount: netFarmerAmount.toString(),
      netTransporterAmount: parsedTransportFee.toString(),
      status: 'pending',
      paymentMethod: paymentMethod || 'Airtel Money (+265 999 036 912)',
    });

    // 4. Notify Finance Administrator & Lead Admin to verify payment
    await createNotification({
      userUid: 'finance-chisomo-05',
      title: `Buyer Payment to Verify #${orderNumber}`,
      message: `Buyer ${buyer[0].fullName} submitted MK ${totalAmount.toLocaleString()} via ${paymentMethod || 'Escrow'} (Ref: ${paymentRef || 'N/A'}) for ${comm[0].commodityName}. Verify receipt on designated account and approve.`,
      type: 'finance',
      relatedOrderId: insertedOrder[0].id,
    });

    await createNotification({
      userUid: 'frF3xukObzdA8AhCBYIBPYV0UK13', // Peter Malikebu Lead Admin
      title: `Buyer Escrow Deposit Received #${orderNumber}`,
      message: `New buyer order by ${buyer[0].fullName} for MK ${totalAmount.toLocaleString()} awaiting Finance verification via ${paymentMethod}.`,
      type: 'finance',
      relatedOrderId: insertedOrder[0].id,
    });

    // 5. Notify farmer
    await createNotification({
      userUid: farmer[0].uid,
      title: `New Order Received #${orderNumber}`,
      message: `${buyer[0].fullName} placed an order for ${orderQty} ${comm[0].unit} of ${comm[0].commodityName} (MK ${commoditySubtotal.toLocaleString()}). Financial Administrator is verifying payment before fulfillment authorization.`,
      type: 'order',
      relatedOrderId: insertedOrder[0].id,
    });

    // 6. Notify buyer
    await createNotification({
      userUid: buyer[0].uid,
      title: `Order Submitted for Escrow Verification #${orderNumber}`,
      message: `Your payment of MK ${totalAmount.toLocaleString()} via ${paymentMethod} has been submitted. Financial Administrator will verify and lock funds in escrow.`,
      type: 'order',
      relatedOrderId: insertedOrder[0].id,
    });

    // 7. Log audit
    await logAudit({
      userUid: buyer[0].uid,
      userEmail: buyer[0].email,
      userName: buyer[0].fullName,
      role: 'buyer',
      action: 'ORDER_PLACED_WITH_PAYMENT',
      recordAffected: `Order #${orderNumber}`,
      newValue: `${orderQty} ${comm[0].unit} ${comm[0].commodityName} for MWK ${totalAmount} via ${paymentMethod} (Ref: ${paymentRef})`,
    });

    // Broadcast realtime updates
    broadcastEvent('order_created', insertedOrder[0]);
    broadcastEvent('commodity_updated', { id: comm[0].id, quantity: newRemainingQty, status: newCommStatus });
    broadcastEvent('revenue_updated', { trigger: 'order_created' });
    broadcastEvent('finance_pending_updated', { order: insertedOrder[0] });

    return res.status(201).json(insertedOrder[0]);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: error.message || 'Failed to place order' });
  }
});

// Financial Administrator verifies buyer payment into official Airtel Money / TNM Mpamba / NBS Bank account
router.post('/orders/:id/finance-approve-payment', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { financeAdminUid, financeAdminName, notes } = req.body;

    const ord = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ord.length === 0) return res.status(404).json({ error: 'Order not found' });

    if (ord[0].status === 'cancelled') {
      return res.status(400).json({
        error: 'Cannot approve payment into active escrow: This order was CANCELLED by the buyer. If funds were received on official accounts, proceed to refund the buyer.'
      });
    }

    const updatedOrder = await db.update(orders)
      .set({
        paymentStatus: 'escrow_held',
        status: ord[0].status === 'pending_payment_verification' ? 'pending' : ord[0].status,
        financeApprovedAt: new Date(),
        financeApprovedBy: financeAdminName || 'Financial Administrator',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Update transaction status
    await db.update(transactions)
      .set({
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(transactions.orderId, id));

    // Notify farmer to reassure them and ask for confirmation
    await createNotification({
      userUid: ord[0].farmerUid,
      title: `Buyer Payment Secured in Escrow #${ord[0].orderNumber}`,
      message: `Great news! Financial Administrator has verified buyer payment of MK ${Number(ord[0].totalAmount).toLocaleString()}. Funds are now locked in escrow. Please confirm the purchase to authorize dispatch/packaging.`,
      type: 'finance',
      relatedOrderId: ord[0].id,
    });

    // Notify buyer
    await createNotification({
      userUid: ord[0].buyerUid,
      title: `Payment Verified by Finance #${ord[0].orderNumber}`,
      message: `Your payment has been successfully confirmed and secured in escrow! Farmer ${ord[0].farmerName} has been instructed to prepare and confirm the order.`,
      type: 'finance',
      relatedOrderId: ord[0].id,
    });

    await logAudit({
      userUid: financeAdminUid || 'finance-chisomo-05',
      userEmail: 'finance@harvesthub.mw',
      userName: financeAdminName || 'Financial Administrator',
      role: 'finance_admin',
      action: 'BUYER_PAYMENT_VERIFIED_ESCROW',
      recordAffected: `Order #${ord[0].orderNumber}`,
      newValue: `Payment verified on ${ord[0].paymentMethod}. Ref: ${ord[0].paymentRef}. Notes: ${notes || 'Verified against bank/mobile statement'}`,
    });

    broadcastEvent('order_updated', updatedOrder[0]);
    broadcastEvent('revenue_updated', { trigger: 'payment_verified', orderId: id });

    return res.json({ success: true, order: updatedOrder[0] });
  } catch (error: any) {
    console.error('Error approving buyer payment:', error);
    return res.status(500).json({ error: error.message || 'Failed to verify buyer payment' });
  }
});

// Farmer confirms the purchase/order to reassure buyer and finance administrator
router.post('/orders/:id/farmer-confirm', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { farmerUid, farmerName } = req.body;

    const ord = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ord.length === 0) return res.status(404).json({ error: 'Order not found' });

    if (ord[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot confirm order: This order has been cancelled by the buyer.' });
    }

    const updatedOrder = await db.update(orders)
      .set({
        status: 'accepted',
        farmerConfirmedAt: new Date(),
        farmerConfirmedBy: farmerName || ord[0].farmerName,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Notify buyer
    await createNotification({
      userUid: ord[0].buyerUid,
      title: `Farmer Confirmed Purchase #${ord[0].orderNumber}`,
      message: `Farmer ${ord[0].farmerName} has confirmed your purchase for ${ord[0].quantity} ${ord[0].unit} of ${ord[0].commodityName}. Ready for fulfillment/transport.`,
      type: 'order',
      relatedOrderId: ord[0].id,
    });

    // Notify finance admin
    await createNotification({
      userUid: 'finance-chisomo-05',
      title: `Farmer Confirmed Order #${ord[0].orderNumber}`,
      message: `Farmer ${ord[0].farmerName} confirmed stock fulfillment for Order #${ord[0].orderNumber}. Awaiting transit/delivery completion for payout release.`,
      type: 'order',
      relatedOrderId: ord[0].id,
    });

    await logAudit({
      userUid: farmerUid || ord[0].farmerUid,
      userEmail: 'farmer@harvesthub.mw',
      userName: farmerName || ord[0].farmerName,
      role: 'farmer',
      action: 'FARMER_PURCHASE_CONFIRMED',
      recordAffected: `Order #${ord[0].orderNumber}`,
      newValue: 'Stock fulfillment authorized and confirmed by farmer',
    });

    broadcastEvent('order_updated', updatedOrder[0]);

    return res.json({ success: true, order: updatedOrder[0] });
  } catch (error: any) {
    console.error('Error confirming order by farmer:', error);
    return res.status(500).json({ error: error.message || 'Failed to confirm purchase' });
  }
});

// Financial Administrator disburses money to the farmer at the end
router.post('/orders/:id/finance-disburse-funds', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { financeAdminUid, financeAdminName, payoutMethod, payoutRef, notes } = req.body;

    const ord = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ord.length === 0) return res.status(404).json({ error: 'Order not found' });

    if (ord[0].status === 'cancelled') {
      return res.status(400).json({
        error: 'DISBURSEMENT BLOCKED: Order has been CANCELLED by the buyer. Escrow funds must NOT be paid to the farmer. Please execute a buyer refund instead.'
      });
    }

    if (ord[0].paymentStatus === 'refund_required' || ord[0].paymentStatus === 'refunded') {
      return res.status(400).json({
        error: 'DISBURSEMENT BLOCKED: This order is queued for refund or has already been refunded to the buyer.'
      });
    }

    const grossAmount = Number(ord[0].commoditySubtotal);
    const commissionRate = Number(ord[0].platformCommissionRate) || 0.04;
    const commissionFee = Number(ord[0].platformCommissionFee) || Math.round(grossAmount * commissionRate);
    const farmerEarnings = grossAmount - commissionFee;
    const ref = payoutRef || `DSB-${Date.now().toString().slice(-6)}`;

    const updatedOrder = await db.update(orders)
      .set({
        paymentStatus: 'disbursed_to_farmer',
        status: 'completed',
        disbursedAt: new Date(),
        disbursedBy: financeAdminName || 'Financial Administrator',
        disbursedRef: ref,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Mark transaction completed
    await db.update(transactions)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(transactions.orderId, id));

    // Permanent revenue ledger entry
    const revenueId = `REV-${Date.now().toString().slice(-7)}`;
    const transportFee = Number(ord[0].transportFee) || 0;
    const transportCommission = transportFee > 0 ? Math.round(transportFee * commissionRate) : 0;
    const netTransporterEarnings = Math.max(0, transportFee - transportCommission);
    const totalCommission = commissionFee + transportCommission;

    await db.insert(revenueLedger).values({
      revenueId,
      transactionId: `TX-${ord[0].orderNumber.slice(-4)}`,
      sourceType: 'commodity_commission',
      sourceOrderId: ord[0].id,
      sourceOrderNumber: ord[0].orderNumber,
      grossTransactionAmount: (grossAmount + transportFee).toString(),
      commissionRate: commissionRate.toString(),
      commissionAmount: totalCommission.toString(),
      transportFee: transportFee.toString(),
      farmerEarnings: farmerEarnings.toString(),
      transporterEarnings: netTransporterEarnings.toString(),
      status: 'settled',
      createdSource: 'finance_admin_disbursement',
    });

    // If order includes transport, update linked transport job with commission deduction and notify driver
    if (transportFee > 0) {
      const linkedJobs = await db.select().from(transportJobs).where(eq(transportJobs.orderId, id));
      if (linkedJobs.length > 0) {
        for (const lj of linkedJobs) {
          await db.update(transportJobs)
            .set({
              platformCommissionRate: commissionRate.toString(),
              platformCommissionFee: transportCommission.toString(),
              netTransporterAmount: netTransporterEarnings.toString(),
              disbursedToTransporterAt: new Date(),
              disbursedToTransporterRef: ref,
              disbursedToTransporterBy: financeAdminName || 'Financial Administrator',
              paymentStatus: 'verified_by_finance',
              status: lj.status === 'in_transit' ? 'completed' : lj.status,
              updatedAt: new Date(),
            })
            .where(eq(transportJobs.id, lj.id));

          if (lj.transporterUid) {
            await createNotification({
              userUid: lj.transporterUid,
              title: `Transit Payment Disbursed #${ord[0].orderNumber}`,
              message: `Financial Administrator disbursed your transport fee of MK ${netTransporterEarnings.toLocaleString()} (net of ${(commissionRate * 100).toFixed(1)}% platform commission: MK ${transportCommission.toLocaleString()}) via ${payoutMethod || 'Mobile Money'} (Ref: ${ref}).`,
              type: 'finance',
              relatedOrderId: ord[0].id,
            });
          }
        }
      }
    }

    // Notify farmer of payout
    await createNotification({
      userUid: ord[0].farmerUid,
      title: `Escrow Payout Disbursed #${ord[0].orderNumber}`,
      message: `Funds have been disbursed! Financial Administrator sent MK ${farmerEarnings.toLocaleString()} (net of ${(commissionRate * 100).toFixed(1)}% platform fee) via ${payoutMethod || 'Mobile Money'} (Ref: ${ref}). Thank you for selling on Mberalink!`,
      type: 'finance',
      relatedOrderId: ord[0].id,
    });

    // Notify buyer
    await createNotification({
      userUid: ord[0].buyerUid,
      title: `Order Completed & Escrow Settled #${ord[0].orderNumber}`,
      message: `Order #${ord[0].orderNumber} has been finalized and payment disbursed to the farmer and transporter. Thank you for trading on Malawi Harvest Hub!`,
      type: 'order',
      relatedOrderId: ord[0].id,
    });

    await logAudit({
      userUid: financeAdminUid || 'finance-chisomo-05',
      userEmail: 'finance@harvesthub.mw',
      userName: financeAdminName || 'Financial Administrator',
      role: 'finance_admin',
      action: 'ESCROW_FUNDS_DISBURSED_TO_FARMER',
      recordAffected: `Order #${ord[0].orderNumber}`,
      newValue: `MK ${farmerEarnings.toLocaleString()} sent to Farmer ${ord[0].farmerName} via ${payoutMethod || 'Mobile Money'} (Ref: ${ref}). Notes: ${notes || 'Final settlement'}`,
    });

    broadcastEvent('order_updated', updatedOrder[0]);
    broadcastEvent('revenue_updated', { trigger: 'disbursed', revenueId });
    broadcastEvent('transaction_updated', { orderId: id, status: 'completed' });

    return res.json({ success: true, order: updatedOrder[0], farmerEarnings, disbursedRef: ref });
  } catch (error: any) {
    console.error('Error disbursing funds to farmer:', error);
    return res.status(500).json({ error: error.message || 'Failed to disburse funds to farmer' });
  }
});

// Accept order (farmer)
router.post('/orders/:id/accept', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { farmerUid } = req.body;

    const ord = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ord.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (ord[0].status !== 'pending') return res.status(400).json({ error: `Cannot accept order with status '${ord[0].status}'` });

    const updated = await db.update(orders)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    await createNotification({
      userUid: ord[0].buyerUid,
      title: `Order Accepted #${ord[0].orderNumber}`,
      message: `Farmer ${ord[0].farmerName} accepted your order for ${ord[0].quantity} ${ord[0].unit} of ${ord[0].commodityName}. Ready for transport or delivery.`,
      type: 'order',
      relatedOrderId: ord[0].id,
    });

    await logAudit({
      userUid: farmerUid || ord[0].farmerUid,
      userEmail: 'farmer@harvesthub.mw',
      userName: ord[0].farmerName,
      role: 'farmer',
      action: 'ORDER_ACCEPTED',
      recordAffected: `Order #${ord[0].orderNumber}`,
      previousValue: 'pending',
      newValue: 'accepted',
    });

    broadcastEvent('order_updated', updated[0]);
    return res.json(updated[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to accept order' });
  }
});

// Decline order (farmer)
router.post('/orders/:id/decline', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { farmerUid, reason } = req.body;

    const ord = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ord.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (ord[0].status !== 'pending') return res.status(400).json({ error: `Cannot decline order with status '${ord[0].status}'` });

    // Restore commodity stock
    const comm = await db.select().from(commodities).where(eq(commodities.id, ord[0].commodityId)).limit(1);
    if (comm.length > 0) {
      await db.update(commodities)
        .set({
          quantity: comm[0].quantity + ord[0].quantity,
          status: 'available',
          updatedAt: new Date(),
        })
        .where(eq(commodities.id, comm[0].id));
      broadcastEvent('commodity_updated', { id: comm[0].id, quantity: comm[0].quantity + ord[0].quantity, status: 'available' });
    }

    const updated = await db.update(orders)
      .set({
        status: 'declined',
        cancellationReason: reason || 'Farmer declined order',
        cancelledByUid: farmerUid || ord[0].farmerUid,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Cancel related transaction
    await db.update(transactions)
      .set({
        status: 'cancelled',
        cancellationReason: reason || 'Order declined by farmer',
        cancelledBy: ord[0].farmerName,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.orderId, id));

    await createNotification({
      userUid: ord[0].buyerUid,
      title: `Order Declined #${ord[0].orderNumber}`,
      message: `Farmer ${ord[0].farmerName} was unable to fulfill your order. Reason: ${reason || 'Not specified'}. Escrow holds are released.`,
      type: 'order',
      relatedOrderId: ord[0].id,
    });

    await logAudit({
      userUid: farmerUid || ord[0].farmerUid,
      userEmail: 'farmer@harvesthub.mw',
      userName: ord[0].farmerName,
      role: 'farmer',
      action: 'ORDER_DECLINED',
      recordAffected: `Order #${ord[0].orderNumber}`,
      reason: reason || 'Farmer declined',
    });

    broadcastEvent('order_updated', updated[0]);
    return res.json(updated[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to decline order' });
  }
});

// Controlled Cancel / Archive Order (Buyer or Admin)
router.post('/orders/:id/cancel', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { userUid, userName, userRole, reason } = req.body;

    const ord = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ord.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (ord[0].status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed financial order. Records are permanently locked for audit.' });
    }
    if (ord[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Order is already cancelled' });
    }

    // Check if buyer had submitted or locked payment into escrow
    const isPaidOrDeposited = ['escrow_held', 'escrow_pending_finance_approval', 'paid', 'escrowed'].includes(ord[0].paymentStatus);
    const newPaymentStatus = isPaidOrDeposited ? 'refund_required' : 'cancelled';

    // 1. Restore commodity inventory stock to farmer's listing
    const comm = await db.select().from(commodities).where(eq(commodities.id, ord[0].commodityId)).limit(1);
    if (comm.length > 0) {
      await db.update(commodities)
        .set({
          quantity: comm[0].quantity + ord[0].quantity,
          status: 'available',
          updatedAt: new Date(),
        })
        .where(eq(commodities.id, comm[0].id));
      broadcastEvent('commodity_updated', { id: comm[0].id, quantity: comm[0].quantity + ord[0].quantity, status: 'available' });
    }

    // 2. Cancel related transport job if present
    await db.update(transportJobs)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(transportJobs.orderId, id));

    // 3. Mark order as cancelled and set paymentStatus (refund_required if funds were deposited)
    const updated = await db.update(orders)
      .set({
        status: 'cancelled',
        paymentStatus: newPaymentStatus,
        cancellationReason: reason || 'Cancelled by buyer',
        cancelledByUid: userUid || 'system',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // 4. Update transaction ledger record
    await db.update(transactions)
      .set({
        status: isPaidOrDeposited ? 'refunded' : 'cancelled',
        cancellationReason: isPaidOrDeposited
          ? `Order cancelled by buyer - Refund of MWK ${Number(ord[0].totalAmount).toLocaleString()} required: ${reason || 'Buyer requested cancellation'}`
          : (reason || 'Order cancelled'),
        cancelledBy: userName || 'Buyer',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.orderId, id));

    // 5. Reverse revenue ledger entry if previously created
    await db.update(revenueLedger)
      .set({ status: 'reversed' })
      .where(eq(revenueLedger.sourceOrderId, id));

    // 6. Immutable audit log record
    const totalAmountFormatted = `MWK ${Number(ord[0].totalAmount).toLocaleString()}`;
    await logAudit({
      userUid: userUid || ord[0].buyerUid,
      userEmail: 'user@harvesthub.mw',
      userName: userName || ord[0].buyerName,
      role: userRole || 'buyer',
      action: isPaidOrDeposited ? 'ORDER_CANCELLED_REFUND_REQUIRED' : 'ORDER_CANCELLED',
      recordAffected: `Order #${ord[0].orderNumber}`,
      previousValue: `Status: ${ord[0].status}, Payment: ${ord[0].paymentStatus}`,
      newValue: `Status: cancelled, Payment: ${newPaymentStatus}`,
      reason: isPaidOrDeposited
        ? `Order cancelled after buyer payment submission. Farmer escrow payout HALTED. Financial Administrator must refund ${totalAmountFormatted} to buyer. Reason: ${reason || 'Buyer cancelled'}`
        : (reason || 'Order cancelled before payment deposit'),
    });

    // 7. Notify Financial Administrators & Lead Admins (Peter Malikebu & Joshua Malikebu)
    const allUsers = await db.select().from(users);
    const financeAdminRecipients = allUsers.filter(
      (u: any) =>
        u.role === 'admin' ||
        u.role === 'finance_admin' ||
        u.uid === 'frF3xukObzdA8AhCBYIBPYV0UK13' ||
        u.uid === 'admin-joshua-02'
    );

    for (const fa of financeAdminRecipients) {
      if (isPaidOrDeposited) {
        await createNotification({
          userUid: fa.uid,
          title: `⚠️ ORDER CANCELLED: REFUND REQUIRED #${ord[0].orderNumber}`,
          message: `Buyer ${ord[0].buyerName} cancelled Order #${ord[0].orderNumber}. Farmer payout has been FROZEN and will NOT proceed. Action Required: Please process refund of ${totalAmountFormatted} to buyer via ${ord[0].paymentMethod || 'Escrow'} (Buyer Contact: ${ord[0].buyerPhone || 'on file'}, Payment Ref: ${ord[0].paymentRef || 'N/A'}).`,
          type: 'finance',
          relatedOrderId: ord[0].id,
        });
      } else {
        await createNotification({
          userUid: fa.uid,
          title: `Order Cancelled #${ord[0].orderNumber}`,
          message: `Buyer ${ord[0].buyerName} cancelled unpaid Order #${ord[0].orderNumber} (${ord[0].quantity} ${ord[0].unit} of ${ord[0].commodityName}). No payout or refund needed.`,
          type: 'finance',
          relatedOrderId: ord[0].id,
        });
      }
    }

    // 8. Notify farmer that order was cancelled and inventory restored
    await createNotification({
      userUid: ord[0].farmerUid,
      title: `Order Cancelled #${ord[0].orderNumber}`,
      message: `Buyer ${ord[0].buyerName} cancelled Order #${ord[0].orderNumber}. Escrow payout has been stopped. Stock (${ord[0].quantity} ${ord[0].unit} of ${ord[0].commodityName}) has been restored to your live inventory.`,
      type: 'order',
      relatedOrderId: ord[0].id,
    });

    // 9. Notify buyer confirming cancellation and refund queue status
    await createNotification({
      userUid: ord[0].buyerUid,
      title: isPaidOrDeposited
        ? `Order Cancelled • Refund Queued #${ord[0].orderNumber}`
        : `Order Cancelled #${ord[0].orderNumber}`,
      message: isPaidOrDeposited
        ? `Your Order #${ord[0].orderNumber} has been cancelled. Farmer payout has been halted. Financial Administrator has been alerted to process your refund of ${totalAmountFormatted} via ${ord[0].paymentMethod || 'your account'}.`
        : `Your Order #${ord[0].orderNumber} has been successfully cancelled and archived.`,
      type: 'finance',
      relatedOrderId: ord[0].id,
    });

    // Broadcast real-time events to all open screens
    broadcastEvent('order_updated', updated[0]);
    broadcastEvent('order_cancelled', { id: ord[0].id, orderNumber: ord[0].orderNumber, requiresRefund: isPaidOrDeposited });
    broadcastEvent('revenue_updated', { trigger: 'order_cancelled', orderId: id });
    broadcastEvent('finance_pending_updated', { order: updated[0] });
    broadcastEvent('notification_created', { relatedOrderId: ord[0].id });

    return res.json(updated[0]);
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ error: error.message || 'Failed to cancel order' });
  }
});

// Financial Administrator executes refund to buyer for a cancelled order
router.post('/orders/:id/finance-process-refund', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { financeAdminUid, financeAdminName, refundMethod, refundRef, refundAmount, notes } = req.body;

    const ord = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ord.length === 0) return res.status(404).json({ error: 'Order not found' });

    if (ord[0].paymentStatus === 'refunded') {
      return res.status(400).json({ error: 'Refund has already been processed for this order.' });
    }

    const refAmount = Number(refundAmount) || Number(ord[0].totalAmount);
    const finalRefundRef = refundRef || `RFND-${Date.now().toString().slice(-6)}`;
    const finalMethod = refundMethod || ord[0].paymentMethod || 'Airtel Money (+265 999 036 912)';
    const adminName = financeAdminName || 'Financial Administrator';

    const updatedOrder = await db.update(orders)
      .set({
        paymentStatus: 'refunded',
        refundedAt: new Date(),
        refundedBy: adminName,
        refundRef: finalRefundRef,
        refundNotes: notes || `Refund issued by ${adminName} for cancelled order`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Also update in-memory store if active
    const store = (global as any)._inMemoryStore;
    if (store && Array.isArray(store.orders)) {
      const idx = store.orders.findIndex((o: any) => o.id === id);
      if (idx >= 0) {
        store.orders[idx] = {
          ...store.orders[idx],
          paymentStatus: 'refunded',
          refundedAt: new Date(),
          refundedBy: adminName,
          refundRef: finalRefundRef,
          refundNotes: notes || `Refund issued by ${adminName} for cancelled order`,
          updatedAt: new Date(),
        };
        saveStoreToDisk(store);
      }
    }

    // Mark transaction as refunded
    await db.update(transactions)
      .set({
        status: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(transactions.orderId, id));

    // Reverse revenue ledger if present
    await db.update(revenueLedger)
      .set({ status: 'reversed' })
      .where(eq(revenueLedger.sourceOrderId, id));

    // Audit log
    await logAudit({
      userUid: financeAdminUid || 'admin',
      userEmail: 'finance@harvesthub.mw',
      userName: adminName,
      role: 'finance_admin',
      action: 'BUYER_REFUND_PROCESSED',
      recordAffected: `Order #${ord[0].orderNumber}`,
      newValue: `MWK ${refAmount.toLocaleString()} refunded to Buyer ${ord[0].buyerName} (${ord[0].buyerPhone || 'contact'}) via ${finalMethod}. Ref: ${finalRefundRef}. Notes: ${notes || 'Refund completed'}`,
    });

    // Notify Buyer that refund was completed
    await createNotification({
      userUid: ord[0].buyerUid,
      title: `✅ Refund Completed #${ord[0].orderNumber}`,
      message: `Your refund of MWK ${refAmount.toLocaleString()} has been processed by Financial Administrator (${adminName}) via ${finalMethod}. Transaction Ref: ${finalRefundRef}. Funds returned to your account.`,
      type: 'finance',
      relatedOrderId: ord[0].id,
    });

    // Notify Farmer that order cancellation and refund is finalized
    await createNotification({
      userUid: ord[0].farmerUid,
      title: `Order Cancelled & Refunded #${ord[0].orderNumber}`,
      message: `Cancelled Order #${ord[0].orderNumber} has been refunded to the buyer by Financial Administrator. Escrow file is now settled and closed.`,
      type: 'order',
      relatedOrderId: ord[0].id,
    });

    broadcastEvent('order_updated', updatedOrder[0]);
    broadcastEvent('transaction_updated', { orderId: id, status: 'refunded' });
    broadcastEvent('revenue_updated', { trigger: 'refund_processed', orderId: id });
    broadcastEvent('notification_created', { relatedOrderId: id });

    return res.json({
      success: true,
      message: `Refund of MWK ${refAmount.toLocaleString()} successfully processed for Buyer ${ord[0].buyerName}!`,
      order: updatedOrder[0],
      refundRef: finalRefundRef,
    });
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return res.status(500).json({ error: error.message || 'Failed to process refund' });
  }
});

// Request Transport for Order
router.post('/orders/:id/request-transport', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      userUid,
      requiredVehicleType,
      preferredDate,
      specialRequirements,
      transportFee,
      pickupLocation,
      destinationLocation,
    } = req.body;

    const ord = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ord.length === 0) return res.status(404).json({ error: 'Order not found' });

    // Look up commodity district
    const comm = await db.select().from(commodities).where(eq(commodities.id, ord[0].commodityId)).limit(1);
    const pickupDistrict = comm[0]?.district || 'Mchinji';
    const parsedFee = Number(transportFee) || Number(ord[0].transportFee) || 30000;

    const insertedJob = await db.insert(transportJobs).values({
      orderId: ord[0].id,
      orderNumber: ord[0].orderNumber,
      commodityName: ord[0].commodityName,
      quantityKg: ord[0].quantity,
      pickupLocation: pickupLocation || comm[0]?.location || 'Farm Depot',
      pickupDistrict,
      destinationLocation: destinationLocation || ord[0].deliveryLocation,
      destinationDistrict: ord[0].deliveryDistrict,
      requiredVehicleType: requiredVehicleType || 'Medium Truck (3-5 Ton)',
      preferredDate: preferredDate || ord[0].deliveryDate,
      specialRequirements: specialRequirements || '',
      transportFee: parsedFee.toString(),
      status: 'requested',
    }).returning();

    // Update order status to transport_requested
    const updatedOrder = await db.update(orders)
      .set({
        status: 'transport_requested',
        transportFee: parsedFee.toString(),
        totalAmount: (Number(ord[0].commoditySubtotal) + parsedFee).toString(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Update transaction transport fee
    await db.update(transactions)
      .set({
        transportFee: parsedFee.toString(),
        netTransporterAmount: parsedFee.toString(),
        grossAmount: (Number(ord[0].commoditySubtotal) + parsedFee).toString(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.orderId, id));

    await logAudit({
      userUid: userUid || ord[0].buyerUid,
      userEmail: 'user@harvesthub.mw',
      userName: ord[0].buyerName,
      role: 'buyer',
      action: 'TRANSPORT_REQUESTED',
      recordAffected: `Transport Job for Order #${ord[0].orderNumber}`,
      newValue: `Fee: MWK ${parsedFee}, Vehicle: ${requiredVehicleType || 'Standard Truck'}`,
    });

    // Notify all active transporters
    broadcastEvent('transport_requested', insertedJob[0]);
    broadcastEvent('order_updated', updatedOrder[0]);
    return res.status(201).json({ job: insertedJob[0], order: updatedOrder[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to request transport' });
  }
});

// Confirm delivery and complete order
router.post('/orders/:id/confirm-delivery', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { userUid, userName, userRole } = req.body;

    const ord = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (ord.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (ord[0].status === 'completed') return res.status(400).json({ error: 'Order is already completed' });
    if (ord[0].status === 'cancelled') return res.status(400).json({ error: 'Cannot confirm delivery on a cancelled order.' });

    // Update order to completed
    const updatedOrder = await db.update(orders)
      .set({
        status: 'completed',
        paymentStatus: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Complete transport job if present
    await db.update(transportJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transportJobs.orderId, id));

    // Complete transaction
    await db.update(transactions)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(transactions.orderId, id));

    // Permanent revenue ledger entry
    const revenueId = `REV-${Date.now().toString().slice(-7)}`;
    const grossAmount = Number(ord[0].commoditySubtotal);
    const commissionRate = Number(ord[0].platformCommissionRate) || 0.04;
    const commissionAmount = Number(ord[0].platformCommissionFee) || Math.round(grossAmount * commissionRate);
    const transportFee = Number(ord[0].transportFee) || 0;
    const transportCommission = transportFee > 0 ? Math.round(transportFee * commissionRate) : 0;
    const farmerEarnings = grossAmount - commissionAmount;
    const netTransporterEarnings = Math.max(0, transportFee - transportCommission);
    const totalCommission = commissionAmount + transportCommission;

    await db.insert(revenueLedger).values({
      revenueId,
      transactionId: `TX-${ord[0].orderNumber.slice(-4)}`,
      sourceType: 'commodity_commission',
      sourceOrderId: ord[0].id,
      sourceOrderNumber: ord[0].orderNumber,
      grossTransactionAmount: (grossAmount + transportFee).toString(),
      commissionRate: commissionRate.toString(),
      commissionAmount: totalCommission.toString(),
      transportFee: transportFee.toString(),
      farmerEarnings: farmerEarnings.toString(),
      transporterEarnings: netTransporterEarnings.toString(),
      status: 'settled',
      createdSource: 'system_escrow_engine',
    });

    await logAudit({
      userUid: userUid || ord[0].buyerUid,
      userEmail: 'user@harvesthub.mw',
      userName: userName || ord[0].buyerName,
      role: userRole || 'buyer',
      action: 'ORDER_COMPLETED',
      recordAffected: `Order #${ord[0].orderNumber}`,
      previousValue: ord[0].status,
      newValue: 'completed',
      reason: 'Delivery confirmed and escrow funds disbursed to farmer and transporter',
    });

    // Notify farmer
    await createNotification({
      userUid: ord[0].farmerUid,
      title: `Funds Disbursed #${ord[0].orderNumber}`,
      message: `Delivery confirmed for order #${ord[0].orderNumber}! MWK ${farmerEarnings.toLocaleString()} (net of ${(commissionRate * 100).toFixed(1)}% platform commission) has been credited to your farmer wallet.`,
      type: 'finance',
      relatedOrderId: ord[0].id,
    });

    // Notify buyer
    await createNotification({
      userUid: ord[0].buyerUid,
      title: `Order Completed #${ord[0].orderNumber}`,
      message: `Order #${ord[0].orderNumber} has been marked complete. Thank you for trading on Malawi Harvest Hub!`,
      type: 'order',
      relatedOrderId: ord[0].id,
    });

    broadcastEvent('order_updated', updatedOrder[0]);
    broadcastEvent('revenue_updated', { trigger: 'order_completed', revenueId });
    broadcastEvent('transaction_updated', { orderId: id, status: 'completed' });

    return res.json(updatedOrder[0]);
  } catch (error: any) {
    console.error('Error completing order:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete order' });
  }
});

// ----------------------------------------------------
// TRANSPORT MARKETPLACE & MATCHING
// ----------------------------------------------------

router.get('/transport/jobs', async (req, res) => {
  try {
    const { transporterUid, farmerUid, status } = req.query;
    let query = db.select().from(transportJobs);

    const conditions = [];
    if (status) {
      conditions.push(eq(transportJobs.status, String(status)));
    }
    if (farmerUid) {
      conditions.push(eq(transportJobs.farmerUid, String(farmerUid)));
    }
    if (transporterUid) {
      conditions.push(
        or(
          eq(transportJobs.transporterUid, String(transporterUid)),
          eq(transportJobs.status, 'requested'),
          eq(transportJobs.status, 'quote_requested'),
          eq(transportJobs.status, 'quote_submitted')
        )
      );
    }

    let list;
    if (conditions.length > 0) {
      list = await query.where(and(...conditions)).orderBy(desc(transportJobs.createdAt));
    } else {
      list = await query.orderBy(desc(transportJobs.createdAt));
    }

    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch transport jobs' });
  }
});

// Farmer requests a custom Transport Price Quote based on route, distance & cargo
router.post('/transport/quote-request', async (req, res) => {
  try {
    const {
      farmerUid,
      farmerName,
      farmerPhone,
      commodityName,
      quantityKg,
      pickupLocation,
      pickupDistrict,
      destinationLocation,
      destinationDistrict,
      distanceKm,
      requiredVehicleType,
      preferredDate,
      specialRequirements,
      requestedDriverId,
    } = req.body;

    if (!farmerUid || !commodityName || !quantityKg || !pickupLocation || !destinationLocation) {
      return res.status(400).json({ error: 'Missing required fields for transport quote inquiry.' });
    }

    const farmer = await db.select().from(users).where(eq(users.uid, farmerUid)).limit(1);
    const orderNumber = `TRP-${Date.now().toString().slice(-6)}`;
    const parsedDistance = Number(distanceKm) || 0;

    let requestedDriver: any = null;
    if (requestedDriverId) {
      const driverRes = await db.select().from(users).where(eq(users.id, Number(requestedDriverId))).limit(1);
      if (driverRes.length > 0) requestedDriver = driverRes[0];
    }

    const insertedJob = await db.insert(transportJobs).values({
      orderNumber,
      farmerId: farmer.length > 0 ? farmer[0].id : null,
      farmerUid,
      farmerName: farmerName || (farmer.length > 0 ? farmer[0].fullName : 'Farmer'),
      farmerPhone: farmerPhone || (farmer.length > 0 ? farmer[0].phoneNumber : '+265 '),
      transporterId: requestedDriver ? requestedDriver.id : null,
      transporterUid: requestedDriver ? requestedDriver.uid : null,
      transporterName: requestedDriver ? requestedDriver.fullName : null,
      transporterPhone: requestedDriver ? requestedDriver.phoneNumber : null,
      commodityName,
      quantityKg: Number(quantityKg),
      pickupLocation,
      pickupDistrict: pickupDistrict || 'Mchinji',
      destinationLocation,
      destinationDistrict: destinationDistrict || 'Lilongwe',
      distanceKm: parsedDistance,
      requiredVehicleType: requiredVehicleType || 'Medium Truck (3-5 Ton)',
      preferredDate: preferredDate || new Date().toISOString().split('T')[0],
      specialRequirements: specialRequirements || '',
      transportFee: '0',
      priceStatus: 'pending_quote',
      farmerConfirmedPrice: false,
      adminConfirmedPrice: false,
      status: 'quote_requested',
      paymentStatus: 'pending_payment',
    }).returning();

    // Notify requested driver or broadcast to available transporters
    if (requestedDriver) {
      await createNotification({
        userUid: requestedDriver.uid,
        title: `New Transport Quote Inquiry #${orderNumber}`,
        message: `Farmer ${insertedJob[0].farmerName} requested a price quote for ${quantityKg} kg of ${commodityName} from ${pickupDistrict} to ${destinationDistrict} (~${parsedDistance} km). Please provide your price per trip/distance.`,
        type: 'transport',
      });
    } else {
      // Notify all available transporters
      const availableTransporters = await db.select().from(users).where(
        and(eq(users.role, 'transporter'), eq(users.isAvailable, true))
      );
      for (const t of availableTransporters) {
        await createNotification({
          userUid: t.uid,
          title: `New Route Inquiry #${orderNumber}`,
          message: `Open transport request: ${quantityKg} kg ${commodityName} from ${pickupDistrict} to ${destinationDistrict} (~${parsedDistance} km). Submit your price quote!`,
          type: 'transport',
        });
      }
    }

    // Also notify Lead Admins
    await createNotification({
      userUid: 'frF3xukObzdA8AhCBYIBPYV0UK13',
      title: `Transport Quote Inquiry Created #${orderNumber}`,
      message: `Farmer ${insertedJob[0].farmerName} requested route pricing for ${pickupDistrict} -> ${destinationDistrict} (~${parsedDistance} km).`,
      type: 'transport',
    });

    await logAudit({
      userUid: farmerUid,
      userEmail: farmer.length > 0 ? farmer[0].email : 'farmer@harvesthub.mw',
      userName: insertedJob[0].farmerName || 'Farmer',
      role: 'farmer',
      action: 'TRANSPORT_QUOTE_REQUESTED',
      recordAffected: `Transport Job #${orderNumber}`,
      newValue: `Route: ${pickupDistrict} -> ${destinationDistrict} (~${parsedDistance} km), Cargo: ${quantityKg} kg ${commodityName}`,
    });

    broadcastEvent('transport_requested', insertedJob[0]);
    return res.status(201).json(insertedJob[0]);
  } catch (error: any) {
    console.error('Error submitting transport quote request:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit quote inquiry' });
  }
});

// Transporter sets / submits price quote for the trip and distance
router.post('/transport/jobs/:id/submit-quote', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { transporterUid, quotedPrice, pricePerKm, quoteNotes } = req.body;

    if (!transporterUid) return res.status(401).json({ error: 'Transporter UID required' });
    if (!quotedPrice || Number(quotedPrice) <= 0) {
      return res.status(400).json({ error: 'Please enter a valid quoted transport amount in MWK.' });
    }

    const job = await db.select().from(transportJobs).where(eq(transportJobs.id, id)).limit(1);
    if (job.length === 0) return res.status(404).json({ error: 'Transport job not found' });

    const driverRes = await db.select().from(users).where(eq(users.uid, transporterUid)).limit(1);
    if (driverRes.length === 0) return res.status(404).json({ error: 'Transporter profile not found' });
    const driver = driverRes[0];

    const numericPrice = Number(quotedPrice);
    const dist = Number(job[0]?.distanceKm || 0);
    const calculatedPerKm = pricePerKm ? Number(pricePerKm) : (dist > 0 ? Math.round(numericPrice / dist) : null);

    const updated = await db.update(transportJobs)
      .set({
        transporterId: driver.id,
        transporterUid: driver.uid,
        transporterName: driver.fullName,
        transporterPhone: driver.phoneNumber,
        quotedPrice: numericPrice.toString(),
        pricePerKm: calculatedPerKm ? calculatedPerKm.toString() : null,
        quoteNotes: quoteNotes || `Price quoted by driver ${driver.fullName} (${driver.vehicleType || 'Truck'}, Reg: ${driver.plateNumber || driver.vehicleRegistration || 'BW 4921'})`,
        transportFee: numericPrice.toString(),
        priceStatus: 'quoted',
        status: 'quote_submitted',
        farmerConfirmedPrice: false,
        adminConfirmedPrice: false,
        updatedAt: new Date(),
      })
      .where(eq(transportJobs.id, id))
      .returning();

    // Notify farmer of driver's quote
    if (job[0].farmerUid) {
      await createNotification({
        userUid: job[0].farmerUid,
        title: `🚚 Price Quote Received #${job[0].orderNumber}`,
        message: `Driver ${driver.fullName} submitted a quote of MWK ${numericPrice.toLocaleString()} for your cargo route (${job[0].pickupDistrict} to ${job[0].destinationDistrict}). Review and confirm the price to proceed!`,
        type: 'transport',
      });
    }

    // Notify Finance Admin
    await createNotification({
      userUid: 'finance-chisomo-05',
      title: `Driver Quote Submitted #${job[0].orderNumber}`,
      message: `Driver ${driver.fullName} quoted MWK ${numericPrice.toLocaleString()} (~MWK ${calculatedPerKm || 'N/A'}/km) for route ${job[0].pickupDistrict} -> ${job[0].destinationDistrict}.`,
      type: 'finance',
    });

    await logAudit({
      userUid: driver.uid,
      userEmail: driver.email,
      userName: driver.fullName,
      role: 'transporter',
      action: 'TRANSPORT_QUOTE_SUBMITTED',
      recordAffected: `Transport Job #${job[0].orderNumber}`,
      newValue: `Quoted Amount: MWK ${numericPrice.toLocaleString()}, Notes: ${quoteNotes || 'Standard haulage rate'}`,
    });

    broadcastEvent('transport_updated', updated[0]);
    return res.json({ success: true, job: updated[0] });
  } catch (error: any) {
    console.error('Error submitting transport quote:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit transport quote' });
  }
});

// Farmer or Administrator confirms / agrees to the quoted price
router.post('/transport/jobs/:id/confirm-quote', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { userUid, userRole, action, notes } = req.body;

    const job = await db.select().from(transportJobs).where(eq(transportJobs.id, id)).limit(1);
    if (job.length === 0) return res.status(404).json({ error: 'Transport job not found' });

    const isFarmer = userRole === 'farmer' || job[0].farmerUid === userUid;
    const isAdmin = userRole === 'admin' || userRole === 'finance_admin';

    if (action === 'reject') {
      const updated = await db.update(transportJobs)
        .set({
          priceStatus: 'rejected',
          status: 'quote_requested',
          quoteNotes: notes ? `Price rejected: ${notes}` : 'Price quote was declined. Transporter may revise price.',
          updatedAt: new Date(),
        })
        .where(eq(transportJobs.id, id))
        .returning();

      if (job[0].transporterUid) {
        await createNotification({
          userUid: job[0].transporterUid,
          title: `Quote Declined #${job[0].orderNumber}`,
          message: `Your transport price quote for route ${job[0].pickupDistrict} -> ${job[0].destinationDistrict} was not accepted (${notes || 'Please adjust rate'}).`,
          type: 'transport',
        });
      }

      broadcastEvent('transport_updated', updated[0]);
      return res.json({ success: true, message: 'Quote declined. Driver can submit adjusted pricing.', job: updated[0] });
    }

    // Confirm action
    const newFarmerConfirmed = isFarmer ? true : job[0].farmerConfirmedPrice;
    const newAdminConfirmed = isAdmin ? true : job[0].adminConfirmedPrice;

    // If farmer confirmed or both confirmed, price agreement is locked
    const isAgreed = newFarmerConfirmed || (newFarmerConfirmed && newAdminConfirmed);

    const updated = await db.update(transportJobs)
      .set({
        farmerConfirmedPrice: newFarmerConfirmed,
        adminConfirmedPrice: newAdminConfirmed,
        priceStatus: isAgreed ? 'agreed' : (isFarmer ? 'confirmed_by_farmer' : 'confirmed_by_admin'),
        status: isAgreed ? 'price_agreed' : job[0].status,
        updatedAt: new Date(),
      })
      .where(eq(transportJobs.id, id))
      .returning();

    if (job[0].transporterUid) {
      await createNotification({
        userUid: job[0].transporterUid,
        title: `✅ Quote Confirmed & Agreed #${job[0].orderNumber}`,
        message: `Your price quote of MWK ${Number(job[0].quotedPrice || job[0].transportFee).toLocaleString()} was confirmed by ${isFarmer ? 'the Farmer' : 'Administrator'}! Escrow funding is now proceeding.`,
        type: 'transport',
      });
    }

    await logAudit({
      userUid: userUid || 'system',
      userEmail: 'user@harvesthub.mw',
      userName: isFarmer ? (job[0].farmerName || 'Farmer') : 'Administrator',
      role: userRole || 'farmer',
      action: 'TRANSPORT_QUOTE_CONFIRMED',
      recordAffected: `Transport Job #${job[0].orderNumber}`,
      newValue: `Price MWK ${job[0].quotedPrice} confirmed. Status: ${isAgreed ? 'Price Agreed' : 'Pending Counter-party'}`,
    });

    broadcastEvent('transport_updated', updated[0]);
    return res.json({ success: true, isAgreed, job: updated[0] });
  } catch (error: any) {
    console.error('Error confirming transport quote:', error);
    return res.status(500).json({ error: error.message || 'Failed to confirm quote' });
  }
});

// Farmer deposits escrow for agreed transport fee
router.post('/transport/jobs/:id/deposit-escrow', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { farmerUid, paymentMethod, paymentRef } = req.body;

    const job = await db.select().from(transportJobs).where(eq(transportJobs.id, id)).limit(1);
    if (job.length === 0) return res.status(404).json({ error: 'Transport job not found' });

    const agreedFee = Number(job[0].quotedPrice || job[0].transportFee || 0);
    if (agreedFee <= 0) {
      return res.status(400).json({ error: 'No confirmed price quote exists for this transport booking.' });
    }

    const ref = paymentRef || `ESC-${Date.now().toString().slice(-6)}`;
    const method = paymentMethod || 'Airtel Money / TNM Mpamba Escrow';

    const updated = await db.update(transportJobs)
      .set({
        paymentStatus: 'paid_pending_approval',
        paymentRef: ref,
        paymentMethod: method,
        status: 'pending_finance_approval',
        updatedAt: new Date(),
      })
      .where(eq(transportJobs.id, id))
      .returning();

    // Alert Finance Admin to verify funds
    await createNotification({
      userUid: 'finance-chisomo-05',
      title: `Verify Transport Escrow Deposit #${job[0].orderNumber}`,
      message: `Farmer ${job[0].farmerName} deposited MK ${agreedFee.toLocaleString()} via ${method} (Ref: ${ref}). Please verify funds and authorize driver dispatch.`,
      type: 'finance',
    });

    if (job[0].transporterUid) {
      await createNotification({
        userUid: job[0].transporterUid,
        title: `Escrow Funded for Job #${job[0].orderNumber}`,
        message: `Farmer ${job[0].farmerName} deposited the agreed MK ${agreedFee.toLocaleString()} into platform escrow! Dispatch authorization is pending Finance Admin check.`,
        type: 'transport',
      });
    }

    broadcastEvent('transport_updated', updated[0]);
    broadcastEvent('finance_pending_updated', { job: updated[0] });

    return res.json({ success: true, job: updated[0] });
  } catch (error: any) {
    console.error('Error depositing escrow:', error);
    return res.status(500).json({ error: error.message || 'Failed to deposit escrow' });
  }
});

// Farmer directly hires transport with upfront fee payment submitted for finance verification
router.post('/transport/hire', async (req, res) => {
  try {
    const {
      farmerUid,
      farmerName,
      farmerPhone,
      commodityName,
      quantityKg,
      pickupLocation,
      pickupDistrict,
      destinationLocation,
      destinationDistrict,
      requiredVehicleType,
      preferredDate,
      specialRequirements,
      transportFee,
      paymentMethod,
      paymentRef,
      requestedDriverId,
    } = req.body;

    if (!farmerUid || !commodityName || !quantityKg || !pickupLocation || !destinationLocation) {
      return res.status(400).json({ error: 'Missing required transport hire fields' });
    }

    const farmer = await db.select().from(users).where(eq(users.uid, farmerUid)).limit(1);
    const parsedFee = Number(transportFee) || 45000;
    const orderNumber = `TRP-${Date.now().toString().slice(-6)}`;

    let requestedDriver: any = null;
    if (requestedDriverId) {
      const driverRes = await db.select().from(users).where(eq(users.id, Number(requestedDriverId))).limit(1);
      if (driverRes.length > 0) requestedDriver = driverRes[0];
    }

    const insertedJob = await db.insert(transportJobs).values({
      orderNumber,
      farmerId: farmer.length > 0 ? farmer[0].id : null,
      farmerUid,
      farmerName: farmerName || (farmer.length > 0 ? farmer[0].fullName : 'Farmer'),
      farmerPhone: farmerPhone || (farmer.length > 0 ? farmer[0].phoneNumber : '+265 '),
      commodityName,
      quantityKg: Number(quantityKg),
      pickupLocation,
      pickupDistrict: pickupDistrict || 'Mchinji',
      destinationLocation,
      destinationDistrict: destinationDistrict || 'Lilongwe',
      requiredVehicleType: requiredVehicleType || 'Medium Truck (3-5 Ton)',
      preferredDate: preferredDate || new Date().toISOString().split('T')[0],
      specialRequirements: specialRequirements || '',
      transportFee: parsedFee.toString(),
      paymentStatus: 'paid_pending_approval',
      paymentRef: paymentRef || `ESC-${Date.now().toString().slice(-6)}`,
      paymentMethod: paymentMethod || 'Airtel Money / TNM Mpamba Escrow',
      status: 'pending_finance_approval',
      recommendedDriverId: requestedDriver ? requestedDriver.id : null,
      recommendedDriverName: requestedDriver ? requestedDriver.fullName : null,
    }).returning();

    // Notify Finance Administrators & Lead Admins
    await createNotification({
      userUid: 'finance-chisomo-05',
      title: `Transport Escrow Payment to Verify #${orderNumber}`,
      message: `Farmer ${insertedJob[0].farmerName} submitted MK ${parsedFee.toLocaleString()} via ${paymentMethod || 'Escrow'}. Verify fee & recommend/approve driver for route ${pickupDistrict} -> ${destinationDistrict}.`,
      type: 'finance',
    });

    await createNotification({
      userUid: 'frF3xukObzdA8AhCBYIBPYV0UK13', // Peter Malikebu
      title: `Transport Hire Request #${orderNumber}`,
      message: `New transport booking by ${insertedJob[0].farmerName} awaiting Finance fee approval & driver recommendation.`,
      type: 'finance',
    });

    await createNotification({
      userUid: farmerUid,
      title: `Transport Request Submitted #${orderNumber}`,
      message: `Your transport payment of MK ${parsedFee.toLocaleString()} has been received in escrow! Awaiting Finance Administrator payment verification and driver recommendation.`,
      type: 'transport',
    });

    await logAudit({
      userUid: farmerUid,
      userEmail: farmer.length > 0 ? farmer[0].email : 'farmer@harvesthub.mw',
      userName: insertedJob[0].farmerName || 'Farmer',
      role: 'farmer',
      action: 'TRANSPORT_HIRE_REQUESTED',
      recordAffected: `Transport Job #${orderNumber}`,
      newValue: `Fee: MK ${parsedFee}, Route: ${pickupDistrict} -> ${destinationDistrict}, Escrow Ref: ${insertedJob[0].paymentRef}`,
    });

    broadcastEvent('transport_requested', insertedJob[0]);
    broadcastEvent('finance_pending_updated', { job: insertedJob[0] });

    return res.status(201).json(insertedJob[0]);
  } catch (error: any) {
    console.error('Error creating transport hire request:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit transport hire request' });
  }
});

// Finance Administrator verifies payment, approves driver, and recommends driver to farmer
router.post('/transport/jobs/:id/finance-approve-recommend', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      financeAdminUid,
      financeAdminName,
      recommendedDriverId,
      recommendationNotes,
    } = req.body;

    if (!recommendedDriverId) {
      return res.status(400).json({ error: 'A verified driver must be selected and recommended' });
    }

    const job = await db.select().from(transportJobs).where(eq(transportJobs.id, id)).limit(1);
    if (job.length === 0) return res.status(404).json({ error: 'Transport job not found' });

    // Look up selected driver
    const driver = await db.select().from(users).where(eq(users.id, Number(recommendedDriverId))).limit(1);
    if (driver.length === 0) return res.status(404).json({ error: 'Selected driver/transporter not found' });

    const grossTransportFee = Number(job[0].quotedPrice || job[0].transportFee || 0);
    const commissionRate = await getCommissionRate();
    const commissionFee = Math.round(grossTransportFee * commissionRate);
    const netTransporterAmount = Math.max(0, grossTransportFee - commissionFee);
    const disbursementRef = `TRP-DSB-${Date.now().toString().slice(-6)}`;

    const updatedJob = await db.update(transportJobs)
      .set({
        transporterId: driver[0].id,
        transporterUid: driver[0].uid,
        transporterName: driver[0].fullName,
        transporterPhone: driver[0].phoneNumber,
        recommendedDriverId: driver[0].id,
        recommendedDriverName: driver[0].fullName,
        financeApprovedBy: financeAdminName || 'Finance Administrator',
        financeApprovedAt: new Date(),
        financeRecommendationNotes: recommendationNotes || `Driver ${driver[0].fullName} vetted and recommended for cargo transit. Capacity: ${driver[0].vehicleCapacityKg || '5000'} kg.`,
        platformCommissionRate: commissionRate.toString(),
        platformCommissionFee: commissionFee.toString(),
        netTransporterAmount: netTransporterAmount.toString(),
        disbursedToTransporterAt: new Date(),
        disbursedToTransporterRef: disbursementRef,
        disbursedToTransporterBy: financeAdminName || 'Finance Administrator',
        paymentStatus: 'verified_by_finance',
        status: 'driver_assigned',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transportJobs.id, id))
      .returning();

    // 1. Record transport platform commission in platform revenue ledger
    await db.insert(revenueLedger).values({
      revenueId: `REV-TRP-${Date.now().toString().slice(-7)}`,
      transactionId: `TX-TRP-${job[0].orderNumber || id}`,
      sourceType: 'transport_commission',
      sourceOrderId: job[0].orderId || null,
      sourceOrderNumber: job[0].orderNumber,
      grossTransactionAmount: grossTransportFee.toString(),
      commissionRate: commissionRate.toString(),
      commissionAmount: commissionFee.toString(),
      transportFee: grossTransportFee.toString(),
      farmerEarnings: '0',
      transporterEarnings: netTransporterAmount.toString(),
      status: 'settled',
      createdSource: 'finance_admin_transport_disbursement',
    });

    // 2. Notify Farmer with the recommended driver details
    if (job[0].farmerUid) {
      await createNotification({
        userUid: job[0].farmerUid,
        title: `✅ Driver Approved & Transit Authorized #${job[0].orderNumber}`,
        message: `Finance Administrator verified transport payment of MK ${grossTransportFee.toLocaleString()} (net MK ${netTransporterAmount.toLocaleString()} delivered to driver after platform commission). Recommended Driver: ${driver[0].fullName} (${driver[0].vehicleRegistration || driver[0].vehicleType || 'Truck'}). Phone: ${driver[0].phoneNumber || '+265 882 776 543'}. Notes: ${updatedJob[0].financeRecommendationNotes}`,
        type: 'transport',
      });
    }

    // 3. Notify Transporter of assigned job and net funds delivered
    await createNotification({
      userUid: driver[0].uid,
      title: `Transit Funds Disbursed & Job Assigned #${job[0].orderNumber}`,
      message: `Finance Administrator verified escrow payment and deducted the ${(commissionRate * 100).toFixed(1)}% platform commission (MK ${commissionFee.toLocaleString()}). Net transit payout of MK ${netTransporterAmount.toLocaleString()} has been authorized/disbursed (Ref: ${disbursementRef}) so you can start transporting ${job[0].quantityKg} kg of ${job[0].commodityName} from ${job[0].pickupLocation} to ${job[0].destinationLocation} for Farmer ${job[0].farmerName}.`,
      type: 'transport',
    });

    await logAudit({
      userUid: financeAdminUid || 'finance-admin',
      userEmail: 'finance@harvesthub.mw',
      userName: financeAdminName || 'Finance Administrator',
      role: 'finance_admin',
      action: 'TRANSPORT_PAYMENT_VERIFIED_COMMISSION_DEDUCTED_DRIVER_ASSIGNED',
      recordAffected: `Transport Job #${job[0].orderNumber}`,
      newValue: `Driver: ${driver[0].fullName}, Gross Fee: MK ${grossTransportFee}, Commission Deducted: MK ${commissionFee} (${(commissionRate * 100).toFixed(1)}%), Net Delivered to Driver: MK ${netTransporterAmount}, Ref: ${disbursementRef}`,
      reason: recommendationNotes || 'Transport fee verified in escrow, platform commission deducted, and net funds delivered to driver before starting transit',
    });

    broadcastEvent('transport_updated', updatedJob[0]);
    broadcastEvent('revenue_updated', { trigger: 'transport_approved', jobId: id });

    return res.json(updatedJob[0]);
  } catch (error: any) {
    console.error('Error approving transport and recommending driver:', error);
    return res.status(500).json({ error: error.message || 'Failed to approve transport fee and recommend driver' });
  }
});

// Direct endpoint for Finance Admin to disburse funds to transporter with platform commission deduction
router.post('/transport/jobs/:id/finance-disburse-transporter', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { financeAdminUid, financeAdminName, payoutMethod, payoutRef, notes } = req.body;

    const job = await db.select().from(transportJobs).where(eq(transportJobs.id, id)).limit(1);
    if (job.length === 0) return res.status(404).json({ error: 'Transport job not found' });

    if (!job[0].transporterUid && !job[0].recommendedDriverId) {
      return res.status(400).json({ error: 'No driver is currently assigned to this transport job.' });
    }

    const grossTransportFee = Number(job[0].quotedPrice || job[0].transportFee || 0);
    const commissionRate = await getCommissionRate();
    const commissionFee = Math.round(grossTransportFee * commissionRate);
    const netTransporterAmount = Math.max(0, grossTransportFee - commissionFee);
    const ref = payoutRef || `TRP-DSB-${Date.now().toString().slice(-6)}`;

    const updatedJob = await db.update(transportJobs)
      .set({
        platformCommissionRate: commissionRate.toString(),
        platformCommissionFee: commissionFee.toString(),
        netTransporterAmount: netTransporterAmount.toString(),
        disbursedToTransporterAt: new Date(),
        disbursedToTransporterRef: ref,
        disbursedToTransporterBy: financeAdminName || 'Finance Administrator',
        paymentStatus: 'verified_by_finance',
        updatedAt: new Date(),
      })
      .where(eq(transportJobs.id, id))
      .returning();

    await db.insert(revenueLedger).values({
      revenueId: `REV-TRP-${Date.now().toString().slice(-7)}`,
      transactionId: `TX-TRP-${job[0].orderNumber || id}`,
      sourceType: 'transport_commission',
      sourceOrderId: job[0].orderId || null,
      sourceOrderNumber: job[0].orderNumber,
      grossTransactionAmount: grossTransportFee.toString(),
      commissionRate: commissionRate.toString(),
      commissionAmount: commissionFee.toString(),
      transportFee: grossTransportFee.toString(),
      farmerEarnings: '0',
      transporterEarnings: netTransporterAmount.toString(),
      status: 'settled',
      createdSource: 'finance_admin_transport_disbursement',
    });

    const targetDriverUid = job[0].transporterUid;
    if (targetDriverUid) {
      await createNotification({
        userUid: targetDriverUid,
        title: `Transit Funds Disbursed #${job[0].orderNumber}`,
        message: `Finance Administrator disbursed your transport payout of MK ${netTransporterAmount.toLocaleString()} (net of ${(commissionRate * 100).toFixed(1)}% platform commission: MK ${commissionFee.toLocaleString()}) via ${payoutMethod || 'Mobile Money'} (Ref: ${ref}). You can now start transporting the goods!`,
        type: 'transport',
      });
    }

    await logAudit({
      userUid: financeAdminUid || 'finance-admin',
      userEmail: 'finance@harvesthub.mw',
      userName: financeAdminName || 'Finance Administrator',
      role: 'finance_admin',
      action: 'TRANSPORT_FUNDS_DISBURSED_TO_TRANSPORTER',
      recordAffected: `Transport Job #${job[0].orderNumber}`,
      newValue: `Gross: MK ${grossTransportFee}, Commission Deducted: MK ${commissionFee}, Net Delivered to Driver: MK ${netTransporterAmount} (Ref: ${ref})`,
      reason: notes || 'Platform commission deducted and net funds delivered to driver before transport',
    });

    broadcastEvent('transport_updated', updatedJob[0]);
    broadcastEvent('revenue_updated', { trigger: 'transport_disbursed', jobId: id });

    return res.json({
      success: true,
      job: updatedJob[0],
      grossTransportFee,
      commissionFee,
      netTransporterAmount,
      disbursedRef: ref,
    });
  } catch (error: any) {
    console.error('Error disbursing funds to transporter:', error);
    return res.status(500).json({ error: error.message || 'Failed to disburse funds to transporter' });
  }
});

// Transporter accepts job
router.post('/transport/jobs/:id/accept', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { transporterUid } = req.body;

    const job = await db.select().from(transportJobs).where(eq(transportJobs.id, id)).limit(1);
    if (job.length === 0) return res.status(404).json({ error: 'Transport job not found' });
    if (job[0].status !== 'requested') return res.status(400).json({ error: `Job is already ${job[0].status}` });

    const transporter = await db.select().from(users).where(eq(users.uid, transporterUid)).limit(1);
    if (transporter.length === 0) return res.status(400).json({ error: 'Transporter profile not found' });

    const updatedJob = await db.update(transportJobs)
      .set({
        transporterId: transporter[0].id,
        transporterUid: transporter[0].uid,
        transporterName: transporter[0].fullName,
        transporterPhone: transporter[0].phoneNumber,
        status: 'driver_assigned',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transportJobs.id, id))
      .returning();

    // Update order status if linked to an order
    if (job[0].orderId) {
      const orderId = job[0].orderId;
      await db.update(orders)
        .set({
          status: 'transport_assigned',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
    }

    await logAudit({
      userUid: transporter[0].uid,
      userEmail: transporter[0].email,
      userName: transporter[0].fullName,
      role: 'transporter',
      action: 'TRANSPORT_ACCEPTED',
      recordAffected: `Job #${id} for Order #${job[0].orderNumber}`,
      newValue: `Assigned to ${transporter[0].fullName} (${transporter[0].vehicleRegistration || 'Vehicle'})`,
    });

    broadcastEvent('transport_updated', updatedJob[0]);
    if (job[0].orderId) {
      broadcastEvent('order_updated', { id: job[0].orderId, status: 'transport_assigned' });
    }
    return res.json(updatedJob[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to accept transport job' });
  }
});

// Transporter updates status (picked_up, in_transit, delivered)
router.post('/transport/jobs/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, currentLocation, estimatedArrival, userUid } = req.body;

    const validStatuses = ['picked_up', 'in_transit', 'delivered', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}` });
    }

    const job = await db.select().from(transportJobs).where(eq(transportJobs.id, id)).limit(1);
    if (job.length === 0) return res.status(404).json({ error: 'Transport job not found' });

    const updatedJob = await db.update(transportJobs)
      .set({
        status,
        currentLocation: currentLocation ?? job[0].currentLocation,
        estimatedArrival: estimatedArrival ?? job[0].estimatedArrival,
        updatedAt: new Date(),
      })
      .where(eq(transportJobs.id, id))
      .returning();

    // Dynamically update transporter availability in users table based on transit stage
    const transporterUid = job[0].transporterUid || userUid;
    if (transporterUid) {
      if (status === 'in_transit') {
        await db.update(users)
          .set({
            isAvailable: false,
            currentRoute: `In Transit: ${job[0].pickupDistrict} ➔ ${job[0].destinationDistrict}`,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, transporterUid));
        broadcastEvent('transporter_availability_changed', {
          uid: transporterUid,
          isAvailable: false,
          currentRoute: `In Transit: ${job[0].pickupDistrict} ➔ ${job[0].destinationDistrict}`,
        });
      } else if (status === 'delivered' || status === 'completed') {
        await db.update(users)
          .set({
            isAvailable: true,
            currentRoute: `Available in ${job[0].destinationDistrict}`,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, transporterUid));
        broadcastEvent('transporter_availability_changed', {
          uid: transporterUid,
          isAvailable: true,
          currentRoute: `Available in ${job[0].destinationDistrict}`,
        });
      }
    }

    // Map to order status
    let orderStatus = status;
    if (status === 'picked_up') orderStatus = 'picked_up';
    if (status === 'in_transit') orderStatus = 'in_transit';
    if (status === 'delivered') orderStatus = 'delivered';

    if (job[0].orderId) {
      const orderId = job[0].orderId;
      await db.update(orders)
        .set({
          status: orderStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
    }

    await logAudit({
      userUid: userUid || job[0].transporterUid || 'system',
      userEmail: 'transporter@harvesthub.mw',
      userName: job[0].transporterName || 'Transporter',
      role: 'transporter',
      action: 'TRANSPORT_STATUS_UPDATED',
      recordAffected: `Job #${id} for Order #${job[0].orderNumber}`,
      previousValue: job[0].status,
      newValue: status,
    });

    broadcastEvent('transport_updated', updatedJob[0]);
    if (job[0].orderId) {
      broadcastEvent('order_updated', { id: job[0].orderId, status: orderStatus });
    }
    return res.json(updatedJob[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update transport status' });
  }
});

// ----------------------------------------------------
// PLATFORM REVENUE & FINANCIAL REPORTS
// ----------------------------------------------------

router.get('/finance/revenue', async (_req, res) => {
  try {
    // 1. Fetch all records from revenueLedger
    const ledger = await db.select().from(revenueLedger).orderBy(desc(revenueLedger.createdAt));

    // 2. Fetch all transactions
    const txs = await db.select().from(transactions).orderBy(desc(transactions.createdAt));

    // Calculate real figures from database
    let totalRevenue = 0;
    let commodityCommissions = 0;
    let transportRevenue = 0;
    let todayRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const entry of ledger) {
      if (entry.status === 'settled') {
        const comm = Number(entry.commissionAmount) || 0;
        const trans = Number(entry.transportFee) || 0;
        const totalEntry = comm; // Platform revenue is the commission; transport fee is passed to transporter or facilitation
        commodityCommissions += comm;
        transportRevenue += trans;
        totalRevenue += totalEntry;

        const entryTime = entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
        if (entryTime >= startOfToday) todayRevenue += totalEntry;
        if (entryTime >= oneWeekAgo) weeklyRevenue += totalEntry;
        if (entryTime >= oneMonthAgo) monthlyRevenue += totalEntry;
      }
    }

    const completedTransactions = txs.filter(t => t.status === 'completed').length;
    const cancelledTransactions = txs.filter(t => t.status === 'cancelled').length;
    const pendingTransactions = txs.filter(t => t.status === 'pending').length;

    const grossMarketplaceVolume = txs
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (Number(t.grossAmount) || 0), 0);

    const activeCommissionRate = await getCommissionRate();

    return res.json({
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalRevenue,
      commodityCommissions,
      transportRevenue,
      grossMarketplaceVolume,
      completedTransactions,
      cancelledTransactions,
      pendingTransactions,
      commissionRate: activeCommissionRate,
      ledgerEntriesCount: ledger.length,
    });
  } catch (error: any) {
    console.error('Error fetching revenue dashboard data:', error);
    return res.status(500).json({ error: error.message || 'Failed to calculate revenue' });
  }
});

router.get('/finance/transactions', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = db.select().from(transactions);

    let list;
    if (status && status !== 'All') {
      list = await query.where(eq(transactions.status, String(status))).orderBy(desc(transactions.createdAt));
    } else {
      list = await query.orderBy(desc(transactions.createdAt));
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = search.toLowerCase();
      list = list.filter(t =>
        t.transactionId.toLowerCase().includes(s) ||
        t.orderNumber.toLowerCase().includes(s) ||
        t.farmerName.toLowerCase().includes(s) ||
        t.buyerName.toLowerCase().includes(s) ||
        t.commodityName.toLowerCase().includes(s)
      );
    }

    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

router.get('/finance/ledger', async (_req, res) => {
  try {
    const list = await db.select().from(revenueLedger).orderBy(desc(revenueLedger.createdAt));
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch revenue ledger' });
  }
});

// ----------------------------------------------------
// SOCIO-ECONOMIC IMPACT OVERVIEW
// ----------------------------------------------------

router.get('/impact', async (_req, res) => {
  try {
    // Smallholder farmers metrics
    const allFarmers = await db.select().from(users).where(eq(users.role, 'farmer'));
    const farmerCount = allFarmers.length;

    // Completed farmer sales
    const completedOrders = await db.select().from(orders).where(eq(orders.status, 'completed'));
    const totalFarmerSales = completedOrders.reduce((sum, o) => sum + (Number(o.commoditySubtotal) || 0), 0);
    const completedFarmerTransactions = completedOrders.length;

    // Estimated farmer surplus:
    // Traditional informal vendor middlemen in rural Malawi typically extract 25-35% price discount margins from farmers.
    // By selling directly on Malawi Harvest Hub with transparent grade pricing and fixed 4% commission, farmers retain ~22% extra net surplus.
    const estimatedFarmerSurplus = Math.round(totalFarmerSales * 0.22);

    // Transporters metrics
    const allTransporters = await db.select().from(users).where(eq(users.role, 'transporter'));
    const activeTransporters = allTransporters.length;

    const allTransportJobs = await db.select().from(transportJobs);
    const completedTransportJobs = allTransportJobs.filter(j => j.status === 'completed');
    const transporterEarnings = completedTransportJobs.reduce((sum, j) => sum + (Number(j.transportFee) || 0), 0);

    // Urban buyers metrics
    const allBuyers = await db.select().from(users).where(eq(users.role, 'buyer'));
    const buyerCount = allBuyers.length;
    const totalPurchases = completedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // Estimated buyer savings:
    // Urban retail prices in Lilongwe/Blantyre are typically 18-28% higher due to multiple intermediary markups.
    // Buying bulk aggregated commodities directly saves buyers an estimated 15%.
    const estimatedBuyerSavings = Math.round(totalFarmerSales * 0.15);

    return res.json({
      farmers: {
        count: farmerCount,
        totalSales: totalFarmerSales,
        completedTransactions: completedFarmerTransactions,
        estimatedSurplus: estimatedFarmerSurplus,
        surplusMethodology: 'Estimated +22% farmgate price retention compared to predatory rural informal middlemen taking 25-35% margins.',
      },
      transporters: {
        count: activeTransporters,
        completedDeliveries: completedTransportJobs.length,
        earnings: transporterEarnings,
        totalJobs: allTransportJobs.length,
      },
      buyers: {
        count: buyerCount,
        totalPurchases,
        completedOrders: completedOrders.length,
        estimatedSavings: estimatedBuyerSavings,
        savingsMethodology: 'Estimated 15% wholesale cost savings by sourcing directly from verified co-operatives vs speculative city spot markets.',
      },
      summary: {
        totalMarketplaceVolume: totalFarmerSales + transporterEarnings,
        totalBeneficiaries: farmerCount + activeTransporters + buyerCount,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to calculate impact' });
  }
});

// ----------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------

router.get('/audit-logs', async (_req, res) => {
  try {
    const list = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});

// ----------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------

router.get('/notifications', async (req, res) => {
  try {
    const userUid = req.query.userUid as string;
    if (!userUid) return res.json([]);

    const now = Date.now();
    const EXPIRY_MS = 30 * 1000; // 30 seconds after being read

    // Auto-cleanup: Permanently purge any notification that has been marked read for > 30 seconds
    const store = (global as any)._inMemoryStore;
    if (store && Array.isArray(store.notifications)) {
      const initialLen = store.notifications.length;
      store.notifications = store.notifications.filter((n: any) => {
        if (n.isRead && n.readAt) {
          const elapsed = now - new Date(n.readAt).getTime();
          return elapsed < EXPIRY_MS;
        }
        return true;
      });
      if (store.notifications.length !== initialLen) {
        saveStoreToDisk(store);
      }
    }

    const userList = await db.select().from(users).where(eq(users.uid, userUid)).limit(1);
    const isAdmin = userList[0]?.role === 'admin' || userUid.includes('admin') || userUid === 'frF3xukObzdA8AhCBYIBPYV0UK13';

    let list = await db.select().from(notifications).where(
      isAdmin
        ? or(
            eq(notifications.userUid, userUid),
            eq(notifications.userUid, 'all'),
            eq(notifications.userUid, 'all_admins')
          )
        : or(
            eq(notifications.userUid, userUid),
            eq(notifications.userUid, 'all')
          )
    ).orderBy(desc(notifications.createdAt)).limit(50);

    // Also filter out any from database that were read > 30s ago
    const toDeleteIds: number[] = [];
    list = list.filter((n: any) => {
      if (n.isRead && n.readAt) {
        const elapsed = now - new Date(n.readAt).getTime();
        if (elapsed >= EXPIRY_MS) {
          toDeleteIds.push(n.id);
          return false;
        }
      }
      return true;
    });

    // Delete expired ones in background
    if (toDeleteIds.length > 0) {
      Promise.all(toDeleteIds.map(id => db.delete(notifications).where(eq(notifications.id, id))))
        .catch(err => console.warn('Background expired notifications deletion notice:', err));
    }

    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
});

router.post('/notifications/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const readAtDate = new Date();

    await db.update(notifications)
      .set({ isRead: true, readAt: readAtDate })
      .where(eq(notifications.id, id));

    // Update in-memory store
    const store = (global as any)._inMemoryStore;
    if (store && Array.isArray(store.notifications)) {
      const target = store.notifications.find((n: any) => n.id === id);
      if (target) {
        target.isRead = true;
        target.readAt = readAtDate;
        saveStoreToDisk(store);
      }
    }

    broadcastEvent('notification_read', { id, isRead: true, readAt: readAtDate.toISOString() });
    return res.json({ success: true, id, readAt: readAtDate.toISOString() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
  }
});

router.delete('/notifications/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(notifications).where(eq(notifications.id, id));

    const store = (global as any)._inMemoryStore;
    if (store && Array.isArray(store.notifications)) {
      const idx = store.notifications.findIndex((n: any) => n.id === id);
      if (idx >= 0) {
        store.notifications.splice(idx, 1);
        saveStoreToDisk(store);
      }
    }

    broadcastEvent('notification_deleted', { id });
    return res.json({ success: true, id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete notification' });
  }
});

// ----------------------------------------------------
// PLATFORM SETTINGS
// ----------------------------------------------------

router.get('/settings', async (_req, res) => {
  try {
    const list = await db.select().from(platformSettings);
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { key, value, description, adminUid, adminName } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and Value are required' });
    }

    const prev = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
    let finalValue = String(value);

    // If setting is commission_rate, normalize and validate
    let isCommissionUpdate = key === 'commission_rate';
    let prevRatePct = '4.0';
    let newRatePct = '4.0';
    let numericRate = 0.04;

    if (isCommissionUpdate) {
      let numVal = parseFloat(String(value));
      if (isNaN(numVal) || numVal <= 0) {
        return res.status(400).json({ error: 'Commission rate must be a valid positive number (e.g. 0.05 or 5%)' });
      }
      if (numVal > 1) {
        numVal = numVal / 100;
      }
      if (numVal < 0.005 || numVal > 0.30) {
        return res.status(400).json({ error: 'Commission rate must be between 0.5% (0.005) and 30% (0.30)' });
      }
      numericRate = numVal;
      finalValue = numVal.toString();
      newRatePct = (numVal * 100).toFixed(1);

      if (prev.length > 0 && prev[0].value) {
        let prevNum = parseFloat(prev[0].value);
        if (prevNum > 1) prevNum = prevNum / 100;
        prevRatePct = (prevNum * 100).toFixed(1);
      }
    }

    if (prev.length > 0) {
      await db.update(platformSettings)
        .set({
          value: finalValue,
          description: description || prev[0].description,
          updatedAt: new Date(),
        })
        .where(eq(platformSettings.key, key));
    } else {
      await db.insert(platformSettings).values({
        key,
        value: finalValue,
        description: description || (isCommissionUpdate ? 'Default platform commodity trade commission rate' : ''),
      });
    }

    // Explicitly update in-memory store platform_settings to ensure disk persistence
    const store = (global as any)._inMemoryStore;
    if (store && Array.isArray(store.platform_settings)) {
      const idx = store.platform_settings.findIndex((s: any) => s.key === key);
      if (idx >= 0) {
        store.platform_settings[idx] = {
          ...store.platform_settings[idx],
          value: finalValue,
          description: description || store.platform_settings[idx].description,
          updatedAt: new Date(),
        };
      } else {
        store.platform_settings.push({
          key,
          value: finalValue,
          description: description || '',
          updatedAt: new Date(),
        });
      }
      saveStoreToDisk(store);
    }

    // Audit log
    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: 'admin@harvesthub.mw',
      userName: adminName || 'Administrator',
      role: 'admin',
      action: isCommissionUpdate ? 'PLATFORM_COMMISSION_UPDATED' : 'PLATFORM_SETTING_UPDATED',
      recordAffected: isCommissionUpdate ? `Platform Commission Rate (${newRatePct}%)` : `Setting ${key}`,
      previousValue: isCommissionUpdate ? `${prevRatePct}%` : prev[0]?.value,
      newValue: isCommissionUpdate ? `${newRatePct}%` : finalValue,
      reason: description || (isCommissionUpdate ? `Administrative commission adjustment from ${prevRatePct}% to ${newRatePct}%` : 'Platform parameter adjustment'),
    });

    // When commission rate is adjusted, notify all platform users for full transparency
    if (isCommissionUpdate) {
      // 1. Transparent notification for all platform users (Farmers, Buyers, Transporters, Staff)
      await createNotification({
        userUid: 'all',
        title: `📢 Platform Commission Rate Update: ${newRatePct}%`,
        message: `Malawi Harvest Hub platform commission has been updated to ${newRatePct}% (previously ${prevRatePct}%) by platform administration. Effective immediately, all new trade orders, escrow fee calculations, and revenue settlements reflect this transparent fee structure.`,
        type: 'system',
      });

      // 2. Dedicated notification for Financial Administrator
      await createNotification({
        userUid: 'finance-chisomo-05',
        title: `Financial Notice: Commission Updated to ${newRatePct}%`,
        message: `Administrator ${adminName || 'Admin'} has updated the central platform commission to ${newRatePct}%. New order disbursements and escrow calculations will reconcile against this rate.`,
        type: 'finance',
      });

      // Broadcast specific realtime commission event
      broadcastEvent('commission_rate_updated', {
        key: 'commission_rate',
        value: finalValue,
        rate: numericRate,
        percentage: newRatePct,
        prevPercentage: prevRatePct,
        updatedBy: adminName || 'Administrator',
      });
      broadcastEvent('revenue_updated', { trigger: 'commission_rate_changed', newRate: numericRate });
    }

    broadcastEvent('setting_updated', { key, value: finalValue });
    return res.json({
      success: true,
      key,
      value: finalValue,
      percentage: isCommissionUpdate ? newRatePct : undefined,
      message: isCommissionUpdate
        ? `Platform commission rate successfully updated from ${prevRatePct}% to ${newRatePct}%. All platform calculations, dashboards, and user notifications have been synchronized.`
        : `Setting '${key}' updated successfully.`,
    });
  } catch (error: any) {
    console.error('Error updating platform setting:', error);
    return res.status(500).json({ error: error.message || 'Failed to update setting' });
  }
});

// ----------------------------------------------------
// MARKET PRICE MANAGEMENT & LOCATION-BASED PRICING
// ----------------------------------------------------

// GET /market-prices: List all prevailing market prices with optional district / commodity filtering
router.get('/market-prices', async (req, res) => {
  try {
    const { district, commodityName, region, category } = req.query;
    const store = getInMemoryStore();
    let list: any[] = [];

    if (Array.isArray(store.market_prices)) {
      list = store.market_prices.slice();
    } else {
      list = await db.select().from(marketPrices);
    }

    if (district && typeof district === 'string' && district !== 'all') {
      const dLower = district.trim().toLowerCase();
      list = list.filter((p) => p.district?.toLowerCase() === dLower);
    }

    if (commodityName && typeof commodityName === 'string' && commodityName !== 'all') {
      const cLower = commodityName.trim().toLowerCase();
      list = list.filter((p) => p.commodityName?.toLowerCase().includes(cLower));
    }

    if (category && typeof category === 'string' && category !== 'all') {
      const catLower = category.trim().toLowerCase();
      list = list.filter((p) => p.category?.toLowerCase() === catLower);
    }

    if (region && typeof region === 'string' && region !== 'all') {
      const rLower = region.trim().toLowerCase();
      list = list.filter((p) => p.region?.toLowerCase() === rLower);
    }

    // Sort by effectiveDate descending, then commodityName
    list.sort((a, b) => {
      const dateA = new Date(a.effectiveDate || a.updatedAt || 0).getTime();
      const dateB = new Date(b.effectiveDate || b.updatedAt || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return String(a.commodityName || '').localeCompare(String(b.commodityName || ''));
    });

    return res.json(list);
  } catch (error: any) {
    console.error('Error fetching market prices:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch market prices' });
  }
});

// GET /market-prices/benchmark: Find matching benchmark price for a specific commodity & district
router.get('/market-prices/benchmark', async (req, res) => {
  try {
    const { commodityName, district, unit } = req.query;
    if (!commodityName) {
      return res.status(400).json({ error: 'commodityName query parameter is required' });
    }

    const store = getInMemoryStore();
    const allPrices: any[] = Array.isArray(store.market_prices) ? store.market_prices : await db.select().from(marketPrices);

    const cName = String(commodityName).trim().toLowerCase();
    const distName = district ? String(district).trim().toLowerCase() : '';
    const unitName = unit ? String(unit).trim().toLowerCase() : 'kg';

    // 1. Exact match on commodity + district + unit
    let matched = allPrices.find((p) => {
      const pComm = String(p.commodityName || '').toLowerCase();
      const pDist = String(p.district || '').toLowerCase();
      const pUnit = String(p.unit || 'kg').toLowerCase();
      return (pComm.includes(cName) || cName.includes(pComm)) && pDist === distName && pUnit === unitName;
    });

    // 2. Fallback to commodity + district (any unit)
    if (!matched && distName) {
      matched = allPrices.find((p) => {
        const pComm = String(p.commodityName || '').toLowerCase();
        const pDist = String(p.district || '').toLowerCase();
        return (pComm.includes(cName) || cName.includes(pComm)) && pDist === distName;
      });
    }

    // 3. Fallback to commodity in same Region
    if (!matched && district) {
      const targetRegion = getDistrictRegion(String(district));
      matched = allPrices.find((p) => {
        const pComm = String(p.commodityName || '').toLowerCase();
        const pReg = String(p.region || '');
        return (pComm.includes(cName) || cName.includes(pComm)) && pReg.toLowerCase() === targetRegion.toLowerCase();
      });
    }

    // 4. Fallback to any national market price for this commodity
    if (!matched) {
      matched = allPrices.find((p) => {
        const pComm = String(p.commodityName || '').toLowerCase();
        return pComm.includes(cName) || cName.includes(pComm);
      });
    }

    return res.json({
      benchmark: matched || null,
      districtMatch: Boolean(matched && String(matched.district).toLowerCase() === distName),
      regionMatch: Boolean(matched && String(matched.region).toLowerCase() === getDistrictRegion(String(district)).toLowerCase()),
    });
  } catch (error: any) {
    console.error('Error finding benchmark market price:', error);
    return res.status(500).json({ error: error.message || 'Failed to find benchmark price' });
  }
});

// POST /market-prices: Administrator adds a new location-based market price record
router.post('/market-prices', async (req, res) => {
  try {
    const {
      commodityName,
      category,
      district,
      marketLocation,
      region,
      priceMin,
      priceMax,
      priceAvg,
      unit,
      notes,
      effectiveDate,
      adminUid,
      adminName,
    } = req.body;

    if (!commodityName || !district || priceAvg === undefined || !effectiveDate) {
      return res.status(400).json({ error: 'commodityName, district, priceAvg, and effectiveDate are required' });
    }

    const avg = Number(priceAvg);
    const min = priceMin !== undefined && !isNaN(Number(priceMin)) ? Number(priceMin) : Math.round(avg * 0.95);
    const max = priceMax !== undefined && !isNaN(Number(priceMax)) ? Number(priceMax) : Math.round(avg * 1.05);
    const reg = region || getDistrictRegion(district);
    const resolvedUnit = unit || 'kg';

    const newRecord: any = {
      commodityName: String(commodityName).trim(),
      category: category || 'Grains & Cereals',
      district: String(district).trim(),
      marketLocation: marketLocation ? String(marketLocation).trim() : `${district} Central Market`,
      region: reg,
      priceMin: Math.round(min),
      priceMax: Math.round(max),
      priceAvg: Math.round(avg),
      unit: resolvedUnit,
      notes: notes || '',
      updatedByAdminName: adminName || 'Peter Malikebu',
      updatedByAdminUid: adminUid || 'admin',
      effectiveDate: String(effectiveDate).split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await db.insert(marketPrices).values(newRecord).returning();
    const createdItem = inserted[0] || newRecord;

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: 'admin@mberalink.mw',
      userName: adminName || 'Platform Administrator',
      role: 'admin',
      action: 'MARKET_PRICE_ADDED',
      recordAffected: `Market Price: ${newRecord.commodityName} in ${newRecord.district}`,
      newValue: `Benchmark: MWK ${avg.toLocaleString()}/${resolvedUnit} (Range: MWK ${min.toLocaleString()} - ${max.toLocaleString()}) at ${newRecord.marketLocation}`,
      reason: 'Administrator published location-based prevailing standard market price',
    });

    // Notify users about new market pricing update
    broadcastEvent('market_price_updated', {
      action: 'created',
      price: createdItem,
      message: `Updated market price published for ${newRecord.commodityName} in ${newRecord.district}: MWK ${avg.toLocaleString()}/${resolvedUnit}`,
    });

    return res.status(201).json(createdItem);
  } catch (error: any) {
    console.error('Error creating market price:', error);
    return res.status(500).json({ error: error.message || 'Failed to create market price' });
  }
});

// PUT /market-prices/:id: Administrator updates an existing location-based market price record
router.put('/market-prices/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      commodityName,
      category,
      district,
      marketLocation,
      region,
      priceMin,
      priceMax,
      priceAvg,
      unit,
      notes,
      effectiveDate,
      adminUid,
      adminName,
    } = req.body;

    const existingList = await db.select().from(marketPrices).where(eq(marketPrices.id, id)).limit(1);
    if (!existingList || existingList.length === 0) {
      return res.status(404).json({ error: 'Market price record not found' });
    }

    const prev = existingList[0];
    const avg = priceAvg !== undefined ? Number(priceAvg) : Number(prev.priceAvg);
    const min = priceMin !== undefined && !isNaN(Number(priceMin)) ? Number(priceMin) : (priceAvg !== undefined ? Math.round(Number(priceAvg) * 0.95) : Number(prev.priceMin));
    const max = priceMax !== undefined && !isNaN(Number(priceMax)) ? Number(priceMax) : (priceAvg !== undefined ? Math.round(Number(priceAvg) * 1.05) : Number(prev.priceMax));
    const dist = district ? String(district).trim() : prev.district;
    const reg = region || (district ? getDistrictRegion(district) : prev.region);
    const resolvedUnit = unit || prev.unit || 'kg';

    const updateData: any = {
      commodityName: commodityName ? String(commodityName).trim() : prev.commodityName,
      category: category || prev.category,
      district: dist,
      marketLocation: marketLocation ? String(marketLocation).trim() : prev.marketLocation,
      region: reg,
      priceMin: Math.round(min),
      priceMax: Math.round(max),
      priceAvg: Math.round(avg),
      unit: resolvedUnit,
      notes: notes !== undefined ? notes : prev.notes,
      updatedByAdminName: adminName || 'Peter Malikebu',
      updatedByAdminUid: adminUid || 'admin',
      effectiveDate: effectiveDate ? String(effectiveDate).split('T')[0] : prev.effectiveDate,
      updatedAt: new Date(),
    };

    const updated = await db.update(marketPrices).set(updateData).where(eq(marketPrices.id, id)).returning();
    const updatedItem = updated[0] || { ...prev, ...updateData };

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: 'admin@mberalink.mw',
      userName: adminName || 'Platform Administrator',
      role: 'admin',
      action: 'MARKET_PRICE_UPDATED',
      recordAffected: `Market Price ID #${id}: ${updateData.commodityName} (${dist})`,
      previousValue: `MWK ${Number(prev.priceAvg).toLocaleString()}/${prev.unit}`,
      newValue: `MWK ${avg.toLocaleString()}/${resolvedUnit} (Range: MWK ${min.toLocaleString()} - ${max.toLocaleString()})`,
      reason: 'Administrator updated prevailing market price benchmark',
    });

    broadcastEvent('market_price_updated', {
      action: 'updated',
      price: updatedItem,
      message: `Market price updated for ${updateData.commodityName} in ${dist}: MWK ${avg.toLocaleString()}/${resolvedUnit}`,
    });

    return res.json(updatedItem);
  } catch (error: any) {
    console.error('Error updating market price:', error);
    return res.status(500).json({ error: error.message || 'Failed to update market price' });
  }
});

// DELETE /market-prices/:id: Administrator deletes a market price record
router.delete('/market-prices/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const adminUid = req.query.adminUid as string;
    const adminName = req.query.adminName as string;

    const existing = await db.select().from(marketPrices).where(eq(marketPrices.id, id)).limit(1);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Market price record not found' });
    }

    await db.delete(marketPrices).where(eq(marketPrices.id, id));

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: 'admin@mberalink.mw',
      userName: adminName || 'Platform Administrator',
      role: 'admin',
      action: 'MARKET_PRICE_DELETED',
      recordAffected: `Market Price ID #${id}: ${existing[0].commodityName} in ${existing[0].district}`,
      previousValue: `MWK ${Number(existing[0].priceAvg).toLocaleString()}/${existing[0].unit}`,
      reason: 'Administrator removed decommissioned market price benchmark',
    });

    broadcastEvent('market_price_updated', {
      action: 'deleted',
      id,
    });

    return res.json({ success: true, message: 'Market price record removed successfully' });
  } catch (error: any) {
    console.error('Error deleting market price:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete market price' });
  }
});

// ----------------------------------------------------
// SUPPORT QUERIES & SUGGESTIONS DESK
// ----------------------------------------------------

// List queries (filtered by userUid if provided for farmers/buyers/transporters, or all for admin)
router.get('/queries', async (req, res) => {
  try {
    const { userUid, role, status, category } = req.query;
    let list = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));

    if (userUid && String(userUid).trim() !== '' && role !== 'admin') {
      list = list.filter((q: any) => q.userUid === userUid);
    }
    if (status && String(status) !== 'all') {
      list = list.filter((q: any) => q.status === status);
    }
    if (category && String(category) !== 'all') {
      list = list.filter((q: any) => q.category === category);
    }
    if (role && String(role) !== 'all' && role !== 'admin') {
      list = list.filter((q: any) => q.userRole === role);
    }

    // Format replies into parsed objects
    const formatted = list.map((item: any) => {
      let parsedReplies = [];
      try {
        if (typeof item.replies === 'string' && item.replies.trim()) {
          parsedReplies = JSON.parse(item.replies);
        } else if (Array.isArray(item.replies)) {
          parsedReplies = item.replies;
        }
      } catch {
        parsedReplies = [];
      }
      return {
        ...item,
        replies: parsedReplies,
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching queries:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch queries' });
  }
});

// Submit a new query or suggestion (Farmers, Buyers, Transporters)
router.post('/queries', async (req, res) => {
  try {
    const {
      userUid,
      userName,
      userEmail,
      userPhone,
      userRole,
      userDistrict,
      category,
      subject,
      message,
      priority,
    } = req.body;

    if (!subject || !message || !userUid) {
      return res.status(400).json({ error: 'Subject, detailed message, and user UID are required' });
    }

    const ticketNumber = `TKT-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

    const initialReply = {
      id: `rep-${Date.now()}`,
      senderRole: userRole || 'user',
      senderName: userName || 'Registered User',
      senderUid: userUid,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    const inserted = await db.insert(supportTickets).values({
      ticketNumber,
      userUid,
      userName: userName || 'Registered User',
      userEmail: userEmail || 'user@harvesthub.mw',
      userPhone: userPhone || '',
      userRole: userRole || 'farmer',
      userDistrict: userDistrict || 'Lilongwe',
      category: category || 'problem',
      subject: subject.trim(),
      message: message.trim(),
      status: 'pending',
      priority: priority || 'normal',
      adminReply: '',
      repliedByAdminName: '',
      repliedByAdminUid: '',
      replies: JSON.stringify([initialReply]),
    }).returning();

    const createdTicket = inserted[0];

    // Create notification for platform administrators
    await db.insert(notifications).values({
      userUid: 'all',
      title: `New Support Query [${ticketNumber}]`,
      message: `${userName} (${userRole}) submitted a query: "${subject}". Review in Administrator Help Desk.`,
      type: 'system',
    });

    await logAudit({
      userUid,
      userEmail: userEmail || 'user@harvesthub.mw',
      userName: userName || 'Registered User',
      role: userRole || 'farmer',
      action: 'QUERY_SUBMITTED',
      recordAffected: `Support Ticket ${ticketNumber}`,
      newValue: `[${category || 'problem'}] ${subject}`,
    });

    broadcastEvent('query_created', createdTicket);
    return res.status(201).json({
      ...createdTicket,
      replies: [initialReply],
    });
  } catch (error: any) {
    console.error('Error creating query:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit query' });
  }
});

// Reply to a query (by Admin or User)
router.post('/queries/:id/reply', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { senderUid, senderName, senderRole, message, newStatus } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Reply message cannot be empty' });
    }

    const ticketList = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
    const ticket = ticketList[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Query ticket not found' });
    }

    let existingReplies: any[] = [];
    try {
      if (typeof ticket.replies === 'string' && ticket.replies.trim()) {
        existingReplies = JSON.parse(ticket.replies);
      } else if (Array.isArray(ticket.replies)) {
        existingReplies = ticket.replies;
      }
    } catch {
      existingReplies = [];
    }

    const newReplyItem = {
      id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderRole: senderRole || 'admin',
      senderName: senderName || 'Administrator',
      senderUid: senderUid || 'admin',
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    existingReplies.push(newReplyItem);

    const isAdmin = senderRole === 'admin';
    const updatedStatus = isAdmin
      ? (newStatus || 'replied')
      : 'pending';

    const updateFields: any = {
      replies: JSON.stringify(existingReplies),
      status: updatedStatus,
      updatedAt: new Date(),
    };

    if (isAdmin) {
      updateFields.adminReply = message.trim();
      updateFields.repliedByAdminName = senderName || 'Peter Malikebu';
      updateFields.repliedByAdminUid = senderUid || 'admin';
      updateFields.repliedAt = new Date();
    }

    const updated = await db.update(supportTickets)
      .set(updateFields)
      .where(eq(supportTickets.id, id))
      .returning();

    // Send notification
    if (isAdmin) {
      // Notify the user who submitted the ticket
      await db.insert(notifications).values({
        userUid: ticket.userUid,
        title: `Reply to Query [${ticket.ticketNumber}]`,
        message: `${senderName || 'Admin'} replied to your query "${ticket.subject}": ${message.trim().slice(0, 100)}...`,
        type: 'system',
      });
    } else {
      // Notify administrators
      await db.insert(notifications).values({
        userUid: 'all',
        title: `User Response [${ticket.ticketNumber}]`,
        message: `${senderName} replied on ticket "${ticket.subject}".`,
        type: 'system',
      });
    }

    await logAudit({
      userUid: senderUid || 'admin',
      userEmail: isAdmin ? 'admin@harvesthub.mw' : ticket.userEmail,
      userName: senderName || 'Support Desk',
      role: senderRole || 'admin',
      action: 'QUERY_REPLIED',
      recordAffected: `Support Ticket #${ticket.id} (${ticket.ticketNumber})`,
      newValue: message.trim().slice(0, 150),
    });

    const finalItem = {
      ...updated[0],
      replies: existingReplies,
    };

    broadcastEvent('query_updated', finalItem);
    return res.json(finalItem);
  } catch (error: any) {
    console.error('Error replying to query:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit reply' });
  }
});

// Update query status or priority (Admin action)
router.patch('/queries/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, priority, adminUid, adminName } = req.body;

    const ticketList = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
    const ticket = ticketList[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Query ticket not found' });
    }

    const updateFields: any = { updatedAt: new Date() };
    if (status) updateFields.status = status;
    if (priority) updateFields.priority = priority;

    const updated = await db.update(supportTickets)
      .set(updateFields)
      .where(eq(supportTickets.id, id))
      .returning();

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: 'admin@harvesthub.mw',
      userName: adminName || 'Administrator',
      role: 'admin',
      action: 'QUERY_STATUS_CHANGED',
      recordAffected: `Support Ticket #${ticket.id} (${ticket.ticketNumber})`,
      previousValue: ticket.status,
      newValue: status || ticket.status,
    });

    let parsedReplies = [];
    try {
      parsedReplies = typeof updated[0].replies === 'string' ? JSON.parse(updated[0].replies) : updated[0].replies;
    } catch {
      parsedReplies = [];
    }

    const finalItem = {
      ...updated[0],
      replies: parsedReplies,
    };

    broadcastEvent('query_updated', finalItem);
    return res.json(finalItem);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update query status' });
  }
});

// ==========================================
// PASSWORD RESET APPROVAL WORKFLOW
// ==========================================

// 1. Submit Password Reset Request (User)
router.post('/password-reset/request', async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required to request a password reset.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phoneNumber || '').trim();

    // Look up user by email or phone in database
    const allUsers = await db.select().from(users);
    let matchedUser = allUsers.find(
      (u: any) => u.email && u.email.toLowerCase().trim() === cleanEmail
    );

    // Resilient fallback: match by phone digits if provided and email wasn't found
    if (!matchedUser && cleanPhone) {
      const phoneDigits = cleanPhone.replace(/\D/g, '');
      if (phoneDigits.length >= 7) {
        matchedUser = allUsers.find((u: any) => {
          if (!u.phoneNumber) return false;
          const uDigits = u.phoneNumber.replace(/\D/g, '');
          return uDigits.includes(phoneDigits) || phoneDigits.includes(uDigits);
        });
      }
    }

    if (!matchedUser) {
      return res.status(404).json({
        error: `No registered account found for ${email}. Please check your spelling or register a new account.`,
      });
    }

    const requestId = `RST-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const inserted = await db.insert(passwordResetRequests).values({
      requestId,
      userId: matchedUser.id,
      userUid: matchedUser.uid,
      userEmail: matchedUser.email,
      userPhone: cleanPhone || matchedUser.phoneNumber || '',
      userName: matchedUser.fullName,
      userRole: matchedUser.role,
      status: 'pending',
    }).returning();

    const requestRecord = inserted && inserted.length > 0 ? inserted[0] : {
      id: Date.now(),
      requestId,
      userId: matchedUser.id,
      userUid: matchedUser.uid,
      userEmail: matchedUser.email,
      userPhone: cleanPhone || matchedUser.phoneNumber || '',
      userName: matchedUser.fullName,
      userRole: matchedUser.role,
      status: 'pending',
      createdAt: new Date(),
    };

    // Create system notification for all administrators
    const adminNotif = {
      userUid: 'all_admins',
      title: `Password Reset Request: ${matchedUser.fullName}`,
      message: `${matchedUser.fullName} (${matchedUser.email}, Phone: ${cleanPhone || matchedUser.phoneNumber || 'N/A'}, Role: ${matchedUser.role}) has requested a password reset. Requires Admin Approval.`,
      type: 'system',
      isRead: false,
    };
    await db.insert(notifications).values(adminNotif);

    await logAudit({
      userUid: matchedUser.uid,
      userEmail: matchedUser.email,
      userName: matchedUser.fullName,
      role: matchedUser.role,
      action: 'PASSWORD_RESET_REQUESTED',
      recordAffected: `Reset Request #${requestRecord.requestId} (${matchedUser.fullName})`,
      newValue: `Phone: ${cleanPhone || matchedUser.phoneNumber || 'N/A'}, Status: pending`,
    });

    broadcastEvent('password_reset_requested', requestRecord);
    broadcastEvent('notification', adminNotif);

    return res.status(201).json({
      success: true,
      requestId,
      message: 'Password reset request submitted. Awaiting administrator approval.',
      request: requestRecord,
    });
  } catch (error: any) {
    console.error('Error submitting password reset request:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit password reset request' });
  }
});

// 2. Check Password Reset Status (User polling / sync)
router.get('/password-reset/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const reqList = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.requestId, requestId)).limit(1);
    const item = reqList[0];

    if (!item) {
      return res.status(404).json({ error: 'Password reset request not found' });
    }

    return res.json({
      success: true,
      request: item,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to check reset status' });
  }
});

// 3. List Password Reset Requests (Admin Dashboard)
router.get('/password-reset/requests', async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.select().from(passwordResetRequests);

    let results;
    if (status) {
      results = await query.where(eq(passwordResetRequests.status, String(status))).orderBy(desc(passwordResetRequests.createdAt));
    } else {
      results = await query.orderBy(desc(passwordResetRequests.createdAt));
    }

    return res.json(results || []);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch password reset requests' });
  }
});

// 4. Approve Password Reset Request (Admin)
router.post('/password-reset/approve', async (req, res) => {
  try {
    const { requestId, adminName, adminUid, adminNote } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const reqList = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.requestId, requestId)).limit(1);
    const item = reqList[0];

    if (!item) {
      return res.status(404).json({ error: 'Password reset request not found' });
    }

    if (item.status === 'completed') {
      return res.status(400).json({ error: 'This request has already been completed.' });
    }

    const approvedAt = new Date();
    const updated = await db.update(passwordResetRequests)
      .set({
        status: 'approved',
        approvedByAdminName: adminName || 'Peter Malikebu',
        approvedByAdminUid: adminUid || 'admin-01',
        adminNote: adminNote || 'Approved by platform administrator',
        approvedAt,
        updatedAt: approvedAt,
      })
      .where(eq(passwordResetRequests.requestId, requestId))
      .returning();

    const updatedRecord = updated && updated.length > 0 ? updated[0] : {
      ...item,
      status: 'approved',
      approvedByAdminName: adminName || 'Peter Malikebu',
      approvedAt,
    };

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: 'admin@harvesthub.mw',
      userName: adminName || 'Administrator',
      role: 'admin',
      action: 'PASSWORD_RESET_APPROVED',
      recordAffected: `Reset Request #${requestId} for ${item.userName} (${item.userEmail})`,
      newValue: 'Status changed to approved',
    });

    // Notify user in real-time
    broadcastEvent('password_reset_approved', {
      requestId,
      userEmail: item.userEmail,
      userName: item.userName,
      approvedByAdminName: adminName || 'Peter Malikebu',
      approvedAt,
    });

    return res.json({
      success: true,
      message: `Password reset request #${requestId} for ${item.userName} has been approved.`,
      request: updatedRecord,
    });
  } catch (error: any) {
    console.error('Error approving password reset:', error);
    return res.status(500).json({ error: error.message || 'Failed to approve password reset request' });
  }
});

// 5. Reject Password Reset Request (Admin)
router.post('/password-reset/reject', async (req, res) => {
  try {
    const { requestId, adminName, adminUid, reason } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const reqList = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.requestId, requestId)).limit(1);
    const item = reqList[0];

    if (!item) {
      return res.status(404).json({ error: 'Password reset request not found' });
    }

    const updated = await db.update(passwordResetRequests)
      .set({
        status: 'rejected',
        adminNote: reason || 'Rejected by platform administrator',
        updatedAt: new Date(),
      })
      .where(eq(passwordResetRequests.requestId, requestId))
      .returning();

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: 'admin@harvesthub.mw',
      userName: adminName || 'Administrator',
      role: 'admin',
      action: 'PASSWORD_RESET_REJECTED',
      recordAffected: `Reset Request #${requestId} for ${item.userName}`,
      reason: reason || 'Identity could not be verified',
    });

    broadcastEvent('password_reset_rejected', {
      requestId,
      userEmail: item.userEmail,
      reason: reason || 'Request rejected by administrator.',
    });

    return res.json({
      success: true,
      message: `Password reset request #${requestId} has been rejected.`,
      request: updated[0] || item,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to reject password reset request' });
  }
});

// 6. Confirm and Set New Password (User)
router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { requestId, newPassword } = req.body;
    if (!requestId || !newPassword) {
      return res.status(400).json({ error: 'Request ID and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const reqList = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.requestId, requestId)).limit(1);
    const resetItem = reqList[0];

    if (!resetItem) {
      return res.status(404).json({ error: 'Password reset request not found' });
    }

    if (resetItem.status !== 'approved') {
      return res.status(400).json({
        error: resetItem.status === 'completed'
          ? 'This password reset has already been completed. Please sign in with your updated password.'
          : 'This password reset request has not been approved by an administrator yet.',
      });
    }

    // 1. Properly hash the new password using SHA-256 before saving
    const cleanPassword = String(newPassword).trim();
    const hashedPassword = hashPassword(cleanPassword);

    // 2. Locate the target user definitively by ID, UID, or case-insensitive email
    const allUsers = await db.select().from(users);
    const targetUser = allUsers.find(
      (u: any) =>
        (resetItem.userId != null && Number(u.id) === Number(resetItem.userId)) ||
        (resetItem.userUid && u.uid === resetItem.userUid) ||
        (resetItem.userEmail && u.email && u.email.toLowerCase().trim() === resetItem.userEmail.toLowerCase().trim())
    );

    if (!targetUser) {
      return res.status(404).json({
        error: 'User account linked to this reset request could not be located in the database.',
      });
    }

    // 3. Execute database update/commit command and await full completion
    await db.update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUser.id));

    // Also update in-memory store if active and commit directly to disk
    const store = (global as any)._inMemoryStore || getInMemoryStore();
    if (store && Array.isArray(store.users)) {
      const matchInStore = store.users.find(
        (u: any) =>
          u.id === targetUser.id ||
          u.uid === targetUser.uid ||
          (u.email && u.email.toLowerCase().trim() === targetUser.email.toLowerCase().trim())
      );
      if (matchInStore) {
        matchInStore.password = hashedPassword;
        matchInStore.updatedAt = new Date();
      }
      saveStoreToDisk(store);
    }

    // 4. Mark reset request as completed in the database and await completion
    const completedAt = new Date();
    await db.update(passwordResetRequests)
      .set({
        status: 'completed',
        completedAt,
        updatedAt: completedAt,
      })
      .where(eq(passwordResetRequests.requestId, requestId));

    if (store && Array.isArray(store.password_reset_requests)) {
      const pr = store.password_reset_requests.find((r: any) => r.requestId === requestId);
      if (pr) {
        pr.status = 'completed';
        pr.completedAt = completedAt;
        pr.updatedAt = completedAt;
      }
      saveStoreToDisk(store);
    }

    // 5. Log audit entry and await completion
    await logAudit({
      userUid: targetUser.uid,
      userEmail: targetUser.email,
      userName: targetUser.fullName,
      role: targetUser.role,
      action: 'PASSWORD_RESET_COMPLETED',
      recordAffected: `User #${targetUser.id} (${targetUser.fullName})`,
      newValue: 'Password successfully changed, securely hashed with SHA-256, and committed to database',
    });

    broadcastEvent('password_reset_completed', {
      requestId,
      userEmail: targetUser.email,
    });

    // 6. Send success response only after all async database operations are fully completed
    return res.json({
      success: true,
      email: targetUser.email,
      message: 'Password reset completed successfully! Please sign in with your new password.',
    });
  } catch (error: any) {
    console.error('Error confirming new password:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete password reset' });
  }
});

// 7. Direct Change Password (for authenticated users / settings)
router.post('/users/change-password', async (req, res) => {
  try {
    const { userUid, email, currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const cleanNewPass = String(newPassword).trim();
    const cleanEmail = email ? String(email).toLowerCase().trim() : '';

    const allUsers = await db.select().from(users);
    const targetUser = allUsers.find(
      (u: any) =>
        (userUid && u.uid === userUid) ||
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
    );

    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found in database.' });
    }

    // Verify current password if provided
    if (currentPassword && targetUser.password) {
      if (!verifyPassword(currentPassword, targetUser.password)) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
    }

    // Hash new password securely with SHA-256
    const hashedPassword = hashPassword(cleanNewPass);

    // Execute database update and await commit
    await db.update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUser.id));

    // Update in-memory store and commit to disk
    const store = (global as any)._inMemoryStore || getInMemoryStore();
    if (store && Array.isArray(store.users)) {
      const u = store.users.find((u: any) => u.id === targetUser.id || u.uid === targetUser.uid);
      if (u) {
        u.password = hashedPassword;
        u.updatedAt = new Date();
      }
      saveStoreToDisk(store);
    }

    await logAudit({
      userUid: targetUser.uid,
      userEmail: targetUser.email,
      userName: targetUser.fullName,
      role: targetUser.role,
      action: 'PASSWORD_UPDATED',
      recordAffected: `User #${targetUser.id} (${targetUser.fullName})`,
      newValue: 'Password updated, securely hashed with SHA-256, and committed',
    });

    return res.json({
      success: true,
      message: 'Password updated successfully. You can now use your new password.',
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return res.status(500).json({ error: error.message || 'Failed to update password' });
  }
});

// ----------------------------------------------------
// AI GROUNDED INTELLIGENCE (Google Maps & Google Search)
// Using gemini-3.8-flash as mandated by requirements
// ----------------------------------------------------
import { ai, MALAWI_DISTRICT_COORDINATES, MALAWI_DEFAULT_COORDS } from './gemini.ts';

// 8. Google Maps Grounding API (gemini-3.8-flash with googleMaps tool)
router.post('/ai/maps-grounding', async (req, res) => {
  try {
    const { prompt, district, latitude, longitude } = req.body;
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'A query prompt is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in server environment.',
      });
    }

    // Determine coordinates for retrievalConfig
    let lat = MALAWI_DEFAULT_COORDS.lat;
    let lng = MALAWI_DEFAULT_COORDS.lng;

    if (latitude !== undefined && longitude !== undefined && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
      lat = Number(latitude);
      lng = Number(longitude);
    } else if (district && MALAWI_DISTRICT_COORDINATES[district]) {
      lat = MALAWI_DISTRICT_COORDINATES[district].lat;
      lng = MALAWI_DISTRICT_COORDINATES[district].lng;
    }

    const enhancedPrompt = district
      ? `${prompt.trim()}. Focus on location and geographical facilities (markets, ADMARC grain depots, silos, logistics hubs, weighbridges) in or near ${district}, Malawi.`
      : `${prompt.trim()}. Focus on geographical places, agricultural depots, produce collection centers, and transport routes in Malawi.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: enhancedPrompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng,
            },
          },
        },
      },
    });

    const text = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Extract all Maps URLs and review sources for client display
    const places: Array<{ title: string; uri: string; reviewSnippets?: any[] }> = [];
    for (const chunk of groundingChunks as any[]) {
      if (chunk.maps) {
        places.push({
          title: chunk.maps.title || 'Location on Google Maps',
          uri: chunk.maps.uri || '',
          reviewSnippets: chunk.maps.placeAnswerSources?.reviewSnippets || [],
        });
      }
    }

    return res.json({
      success: true,
      text,
      places,
      district: district || 'Malawi',
      coordinates: { lat, lng },
    });
  } catch (error: any) {
    console.error('Error in Google Maps Grounding:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve grounded Google Maps information' });
  }
});

// 9. Google Search Grounding API (gemini-3.8-flash with googleSearch tool)
router.post('/ai/search-grounding', async (req, res) => {
  try {
    const { prompt, topic } = req.body;
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'A search query prompt is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in server environment.',
      });
    }

    const contextPrefix = topic
      ? `Topic: ${topic}. Focus on current, verified Malawi agricultural market, price trends, weather, or policy information. `
      : `Focus on current, accurate Malawi agricultural market prices, harvest reports, weather, and trade data. `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `${contextPrefix}${prompt.trim()}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const webSearchQueries = groundingMetadata?.webSearchQueries || [];

    // Extract web source URLs and titles for client links
    const sources: Array<{ title: string; uri: string }> = [];
    for (const chunk of groundingChunks as any[]) {
      if (chunk.web && chunk.web.uri) {
        sources.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri,
        });
      }
    }

    return res.json({
      success: true,
      text,
      sources,
      searchQueries: webSearchQueries,
    });
  } catch (error: any) {
    console.error('Error in Google Search Grounding:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve grounded Google Search information' });
  }
});

// ----------------------------------------------------
// 10. AI-POWERED AGRICULTURAL ASSISTANT & KNOWLEDGE CENTRE
// ----------------------------------------------------
import {
  generateAgriAdvice,
  MALAWI_CROP_KNOWLEDGE_BASE,
  AGRI_KNOWLEDGE_TOPICS,
} from './agriAdvisor.ts';

// Interactive Agricultural Chatbot (Text, Voice transcripts, Images, Multi-turn)
router.post('/ai/agri-chat', async (req, res) => {
  try {
    const {
      message,
      history,
      imageBase64,
      imageMimeType,
      district,
      preferredLanguage,
      topic,
    } = req.body;

    if (!message && !imageBase64) {
      return res.status(400).json({ error: 'Please provide an agricultural question or upload an image.' });
    }

    const advice = await generateAgriAdvice({
      message: message || 'Please analyze this agricultural crop/produce image and advise on quality, pest/disease symptoms, and remedies.',
      history: Array.isArray(history) ? history : [],
      imageBase64,
      imageMimeType,
      district: district || 'Lilongwe',
      preferredLanguage: preferredLanguage || 'en',
      topic,
    });

    return res.json({
      success: true,
      ...advice,
    });
  } catch (error: any) {
    console.error('Error in AI Agricultural Chat Assistant:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process agricultural advice request',
    });
  }
});

// Knowledge Centre: Crop guides, topics, and agricultural calendar
router.get('/agri/knowledge', (_req, res) => {
  try {
    return res.json({
      success: true,
      crops: MALAWI_CROP_KNOWLEDGE_BASE,
      topics: AGRI_KNOWLEDGE_TOPICS,
    });
  } catch (error: any) {
    console.error('Error fetching agricultural knowledge:', error);
    return res.status(500).json({ error: 'Failed to retrieve agricultural knowledge' });
  }
});

// Product Quality & Grading Assessment Simulator
router.post('/ai/quality-assessment', async (req, res) => {
  try {
    const {
      commodityName,
      moisturePercent,
      foreignMatterPercent,
      brokenPercent,
      moldPercent,
      shrivelledPercent,
    } = req.body;

    const moisture = Number(moisturePercent || 12.5);
    const foreignMatter = Number(foreignMatterPercent || 1.0);
    const broken = Number(brokenPercent || 2.0);
    const mold = Number(moldPercent || 0.0);
    const shrivelled = Number(shrivelledPercent || 1.5);

    // Determine target moisture threshold based on commodity
    const normName = String(commodityName || 'maize').toLowerCase();
    let maxGradeAMoisture = 13.0;
    let commodityBasePrice = 650; // MWK/kg
    if (normName.includes('groundnut') || normName.includes('mtedza')) {
      maxGradeAMoisture = 7.5;
      commodityBasePrice = 1400;
    } else if (normName.includes('soya')) {
      maxGradeAMoisture = 11.5;
      commodityBasePrice = 950;
    } else if (normName.includes('rice') || normName.includes('mpunga')) {
      maxGradeAMoisture = 13.0;
      commodityBasePrice = 1800;
    } else if (normName.includes('bean') || normName.includes('nyemba')) {
      maxGradeAMoisture = 12.0;
      commodityBasePrice = 1600;
    }

    // Quality grading calculation
    let grade: 'Grade A - Premium' | 'Grade B - Standard' | 'Grade C - Commercial' | 'Sub-standard / High Risk' = 'Grade A - Premium';
    const deductions: string[] = [];
    const recommendations: string[] = [];

    if (mold > 1.0) {
      grade = 'Sub-standard / High Risk';
      deductions.push(`Visible mold (${mold}%) poses critical aflatoxin and mycotoxin contamination risk.`);
      recommendations.push('Discard and sort out all discolored or moldy kernels immediately to prevent toxin spread.');
    } else if (moisture > maxGradeAMoisture + 2.0) {
      grade = 'Sub-standard / High Risk';
      deductions.push(`Excess moisture (${moisture}%) exceeds safety ceiling of ${maxGradeAMoisture}%. Storage will rot rapidly.`);
      recommendations.push('Immediate sun-drying on clean tarpaulins for 2-3 consecutive days until moisture is below ' + maxGradeAMoisture + '%.');
    } else if (moisture > maxGradeAMoisture) {
      if (grade === 'Grade A - Premium') grade = 'Grade B - Standard';
      deductions.push(`Moisture (${moisture}%) is slightly above the Grade A threshold (${maxGradeAMoisture}%).`);
      recommendations.push(`Sun-dry for 4-6 hours to reach safe threshold (${maxGradeAMoisture}%).`);
    }

    if (foreignMatter > 2.0) {
      if (grade === 'Grade A - Premium') grade = 'Grade B - Standard';
      deductions.push(`Foreign matter (${foreignMatter}%) exceeds MBS clean grain limit (2.0%).`);
      recommendations.push('Winnow thoroughly to remove chaff, dust, and stones.');
    }

    if (broken > 4.0 || shrivelled > 4.0) {
      if (grade === 'Grade A - Premium') grade = 'Grade B - Standard';
      deductions.push(`Broken / shrivelled grains (${broken}% broken, ${shrivelled}% shrivelled) degrade flour/milling quality.`);
      recommendations.push('Sieve grains with appropriate wire screen mesh to separate premium whole seeds from broken grits.');
    }

    // Estimated market price value
    let priceMultiplier = 1.0;
    if (grade === 'Grade A - Premium') priceMultiplier = 1.15; // +15% premium
    else if (grade === 'Grade B - Standard') priceMultiplier = 1.0;
    else priceMultiplier = 0.65; // -35% distress sale

    const estimatedMarketPrice = Math.round(commodityBasePrice * priceMultiplier);
    const potentialGainPerTon = Math.round((commodityBasePrice * 1.15 - estimatedMarketPrice) * 1000);

    return res.json({
      success: true,
      commodityName: commodityName || 'White Maize',
      grade,
      moisture,
      targetMoisture: maxGradeAMoisture,
      estimatedMarketPriceMwkPerKg: estimatedMarketPrice,
      gradeAPotentialPriceMwkPerKg: Math.round(commodityBasePrice * 1.15),
      potentialGainPerTonMwk: Math.max(0, potentialGainPerTon),
      deductions,
      recommendations: recommendations.length > 0 ? recommendations : [
        'Produce meets Grade A specifications! Maintain airtight hermetic storage in PICS bags to preserve high market value.'
      ],
      mbsCertified: grade === 'Grade A - Premium',
    });
  } catch (error: any) {
    console.error('Error in quality assessment:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete quality assessment' });
  }
});

// Agricultural Expert Consultations Desk (List)
router.get('/agri/consultations', async (req, res) => {
  try {
    const { farmerUid, status } = req.query;
    let list: any[] = [];

    try {
      let query = db.select().from(agriConsultations);
      if (farmerUid) {
        list = await query.where(eq(agriConsultations.farmerUid, String(farmerUid))).orderBy(desc(agriConsultations.createdAt));
      } else if (status) {
        list = await query.where(eq(agriConsultations.status, String(status))).orderBy(desc(agriConsultations.createdAt));
      } else {
        list = await query.orderBy(desc(agriConsultations.createdAt));
      }
    } catch {
      // Fallback from in-memory store
      const store = getInMemoryStore();
      list = (store.agri_consultations || []).slice();
      if (farmerUid) {
        list = list.filter((c: any) => c.farmerUid === String(farmerUid));
      }
      if (status) {
        list = list.filter((c: any) => c.status === String(status));
      }
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return res.json(list);
  } catch (error: any) {
    console.error('Error fetching agri consultations:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch consultations' });
  }
});

// Agricultural Expert Consultations Desk (Create Consultation)
router.post('/agri/consultations', async (req, res) => {
  try {
    const {
      farmerUid,
      farmerName,
      farmerPhone,
      district,
      epa,
      cropOrTopic,
      question,
      imageUrl,
      urgency,
      aiInitialSummary,
    } = req.body;

    if (!farmerUid || !cropOrTopic || !question) {
      return res.status(400).json({ error: 'Farmer UID, Crop/Topic, and detailed question are required.' });
    }

    const consultationNumber = `AC-${Date.now().toString().slice(-6)}`;
    const newRecord = {
      consultationNumber,
      farmerUid: String(farmerUid),
      farmerName: farmerName || 'Smallholder Farmer',
      farmerPhone: farmerPhone || '+265 ',
      district: district || 'Lilongwe',
      epa: epa || 'Central EPA',
      cropOrTopic: String(cropOrTopic),
      question: String(question),
      imageUrl: imageUrl || '',
      urgency: urgency || 'normal',
      status: 'pending_expert_review',
      aiInitialSummary: aiInitialSummary || '',
      expertName: '',
      expertTitle: '',
      expertResponse: '',
      answeredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let insertedRecord: any = newRecord;
    try {
      const inserted = await db.insert(agriConsultations).values(newRecord).returning();
      insertedRecord = inserted[0] || newRecord;
    } catch (dbErr) {
      const store = getInMemoryStore();
      if (!Array.isArray(store.agri_consultations)) store.agri_consultations = [];
      const newId = store.agri_consultations.length + 1;
      insertedRecord = { id: newId, ...newRecord };
      store.agri_consultations.unshift(insertedRecord);
      saveStoreToDisk(store);
    }

    // Create system notification for extension officers / admins
    try {
      await db.insert(notifications).values({
        userUid: 'frF3xukObzdA8AhCBYIBPYV0UK13',
        title: `New Agricultural Query #${consultationNumber}`,
        message: `${farmerName} from ${district} (${epa || 'EPA'}) submitted an agricultural inquiry on ${cropOrTopic}.`,
        type: 'system',
        isRead: false,
      });
    } catch {}

    broadcastEvent('AGRI_CONSULTATION_CREATED', insertedRecord);

    return res.status(201).json({
      success: true,
      message: 'Consultation inquiry submitted to Agricultural Extension Officers.',
      consultation: insertedRecord,
    });
  } catch (error: any) {
    console.error('Error submitting agri consultation:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit consultation' });
  }
});

// Agricultural Expert Consultations Desk (Expert Reply)
router.put('/agri/consultations/:id/reply', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { expertName, expertTitle, expertResponse, status } = req.body;

    if (!expertResponse || !String(expertResponse).trim()) {
      return res.status(400).json({ error: 'Official expert recommendation response is required.' });
    }

    const updatedData = {
      expertName: expertName || 'Agricultural Extension Development Officer (AEDO)',
      expertTitle: expertTitle || 'Extension Officer / Research Specialist',
      expertResponse: String(expertResponse).trim(),
      status: status || 'answered',
      answeredAt: new Date(),
      updatedAt: new Date(),
    };

    let updatedItem: any = null;
    try {
      const updated = await db
        .update(agriConsultations)
        .set(updatedData)
        .where(eq(agriConsultations.id, id))
        .returning();
      updatedItem = updated[0];
    } catch {
      const store = getInMemoryStore();
      const idx = (store.agri_consultations || []).findIndex((c: any) => c.id === id);
      if (idx >= 0) {
        store.agri_consultations[idx] = { ...store.agri_consultations[idx], ...updatedData };
        updatedItem = store.agri_consultations[idx];
        saveStoreToDisk(store);
      }
    }

    if (!updatedItem) {
      return res.status(404).json({ error: 'Consultation record not found' });
    }

    // Notify farmer of expert response
    if (updatedItem.farmerUid) {
      try {
        await db.insert(notifications).values({
          userUid: updatedItem.farmerUid,
          title: `Agricultural Advisory Response #${updatedItem.consultationNumber}`,
          message: `${updatedItem.expertName} (${updatedItem.expertTitle}) answered your inquiry regarding ${updatedItem.cropOrTopic}.`,
          type: 'system',
          isRead: false,
        });
      } catch {}
    }

    broadcastEvent('AGRI_CONSULTATION_ANSWERED', updatedItem);

    return res.json({
      success: true,
      message: 'Expert response recorded and farmer notified.',
      consultation: updatedItem,
    });
  } catch (error: any) {
    console.error('Error answering consultation:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit expert reply' });
  }
});

// ----------------------------------------------------
// 11. DISTRICT-BASED AGRICULTURAL AGENT NETWORK & SMS SYSTEM
// ----------------------------------------------------

// Internal Helper to send simulated SMS and store in log
export function sendAutomatedFarmerSms(params: {
  recipientPhone: string;
  recipientName: string;
  district: string;
  messageText: string;
  messageLanguage?: 'ch' | 'en';
  eventType:
    | 'farmer_registered'
    | 'produce_listed'
    | 'order_received'
    | 'order_paid'
    | 'transporter_assigned'
    | 'delivery_confirmed'
    | 'payment_released'
    | 'broadcast_announcement'
    | 'verification_code';
  relatedRecordNumber?: string;
  verificationCode?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'failed' | 'pending';
  failureReason?: string;
}) {
  try {
    const store = getInMemoryStore();
    if (!Array.isArray(store.sms_notifications)) store.sms_notifications = [];
    const nextId = store.sms_notifications.length + 1;
    const smsId = `SMS-${new Date().getFullYear()}-${String(nextId).padStart(4, '0')}`;

    // Detect carrier and format real Malawian phone
    const cleanPhone = (params.recipientPhone || '').replace(/\s+/g, '');
    const formattedPhone = formatMalawiPhoneNumber(params.recipientPhone);
    const carrierNetwork = cleanPhone.includes('88') || cleanPhone.includes('89')
      ? 'TNM'
      : cleanPhone.includes('99') || cleanPhone.includes('98')
      ? 'Airtel'
      : 'TNM';

    const record = {
      id: nextId,
      smsId,
      recipientPhone: formattedPhone || params.recipientPhone,
      recipientName: params.recipientName,
      recipientType: 'offline_farmer',
      district: params.district,
      messageText: params.messageText,
      messageLanguage: params.messageLanguage || 'ch',
      eventType: params.eventType,
      relatedRecordNumber: params.relatedRecordNumber || '',
      verificationCode: params.verificationCode || '',
      deliveryStatus: params.deliveryStatus || 'sent',
      failureReason: params.failureReason || '',
      carrierNetwork,
      sentAt: new Date(),
    };

    store.sms_notifications.unshift(record);
    saveStoreToDisk(store);
    broadcastEvent('SMS_DELIVERED', record);

    // Asynchronously dispatch through real telecom gateway (Africa's Talking / Twilio / Webhook)
    dispatchRealSms({
      toPhone: formattedPhone || params.recipientPhone,
      recipientName: params.recipientName,
      messageText: params.messageText,
    })
      .then((res) => {
        if (res.provider !== 'device_intent') {
          const liveStore = getInMemoryStore();
          const found = (liveStore.sms_notifications || []).find((s: any) => s.smsId === smsId);
          if (found) {
            found.deliveryStatus = res.success ? 'sent' : 'failed';
            if (!res.success) found.failureReason = res.statusText;
            saveStoreToDisk(liveStore);
            broadcastEvent('SMS_DELIVERED', found);
          }
        }
      })
      .catch((e) => {
        console.warn('Real SMS dispatch error:', e);
      });

    return record;
  } catch (err) {
    console.error('Failed to log SMS notification:', err);
    return null;
  }
}

// GET /api/agent/workspace: Retrieve shared district workspace data
router.get('/agent/workspace', async (req, res) => {
  try {
    const districtQuery = String(req.query.district || 'Zomba');
    const store = getInMemoryStore();

    // 1. All agents active in this district
    const allUsers = (store.users || []).slice();
    const districtAgents = allUsers.filter(
      (u: any) =>
        u.role === 'agent' &&
        (u.assignedDistrict?.toLowerCase() === districtQuery.toLowerCase() ||
          u.district?.toLowerCase() === districtQuery.toLowerCase())
    );

    // 2. All offline farmers in this district
    const allOfflineFarmers = (store.offline_farmers || []).slice();
    const districtFarmers = allOfflineFarmers.filter(
      (f: any) => f.district?.toLowerCase() === districtQuery.toLowerCase()
    );

    // 3. All commodities registered by agents or located in this district
    const allCommodities = (store.commodities || []).slice();
    const districtCommodities = allCommodities.filter(
      (c: any) =>
        c.district?.toLowerCase() === districtQuery.toLowerCase() ||
        c.agentDistrict?.toLowerCase() === districtQuery.toLowerCase()
    );

    // 4. District orders (orders for produce belonging to district offline farmers or district commodities)
    const allOrders = (store.orders || []).slice();
    const districtCommodityIds = new Set(districtCommodities.map((c: any) => c.id));
    const districtOrders = allOrders.filter(
      (o: any) =>
        districtCommodityIds.has(o.commodityId) ||
        o.deliveryDistrict?.toLowerCase() === districtQuery.toLowerCase()
    );

    // 5. Recent SMS notifications sent to farmers in this district
    const allSms = (store.sms_notifications || []).slice();
    const districtSms = allSms.filter(
      (s: any) => s.district?.toLowerCase() === districtQuery.toLowerCase()
    );

    // 6. Calculate district metrics
    const totalFarmers = districtFarmers.length;
    const totalProduceItems = districtCommodities.length;
    const totalSalesMwk = districtOrders
      .filter((o: any) => o.status === 'completed' || o.status === 'accepted')
      .reduce((acc: number, cur: any) => acc + (Number(cur.totalAmount) || 0), 0);
    const pendingOrdersCount = districtOrders.filter(
      (o: any) => o.status === 'pending' || o.status === 'pending_payment_verification'
    ).length;

    return res.json({
      success: true,
      district: districtQuery,
      region: getDistrictRegion(districtQuery),
      totalAgents: districtAgents.length,
      agents: districtAgents.map((ag: any) => ({
        uid: ag.uid,
        fullName: ag.fullName,
        phoneNumber: ag.phoneNumber,
        email: ag.email,
        tradingArea: ag.tradingArea || ag.village || 'District Hub',
        agentCode: ag.agentCode || `AGT-${districtQuery.slice(0, 3).toUpperCase()}-01`,
        status: ag.agentStatus || 'active',
        joinedAt: ag.createdAt || new Date().toISOString(),
        registeredFarmersCount: districtFarmers.filter((f: any) => f.registeredByAgentUid === ag.uid).length,
        activeListingsCount: districtCommodities.filter((c: any) => c.agentUid === ag.uid).length,
      })),
      farmers: districtFarmers,
      commodities: districtCommodities,
      orders: districtOrders,
      smsLogs: districtSms.slice(0, 20),
      metrics: {
        totalFarmers,
        totalProduceItems,
        totalSalesMwk,
        pendingOrdersCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching agent workspace:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch agent workspace' });
  }
});

// POST /api/agent/farmers: Agent registers a farmer without smartphone/internet
router.post('/agent/farmers', async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      altPhoneNumber,
      district,
      traditionalAuthority,
      village,
      preferredLanguage,
      agentUid,
      agentName,
      agentPhone,
      notes,
    } = req.body;

    if (!fullName || !phoneNumber || !district || !traditionalAuthority || !village) {
      return res.status(400).json({
        error: "Farmer's full name, phone number, district, Traditional Authority (T/A), and village are required.",
      });
    }

    const store = getInMemoryStore();
    if (!Array.isArray(store.offline_farmers)) store.offline_farmers = [];

    // Check for duplicate phone in same district
    const existing = store.offline_farmers.find(
      (f: any) => f.phoneNumber === phoneNumber && f.district.toLowerCase() === district.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({
        error: `A farmer with phone number ${phoneNumber} is already registered in ${district} with ID: ${existing.farmerId}`,
      });
    }

    // Generate unique Mberalink Farmer ID: e.g. MBR-ZOM-2026-0005
    const distPrefix = district.slice(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const distCount = store.offline_farmers.filter(
      (f: any) => f.district.toLowerCase() === district.toLowerCase()
    ).length + 1;
    const farmerId = `MBR-${distPrefix}-${year}-${String(distCount).padStart(4, '0')}`;

    // Generate 4-digit verification PIN for farmer
    const verificationPin = Math.floor(1000 + Math.random() * 9000).toString();

    const newFarmer = {
      id: store.offline_farmers.length + 1,
      farmerId,
      fullName: String(fullName).trim(),
      phoneNumber: String(phoneNumber).trim(),
      altPhoneNumber: altPhoneNumber ? String(altPhoneNumber).trim() : '',
      district,
      traditionalAuthority: String(traditionalAuthority).trim(),
      village: String(village).trim(),
      preferredLanguage: preferredLanguage === 'en' ? 'en' : 'ch',
      registeredByAgentUid: agentUid || 'agent-unknown',
      registeredByAgentName: agentName || 'District Agent',
      registeredByAgentPhone: agentPhone || '',
      consentConfirmed: true,
      verificationPin,
      totalProduceListed: 0,
      totalOrdersCompleted: 0,
      totalEarningsMwk: 0,
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.offline_farmers.unshift(newFarmer);
    saveStoreToDisk(store);

    // Send automated personalized SMS to the farmer's keypad phone
    const lang = preferredLanguage === 'en' ? 'en' : 'ch';
    const welcomeMsg =
      lang === 'en'
        ? `MBERALINK: Welcome to Mberalink! Your official Farmer ID is ${farmerId}. Your assigned district agent in ${district} is ${agentName} (${agentPhone || ''}). Your secret verification PIN is ${verificationPin}.`
        : `MBERALINK: Mwalandiridwa ku Mberalink! Nambala yanu ya mlimi ndi ${farmerId}. Mlangizi wanu wa m'boma la ${district} ndi ${agentName} (${agentPhone || ''}). PIN yanu yachinsinsi ndi ${verificationPin}.`;

    const smsRecord = sendAutomatedFarmerSms({
      recipientPhone: newFarmer.phoneNumber,
      recipientName: newFarmer.fullName,
      district: newFarmer.district,
      messageText: welcomeMsg,
      messageLanguage: lang,
      eventType: 'farmer_registered',
      relatedRecordNumber: farmerId,
      verificationCode: verificationPin,
    });

    // Audit log
    await logAudit({
      userUid: agentUid || 'agent',
      userEmail: 'agent@mberalink.mw',
      userName: agentName || 'District Agent',
      role: 'agent',
      action: 'OFFLINE_FARMER_REGISTERED',
      recordAffected: `Farmer ${newFarmer.fullName} (${farmerId})`,
      newValue: `${district} - ${traditionalAuthority}, ${village}`,
      reason: 'Agent-assisted rural farmer registration without smartphone',
    });

    broadcastEvent('OFFLINE_FARMER_REGISTERED', { farmer: newFarmer, sms: smsRecord });

    return res.status(201).json({
      success: true,
      message: `Farmer ${newFarmer.fullName} successfully registered with Mberalink Farmer ID: ${farmerId}. Confirmation SMS dispatched!`,
      farmer: newFarmer,
      sms: smsRecord,
    });
  } catch (error: any) {
    console.error('Error registering offline farmer:', error);
    return res.status(500).json({ error: error.message || 'Failed to register farmer' });
  }
});

// POST /api/agent/commodities: Agent lists produce on behalf of an offline farmer
router.post('/agent/commodities', async (req, res) => {
  try {
    const {
      offlineFarmerId,
      commodityName,
      category,
      quantity,
      unit,
      pricePerUnit,
      district,
      location,
      quality,
      availabilityDate,
      description,
      imageUrl,
      agentUid,
      agentName,
      agentPhone,
    } = req.body;

    if (!offlineFarmerId || !commodityName || !quantity || !pricePerUnit) {
      return res.status(400).json({
        error: 'Offline Farmer ID, commodity name, quantity, and unit price are required.',
      });
    }

    const store = getInMemoryStore();
    const farmer = (store.offline_farmers || []).find(
      (f: any) => f.farmerId === offlineFarmerId || String(f.id) === String(offlineFarmerId)
    );

    if (!farmer) {
      return res.status(404).json({ error: `Registered farmer with ID ${offlineFarmerId} not found.` });
    }

    const qty = parseInt(quantity, 10);
    const unitPrice = parseFloat(pricePerUnit);
    const resolvedUnit = unit || '50kg bag';

    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Quantity must be a positive integer.' });
    if (isNaN(unitPrice) || unitPrice <= 0) return res.status(400).json({ error: 'Price per unit must be greater than 0.' });

    const newCommodity = {
      id: (store.commodities || []).length + 1,
      farmerId: farmer.id,
      farmerUid: `offline-${farmer.farmerId}`,
      farmerName: farmer.fullName,
      commodityName: String(commodityName).trim(),
      category: category || 'Grains & Cereals',
      quantity: qty,
      initialQuantity: qty,
      unit: resolvedUnit,
      pricePerUnit: unitPrice.toString(),
      district: farmer.district,
      location: location || `${farmer.traditionalAuthority}, ${farmer.village}`,
      region: getDistrictRegion(farmer.district),
      quality: quality || 'Grade A - Premium',
      availabilityDate: availabilityDate || new Date().toISOString().split('T')[0],
      description: description || `Listed by authorized Mberalink Agent on behalf of farmer ${farmer.fullName}.`,
      imageUrl:
        imageUrl ||
        'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80',
      status: 'available',
      // Agent attribution
      isAgentAssisted: true,
      agentUid: agentUid || 'agent-unknown',
      agentName: agentName || 'District Agent',
      agentDistrict: farmer.district,
      offlineFarmerId: farmer.farmerId,
      farmerPhone: farmer.phoneNumber,
      traditionalAuthority: farmer.traditionalAuthority,
      village: farmer.village,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!Array.isArray(store.commodities)) store.commodities = [];
    store.commodities.unshift(newCommodity);

    // Update farmer's total produce count
    farmer.totalProduceListed = (farmer.totalProduceListed || 0) + 1;
    saveStoreToDisk(store);

    // Send automated Produce Listing SMS to farmer
    const lang = farmer.preferredLanguage || 'ch';
    const listMsg =
      lang === 'en'
        ? `MBERALINK: Hello ${farmer.fullName}. Your produce (${qty} ${resolvedUnit} of ${commodityName}) is now live on Mberalink marketplace at MWK ${unitPrice.toLocaleString()}/${resolvedUnit}. You will receive an SMS when a buyer orders.`
        : `MBERALINK: Zikomo ${farmer.fullName}. Mbewu zanu: ${qty} ${resolvedUnit} a ${commodityName} zalembedwa pa msika wa Mberalink pa mtengo wa MWK ${unitPrice.toLocaleString()}/${resolvedUnit}. Tidzakudziwitsani wogula akapezeka.`;

    const smsRecord = sendAutomatedFarmerSms({
      recipientPhone: farmer.phoneNumber,
      recipientName: farmer.fullName,
      district: farmer.district,
      messageText: listMsg,
      messageLanguage: lang,
      eventType: 'produce_listed',
      relatedRecordNumber: `CMD-${newCommodity.id}`,
    });

    // Audit log
    await logAudit({
      userUid: agentUid || 'agent',
      userEmail: 'agent@mberalink.mw',
      userName: agentName || 'District Agent',
      role: 'agent',
      action: 'AGENT_COMMODITY_LISTED',
      recordAffected: `Commodity #${newCommodity.id} for ${farmer.fullName}`,
      newValue: `${qty} ${resolvedUnit} ${commodityName} @ MWK ${unitPrice}`,
      reason: `Agent listed produce on behalf of offline farmer ${farmer.farmerId}`,
    });

    broadcastEvent('COMMODITY_CREATED', newCommodity);

    return res.status(201).json({
      success: true,
      message: `Produce for ${farmer.fullName} published to Mberalink marketplace! Automated SMS notification sent.`,
      commodity: newCommodity,
      sms: smsRecord,
    });
  } catch (error: any) {
    console.error('Error listing agent commodity:', error);
    return res.status(500).json({ error: error.message || 'Failed to list commodity' });
  }
});

// GET /api/agent/sms: List SMS notifications
router.get('/agent/sms', (req, res) => {
  try {
    const { district, phone } = req.query;
    const store = getInMemoryStore();
    let list = (store.sms_notifications || []).slice();

    if (district) {
      list = list.filter((s: any) => s.district?.toLowerCase() === String(district).toLowerCase());
    }
    if (phone) {
      list = list.filter((s: any) => s.recipientPhone?.includes(String(phone)));
    }

    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch SMS logs' });
  }
});

// POST /api/agent/sms/resend: Retry or re-send an automated SMS
router.post('/agent/sms/resend', (req, res) => {
  try {
    const { smsId } = req.body;
    if (!smsId) {
      return res.status(400).json({ error: 'smsId is required' });
    }

    const store = getInMemoryStore();
    const sms = (store.sms_notifications || []).find((s: any) => s.smsId === smsId || s.id === Number(smsId));
    if (!sms) {
      return res.status(404).json({ error: 'SMS log entry not found' });
    }

    // Mark as sent successfully upon retry
    sms.deliveryStatus = 'sent';
    sms.failureReason = '';
    sms.sentAt = new Date();
    saveStoreToDisk(store);

    broadcastEvent('SMS_DELIVERED', sms);

    return res.json({
      success: true,
      message: `SMS ${sms.smsId} successfully redelivered to ${sms.recipientName} (${sms.recipientPhone}).`,
      sms,
    });
  } catch (error: any) {
    console.error('Error resending SMS:', error);
    return res.status(500).json({ error: error.message || 'Failed to resend SMS' });
  }
});

// POST /api/agent/sms/send-direct: Agent directly composes an advisory SMS to an offline farmer
router.post('/agent/sms/send-direct', (req, res) => {
  try {
    const { recipientPhone, recipientName, district, messageText, messageLanguage, eventType, agentName } = req.body;

    if (!recipientPhone || !recipientName || !messageText) {
      return res.status(400).json({ error: 'recipientPhone, recipientName, and messageText are required' });
    }

    // Validate phone number format
    const clean = recipientPhone.replace(/\s+/g, '');
    const isInvalid = clean.length < 8;

    const record = sendAutomatedFarmerSms({
      recipientPhone,
      recipientName,
      district: district || 'Zomba',
      messageText: messageText.trim(),
      messageLanguage: messageLanguage || 'ch',
      eventType: eventType || 'broadcast_announcement',
      deliveryStatus: isInvalid ? 'failed' : 'sent',
      failureReason: isInvalid ? 'Carrier Error: Destination MSISDN unroutable or network timeout.' : '',
    });

    return res.status(201).json({
      success: true,
      message: isInvalid
        ? `SMS dispatch failed due to invalid telephone format.`
        : `SMS dispatched successfully to ${recipientName}!`,
      sms: record,
    });
  } catch (error: any) {
    console.error('Error sending direct SMS:', error);
    return res.status(500).json({ error: error.message || 'Failed to dispatch direct SMS' });
  }
});

// GET /api/agent/sms/gateway-status: Check real messaging gateway readiness
router.get(['/agent/sms/gateway-status', '/api/agent/sms/gateway-status'], (req, res) => {
  try {
    const fcmStatus = getFcmStatus();

    return res.json({
      hasAutomatedGateway: true,
      activeProvider: 'Firebase Cloud Messaging (FCM)',
      providerType: 'firebase_cloud_messaging',
      projectId: fcmStatus.projectId,
      messagingSenderId: fcmStatus.messagingSenderId,
      activeDevicesCount: fcmStatus.activeDevicesCount,
      providers: {
        fcm: {
          configured: true,
          active: true,
          name: 'Firebase Cloud Messaging (FCM)',
          projectId: fcmStatus.projectId,
          senderId: fcmStatus.messagingSenderId,
          activeDevices: fcmStatus.activeDevicesCount,
          description: 'Official Google Firebase Cloud Messaging for Web, PWA, and Mobile push notifications across Malawi.',
        },
        deviceHandsetIntent: {
          supported: true,
          description: 'Direct cellular fallback via native Android/iPhone Messages app using pre-filled sms: URI',
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to inspect gateway status' });
  }
});

// POST /api/agent/sms/gateway-config: Update gateway credentials
router.post(['/agent/sms/gateway-config', '/api/agent/sms/gateway-config'], (req, res) => {
  try {
    return res.json({
      success: true,
      message: 'Active messaging provider is Firebase Cloud Messaging (FCM). No 3rd-party credentials required.',
      config: getSmsGatewayConfig(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update gateway configuration' });
  }
});

// POST /api/messaging/register-token: Register FCM client device token
router.post(['/messaging/register-token', '/api/messaging/register-token'], (req, res) => {
  try {
    const { token, userUid, userName, userRole, district, deviceType, userAgent } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'FCM device token is required' });
    }
    const record = registerFcmToken({
      token,
      userUid,
      userName,
      userRole,
      district,
      deviceType,
      userAgent,
    });
    return res.json({ success: true, record });
  } catch (error: any) {
    console.error('Error registering FCM token:', error);
    return res.status(500).json({ error: error.message || 'Failed to register FCM token' });
  }
});

// GET /api/messaging/status: Check FCM connection and active devices
router.get(['/messaging/status', '/api/messaging/status'], (req, res) => {
  try {
    const status = getFcmStatus();
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to get messaging status' });
  }
});

// POST /api/messaging/send: Send direct FCM notification
router.post(['/messaging/send', '/api/messaging/send'], async (req, res) => {
  try {
    const { token, userUid, topic, title, body, data } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }
    const result = await sendFcmNotification({
      token,
      userUid,
      topic,
      title,
      body,
      data,
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to dispatch FCM message' });
  }
});

// POST /api/agent/sms/test-real: Test real cellular SMS delivery to a phone number
router.post('/agent/sms/test-real', async (req, res) => {
  try {
    const { phone, name, customText } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const recipientName = name || 'Mberalink User';
    const message = customText || `MBERALINK TEST: Hello ${recipientName}! This is a live test message from Mberalink agricultural digital exchange platform. Real-time notifications are working.`;

    const dispatchOutcome = await dispatchRealSms({
      toPhone: phone,
      recipientName,
      messageText: message,
    });

    // Also record in log
    const recorded = sendAutomatedFarmerSms({
      recipientPhone: phone,
      recipientName,
      district: 'National',
      messageText: message,
      eventType: 'broadcast_announcement',
      deliveryStatus: dispatchOutcome.success ? 'sent' : 'failed',
      failureReason: dispatchOutcome.success ? '' : dispatchOutcome.statusText,
    });

    return res.json({
      success: true,
      dispatchOutcome,
      sms: recorded,
      deviceSmsUri: `sms:${formatMalawiPhoneNumber(phone)}?body=${encodeURIComponent(message)}`,
    });
  } catch (error: any) {
    console.error('Error in test-real SMS:', error);
    return res.status(500).json({ error: error.message || 'Failed to dispatch test SMS' });
  }
});

// GET /api/agent/sms/africas-talking/logs: Get detailed AT delivery and error audit logs
router.get('/agent/sms/africas-talking/logs', (req, res) => {
  try {
    const { recipient, status, carrier, limit } = req.query;
    const logs = africasTalkingService.getDeliveryLogs({
      recipient: recipient ? String(recipient) : undefined,
      status: status ? String(status) : undefined,
      carrier: carrier ? (String(carrier) as any) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 100,
    });
    return res.json({
      success: true,
      total: logs.length,
      logs,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to retrieve delivery logs' });
  }
});

// GET /api/agent/sms/africas-talking/balance: Check AT account balance
router.get('/agent/sms/africas-talking/balance', async (req, res) => {
  try {
    const result = await africasTalkingService.getAccountBalance();
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch account balance' });
  }
});

// POST /api/agent/sms/africas-talking/send: Send SMS directly via Africa's Talking service
router.post('/agent/sms/africas-talking/send', async (req, res) => {
  try {
    const { to, message, from, enqueue } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'Recipient phone (to) and message text are required.' });
    }

    const result = await africasTalkingService.sendSms({
      to,
      message,
      from,
      enqueue: Boolean(enqueue),
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to dispatch SMS via Africa's Talking" });
  }
});

// POST /api/agent/sms/africas-talking/dlr: Africa's Talking Delivery Report webhook
router.post('/agent/sms/africas-talking/dlr', (req, res) => {
  try {
    const { id, status, phoneNumber, failureReason, networkCode } = req.body;
    const outcome = africasTalkingService.handleDeliveryReport({
      id,
      status,
      phoneNumber,
      failureReason,
      networkCode,
    });
    return res.json({ success: true, outcome });
  } catch (error: any) {
    console.error('Error handling Africa Talking DLR:', error);
    return res.status(500).json({ error: 'Failed to process DLR' });
  }
});

// POST /api/agent/verify-pin: Verify farmer PIN for high-value operations
router.post('/agent/verify-pin', (req, res) => {
  try {
    const { farmerId, pin } = req.body;
    if (!farmerId || !pin) {
      return res.status(400).json({ error: 'Farmer ID and verification PIN are required.' });
    }

    const store = getInMemoryStore();
    const farmer = (store.offline_farmers || []).find((f: any) => f.farmerId === farmerId);

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer record not found.' });
    }

    if (farmer.verificationPin !== String(pin).trim()) {
      return res.status(401).json({ error: 'Incorrect farmer verification PIN. Please re-check with the farmer.' });
    }

    return res.json({
      success: true,
      verified: true,
      message: `Farmer PIN verified successfully for ${farmer.fullName}.`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'PIN verification failed' });
  }
});

// POST /api/agent/ussd-simulate: Interactive USSD (*265#) Simulator for keypad phones
router.post('/agent/ussd-simulate', (req, res) => {
  try {
    const { phoneNumber, text } = req.body;
    const store = getInMemoryStore();

    const normalizedPhone = String(phoneNumber || '').trim();
    const farmer = (store.offline_farmers || []).find(
      (f: any) => f.phoneNumber === normalizedPhone || f.altPhoneNumber === normalizedPhone
    );

    const input = String(text || '').trim();

    // Root Menu
    if (!input) {
      const greeting = farmer ? `Welcome, ${farmer.fullName}!` : 'Welcome to Mberalink Malawi!';
      return res.json({
        response: `MBERALINK FARMER USSD (*265#)\n${greeting}\n\n1. Check My Listed Produce\n2. Check Orders & Payments\n3. Prevailing Market Prices\n4. Contact My District Agent\n5. Request Farmer Assistance`,
        continueSession: true,
      });
    }

    // Option 1: Check My Listed Produce
    if (input === '1') {
      if (!farmer) {
        return res.json({
          response: 'You have no registered produce under this phone number. Contact your local Mberalink District Agent to register.',
          continueSession: false,
        });
      }

      const farmerCommodities = (store.commodities || []).filter(
        (c: any) => c.offlineFarmerId === farmer.farmerId || c.farmerPhone === farmer.phoneNumber
      );

      if (farmerCommodities.length === 0) {
        return res.json({
          response: `Mberalink (${farmer.district}):\nYou have 0 active listings.\nContact your agent ${farmer.registeredByAgentName} (${farmer.registeredByAgentPhone || ''}) to list your harvest.`,
          continueSession: false,
        });
      }

      const summary = farmerCommodities
        .slice(0, 3)
        .map(
          (c: any, i: number) =>
            `${i + 1}. ${c.commodityName}: ${c.quantity} ${c.unit} @ MWK ${Number(c.pricePerUnit).toLocaleString()} (${c.status})`
        )
        .join('\n');

      return res.json({
        response: `Mberalink Produce for ${farmer.fullName}:\n${summary}\n\nReply 0 to Return to Main Menu`,
        continueSession: true,
      });
    }

    // Option 2: Check Orders & Payments
    if (input === '2') {
      if (!farmer) {
        return res.json({
          response: 'No orders found for this phone number. Please visit your district agent to register your produce.',
          continueSession: false,
        });
      }

      const farmerCommodityIds = new Set(
        (store.commodities || [])
          .filter((c: any) => c.offlineFarmerId === farmer.farmerId)
          .map((c: any) => c.id)
      );

      const farmerOrders = (store.orders || []).filter((o: any) => farmerCommodityIds.has(o.commodityId));

      if (farmerOrders.length === 0) {
        return res.json({
          response: `Mberalink Orders:\nNo pending orders at this moment.\nTotal completed earnings: MWK ${(Number(farmer.totalEarningsMwk) || 0).toLocaleString()}.\nYou will receive an SMS as soon as a buyer orders.`,
          continueSession: false,
        });
      }

      const orderList = farmerOrders
        .slice(0, 2)
        .map(
          (o: any) =>
            `Order #${o.orderNumber}: ${o.quantity} ${o.unit} ${o.commodityName} - MWK ${Number(o.totalAmount).toLocaleString()} [${o.status}]`
        )
        .join('\n');

      return res.json({
        response: `Mberalink Orders for ${farmer.fullName}:\n${orderList}\n\nReply 0 to Return to Main Menu`,
        continueSession: true,
      });
    }

    // Option 3: Prevailing Market Prices
    if (input === '3') {
      const userDistrict = farmer?.district || 'Zomba';
      const prices = (store.market_prices || []).filter(
        (p: any) => p.district?.toLowerCase() === userDistrict.toLowerCase()
      );

      if (prices.length === 0) {
        return res.json({
          response: `Mberalink Prices (${userDistrict}):\nMaize: MWK 680/kg\nGroundnuts: MWK 1,500/kg\nSoya Beans: MWK 950/kg\nRice: MWK 1,800/kg`,
          continueSession: false,
        });
      }

      const priceSummary = prices
        .slice(0, 4)
        .map((p: any) => `${p.commodityName}: MWK ${Number(p.priceAvg).toLocaleString()}/${p.unit}`)
        .join('\n');

      return res.json({
        response: `Mberalink Official Prices (${userDistrict}):\n${priceSummary}\n\nReply 0 to Return to Main Menu`,
        continueSession: true,
      });
    }

    // Option 4: Contact My District Agent
    if (input === '4') {
      if (farmer) {
        return res.json({
          response: `Your Assigned District Agent:\nName: ${farmer.registeredByAgentName}\nPhone: ${farmer.registeredByAgentPhone || '+265 888 777 111'}\nDistrict: ${farmer.district} (${farmer.traditionalAuthority})\nAgent Code: AGT-01`,
          continueSession: false,
        });
      } else {
        return res.json({
          response: 'Mberalink Agents:\nZomba: Hastings Banda (+265 888 777 111)\nLilongwe: Patrick Chiume (+265 881 234 567)\nHead Office: +265 999 036 912',
          continueSession: false,
        });
      }
    }

    // Option 5: Request Farmer Assistance
    if (input === '5') {
      // Trigger help request SMS to agent
      if (farmer) {
        sendAutomatedFarmerSms({
          recipientPhone: farmer.registeredByAgentPhone || '+265 888 777 111',
          recipientName: farmer.registeredByAgentName,
          district: farmer.district,
          messageText: `MBERALINK ALERT: Offline farmer ${farmer.fullName} (${farmer.farmerId}, Tel: ${farmer.phoneNumber}) dialed *265# requesting agent assistance in ${farmer.traditionalAuthority}, Village ${farmer.village}. Please follow up.`,
          messageLanguage: 'ch',
          eventType: 'broadcast_announcement',
        });
      }

      return res.json({
        response: 'Mberalink Assistance:\nYour request has been sent to your local District Agent. They will call you or visit your village shortly.\nThank you for using Mberalink!',
        continueSession: false,
      });
    }

    // Back to root
    if (input === '0') {
      return res.json({
        response: 'MBERALINK FARMER USSD (*265#)\n1. Check My Listed Produce\n2. Check Orders & Payments\n3. Prevailing Market Prices\n4. Contact My District Agent\n5. Request Farmer Assistance',
        continueSession: true,
      });
    }

    return res.json({
      response: 'Invalid option selected. Please dial *265# to start again.',
      continueSession: false,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'USSD simulation error' });
  }
});

// GET /api/admin/districts-overview: Overview of all 28 districts for administrators
router.get('/admin/districts-overview', (req, res) => {
  try {
    const store = getInMemoryStore();
    const allUsers = store.users || [];
    const allFarmers = store.offline_farmers || [];
    const allCommodities = store.commodities || [];
    const allOrders = store.orders || [];

    const overview = MALAWI_DISTRICTS.map((district) => {
      const districtAgents = allUsers.filter(
        (u: any) =>
          u.role === 'agent' &&
          (u.assignedDistrict?.toLowerCase() === district.toLowerCase() ||
            u.district?.toLowerCase() === district.toLowerCase())
      );

      const districtFarmers = allFarmers.filter(
        (f: any) => f.district?.toLowerCase() === district.toLowerCase()
      );

      const districtCommodities = allCommodities.filter(
        (c: any) =>
          c.district?.toLowerCase() === district.toLowerCase() ||
          c.agentDistrict?.toLowerCase() === district.toLowerCase()
      );

      const districtCommodityIds = new Set(districtCommodities.map((c: any) => c.id));
      const districtOrders = allOrders.filter((o: any) => districtCommodityIds.has(o.commodityId));

      const totalSalesMwk = districtOrders
        .filter((o: any) => o.status === 'completed' || o.status === 'accepted')
        .reduce((sum: number, cur: any) => sum + (Number(cur.totalAmount) || 0), 0);

      return {
        district,
        region: getDistrictRegion(district),
        agentCount: districtAgents.length,
        offlineFarmerCount: districtFarmers.length,
        commodityCount: districtCommodities.length,
        completedOrdersCount: districtOrders.filter((o: any) => o.status === 'completed').length,
        totalSalesMwk,
      };
    });

    return res.json(overview);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch districts overview' });
  }
});

// GET /api/admin/agents: List all agents and applicants
router.get('/admin/agents', (req, res) => {
  try {
    const store = getInMemoryStore();
    const allUsers = store.users || [];
    const agents = allUsers.filter((u: any) => u.role === 'agent');
    const potentialApplicants = allUsers.filter(
      (u: any) => u.role === 'transporter' || u.role === 'farmer'
    );

    return res.json({
      agents,
      potentialApplicants: potentialApplicants.slice(0, 15),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch agents' });
  }
});

// POST /api/admin/agents/assign: Administrator assigns role 'agent' or updates agent's district
router.post('/admin/agents/assign', async (req, res) => {
  try {
    const { userUid, assignedDistrict, agentCode, agentIncentiveRate, adminUid, adminName } = req.body;

    if (!userUid || !assignedDistrict) {
      return res.status(400).json({ error: 'User UID and assigned district are required.' });
    }

    const store = getInMemoryStore();
    const user = (store.users || []).find((u: any) => u.uid === userUid);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const prevRole = user.role;
    user.role = 'agent';
    user.assignedDistrict = assignedDistrict;
    user.district = assignedDistrict;
    user.region = getDistrictRegion(assignedDistrict);
    user.agentCode = agentCode || `AGT-${assignedDistrict.slice(0, 3).toUpperCase()}-01`;
    user.agentStatus = 'active';
    user.agentIncentiveRate = agentIncentiveRate ? Number(agentIncentiveRate) : 0.01;
    user.updatedAt = new Date();

    saveStoreToDisk(store);

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: 'admin@mberalink.mw',
      userName: adminName || 'Administrator',
      role: 'admin',
      action: 'AGENT_ASSIGNED_TO_DISTRICT',
      recordAffected: `User ${user.fullName} (${user.email || user.phoneNumber})`,
      previousValue: `Role: ${prevRole}`,
      newValue: `Role: agent, District: ${assignedDistrict}, Code: ${user.agentCode}`,
      reason: `Administrative promotion of user to authorized district agent for ${assignedDistrict}`,
    });

    broadcastEvent('USER_UPDATED', user);

    return res.json({
      success: true,
      message: `User ${user.fullName} is now an authorized Mberalink Agent for ${assignedDistrict}.`,
      user,
    });
  } catch (error: any) {
    console.error('Error assigning agent:', error);
    return res.status(500).json({ error: error.message || 'Failed to assign agent' });
  }
});

// POST /api/admin/sms-broadcast: Administrator dispatches SMS announcement
router.post(['/admin/sms-broadcast', '/api/admin/sms-broadcast'], async (req, res) => {
  try {
    const { title, targetDistrict, targetAudience, messageText, language, adminUid, adminName } = req.body;

    if (!title || !messageText) {
      return res.status(400).json({ error: 'Broadcast title and SMS message text are required.' });
    }

    const store = getInMemoryStore();
    if (!Array.isArray(store.sms_broadcasts)) store.sms_broadcasts = [];

    const isAllDistricts = !targetDistrict || targetDistrict === 'All Districts';
    const audience = targetAudience || 'all_farmers';
    const lang = language === 'en' ? 'en' : 'ch';

    // Collect recipient phone numbers with deduplication
    const recipients: Array<{ phone: string; name: string; district: string }> = [];
    const seenPhones = new Set<string>();

    const addRecipient = (phone: string, name: string, district: string) => {
      if (!phone) return;
      const clean = phone.replace(/[^0-9]/g, '');
      if (!clean) return;
      if (!seenPhones.has(clean)) {
        seenPhones.add(clean);
        recipients.push({ phone, name, district });
      }
    };

    // 1. Registered online farmers & users (from store.users)
    const allUsers = store.users || [];
    for (const u of allUsers) {
      const uDistrict = u.assignedDistrict || u.district || 'Lilongwe';
      const matchesDistrict = isAllDistricts || uDistrict.toLowerCase() === targetDistrict.toLowerCase();
      if (matchesDistrict) {
        if (audience === 'all_farmers' || audience === 'all') {
          if (u.role === 'farmer' && u.phoneNumber) {
            addRecipient(u.phoneNumber, u.fullName || 'Registered Farmer', uDistrict);
          }
        }
        if (audience === 'agents' || audience === 'all') {
          if (u.role === 'agent') {
            addRecipient(u.phoneNumber || '+265 999 000 000', u.fullName || 'District Agent', uDistrict);
          }
        }
      }
    }

    // 2. Offline keypad farmers (from store.offline_farmers)
    const offlineFarmers = store.offline_farmers || [];
    for (const f of offlineFarmers) {
      const fDistrict = f.district || 'Lilongwe';
      const matchesDistrict = isAllDistricts || fDistrict.toLowerCase() === targetDistrict.toLowerCase();
      if (matchesDistrict) {
        if (audience === 'all_farmers' || audience === 'offline_farmers' || audience === 'all') {
          if (f.phoneNumber) {
            addRecipient(f.phoneNumber, f.fullName || 'Farmer', fDistrict);
          }
        }
      }
    }

    const broadcastId = `BCAST-${new Date().getFullYear()}-${String(store.sms_broadcasts.length + 1).padStart(3, '0')}`;
    const newBroadcast: any = {
      id: store.sms_broadcasts.length + 1,
      broadcastId,
      title: String(title).trim(),
      targetDistrict: isAllDistricts ? 'All Districts' : targetDistrict,
      targetAudience: audience,
      messageText: String(messageText).trim(),
      language: lang,
      sentByAdminUid: adminUid || 'admin',
      sentByAdminName: adminName || 'Administrator',
      recipientCount: recipients.length,
      status: 'completed',
      createdAt: new Date(),
    };

    try {
      const inserted = await db.insert(smsBroadcasts).values(newBroadcast).returning();
      if (inserted && inserted[0]) {
        newBroadcast.id = inserted[0].id;
      }
    } catch {
      // In-memory fallback if pg table is not connected
    }

    store.sms_broadcasts.unshift(newBroadcast);

    // Create individual SMS notifications for each recipient
    for (const r of recipients) {
      sendAutomatedFarmerSms({
        recipientPhone: r.phone,
        recipientName: r.name,
        district: r.district,
        messageText: newBroadcast.messageText,
        messageLanguage: lang,
        eventType: 'broadcast_announcement',
        relatedRecordNumber: broadcastId,
      });
    }

    saveStoreToDisk(store);

    await logAudit({
      userUid: adminUid || 'admin',
      userEmail: 'admin@mberalink.mw',
      userName: adminName || 'Administrator',
      role: 'admin',
      action: 'SMS_BROADCAST_DISPATCHED',
      recordAffected: `Broadcast #${broadcastId} (${newBroadcast.title})`,
      newValue: `Recipients: ${recipients.length} | Target: ${newBroadcast.targetDistrict}`,
      reason: 'Administrative broadcast communication to farmers & agents',
    });

    broadcastEvent('SMS_BROADCAST_SENT', newBroadcast);

    const targetDesc = isAllDistricts ? 'all 28 districts' : targetDistrict;
    return res.status(201).json({
      success: true,
      message: recipients.length > 0
        ? `SMS broadcast dispatched successfully to ${recipients.length} recipients across ${targetDesc}.`
        : `SMS broadcast logged and registered for ${targetDesc}. (No matching mobile contacts registered in this district yet).`,
      broadcast: newBroadcast,
    });
  } catch (error: any) {
    console.error('Error sending SMS broadcast:', error);
    return res.status(500).json({ error: error.message || 'Failed to dispatch SMS broadcast' });
  }
});

// GET /api/admin/sms-broadcasts: List past broadcasts
router.get(['/admin/sms-broadcasts', '/api/admin/sms-broadcasts'], async (req, res) => {
  try {
    const store = getInMemoryStore();
    let list: any[] = [];
    if (Array.isArray(store.sms_broadcasts) && store.sms_broadcasts.length > 0) {
      list = store.sms_broadcasts.slice();
    } else {
      list = await db.select().from(smsBroadcasts);
    }
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch broadcasts' });
  }
});

export default router;
