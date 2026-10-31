import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FbUser,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { User, UserRole } from '../types/index.ts';
import { safeParseJson, safeParseResponse } from '../lib/api.ts';

interface AuthContextType {
  currentUser: User | null;
  fbUser: FbUser | null;
  idToken: string | null;
  loading: boolean;
  loginWithEmailPassword: (email: string, password: string) => Promise<User>;
  registerWithCredentials: (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role: UserRole;
    district: string;
    phoneNumber?: string;
    tradingArea?: string;
    village?: string;
    vehicleType?: string;
    vehicleRegistration?: string;
    plateNumber?: string;
    licenseType?: string;
    yearsExperience?: string;
    vehicleCapacityKg?: number;
    photoUrl?: string;
  }) => Promise<{ success: boolean; message: string }>;
  uploadProfilePhoto: (photoUrl: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [fbUser, setFbUser] = useState<FbUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Subscribe to Firebase Authentication state changes to persist session across reloads & sessions
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        const isExplicitlyLoggedOut =
          localStorage.getItem('mhh_logged_out') === 'true' ||
          sessionStorage.getItem('mhh_logged_out') === 'true';

        if (user && !isExplicitlyLoggedOut) {
          if (!isMounted) return;
          setFbUser(user);

          const token = await user.getIdToken();
          if (isMounted) setIdToken(token);

          // Determine super admin status by email
          const userEmail = (user.email || '').toLowerCase().trim();
          const isSuperAdmin =
            userEmail === 'petermalikebujr@gmail.com' ||
            userEmail === 'petermalikebu0@gmail.com' ||
            userEmail === 'joshuamalikebu927@gmail.com';

          // First try to fetch existing synced user
          const targetUid = isSuperAdmin ? 'frF3xukObzdA8AhCBYIBPYV0UK13' : user.uid;
          const res = await fetch(`/api/users/${targetUid}`);
          if (res.ok) {
            const profile = await safeParseJson<User | null>(res, null);
            if (profile && isMounted) {
              const localPhoto =
                (profile.uid ? localStorage.getItem(`mhh_user_photo_${profile.uid}`) : null) ||
                (profile.email ? localStorage.getItem(`mhh_user_photo_${profile.email.toLowerCase().trim()}`) : null);
              if (localPhoto && (!profile.photoUrl || profile.photoUrl.trim() === '')) {
                profile.photoUrl = localPhoto;
              }
              setCurrentUser(profile);
              localStorage.setItem('mhh_active_uid', profile.uid);
              sessionStorage.setItem('mhh_active_uid', profile.uid);
              localStorage.setItem('mhh_cached_user', JSON.stringify(profile));
              sessionStorage.setItem('mhh_cached_user', JSON.stringify(profile));
              setLoading(false);
              return;
            }
          }

          // If not yet present in database, sync or create user record
          const syncRes = await fetch('/api/users/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              uid: targetUid,
              email: user.email || 'user@malawiharvesthub.mw',
              fullName: isSuperAdmin ? 'Peter Malikebu' : user.displayName || 'Google User',
              role: isSuperAdmin ? 'admin' : 'farmer',
              district: 'Lilongwe',
              region: 'Central',
            }),
          });

          if (syncRes.ok && isMounted) {
            const syncedUser = await safeParseJson<User | null>(syncRes, null);
            if (syncedUser) {
              setCurrentUser(syncedUser);
              localStorage.setItem('mhh_active_uid', syncedUser.uid);
              sessionStorage.setItem('mhh_active_uid', syncedUser.uid);
              localStorage.setItem('mhh_cached_user', JSON.stringify(syncedUser));
              sessionStorage.setItem('mhh_cached_user', JSON.stringify(syncedUser));
            }
          }
        } else if (!isExplicitlyLoggedOut) {
          // Check if session exists from database email login
          const savedUid =
            localStorage.getItem('mhh_active_uid') ||
            sessionStorage.getItem('mhh_active_uid');

          if (savedUid) {
            const cachedRaw = localStorage.getItem('mhh_cached_user') || sessionStorage.getItem('mhh_cached_user');
            if (cachedRaw) {
              try {
                const parsed = JSON.parse(cachedRaw);
                if (parsed && (parsed.uid === savedUid || String(parsed.id) === savedUid) && isMounted) {
                  setCurrentUser(parsed);
                }
              } catch {
                // ignore cache parse error
              }
            }

            const res = await fetch(`/api/users/${savedUid}`);
            if (res.ok && isMounted) {
              const u = await safeParseJson<User | null>(res, null);
              if (u) {
                const localPhoto =
                  (u.uid ? localStorage.getItem(`mhh_user_photo_${u.uid}`) : null) ||
                  (u.email ? localStorage.getItem(`mhh_user_photo_${u.email.toLowerCase().trim()}`) : null);
                if (localPhoto && (!u.photoUrl || u.photoUrl.trim() === '')) {
                  u.photoUrl = localPhoto;
                }
                setCurrentUser(u);
                localStorage.setItem('mhh_cached_user', JSON.stringify(u));
                sessionStorage.setItem('mhh_cached_user', JSON.stringify(u));
              }
            }
          }
        } else {
          if (isMounted) {
            setCurrentUser(null);
            setFbUser(null);
            setIdToken(null);
          }
        }
      } catch (err) {
        console.error('Error during Firebase auth state synchronization:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.uid}`);
      if (res.ok) {
        const u = await safeParseJson<User | null>(res, null);
        if (u) {
          setCurrentUser(u);
          localStorage.setItem('mhh_cached_user', JSON.stringify(u));
          sessionStorage.setItem('mhh_cached_user', JSON.stringify(u));
        }
      }
      if (fbUser) {
        const token = await fbUser.getIdToken(true);
        setIdToken(token);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      // Attempt Firebase Auth sign-in if the email/password provider is enabled
      try {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (userCred.user) {
          setFbUser(userCred.user);
          const token = await userCred.user.getIdToken();
          setIdToken(token);
        }
      } catch (fbErr: any) {
        // Log info; proceed to verified backend login check so local/admin accounts seamlessly authenticate
        console.debug('Firebase Auth sign in fallback to database login:', fbErr?.code || fbErr?.message);
      }

      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Invalid email or password.');
      }

      const user: User = parsed.data?.user;
      if (!user) {
        throw new Error('User record missing in response');
      }

      setCurrentUser(user);
      sessionStorage.removeItem('mhh_logged_out');
      localStorage.removeItem('mhh_logged_out');
      sessionStorage.setItem('mhh_active_uid', user.uid);
      localStorage.setItem('mhh_active_uid', user.uid);
      localStorage.setItem('mhh_cached_user', JSON.stringify(user));
      sessionStorage.setItem('mhh_cached_user', JSON.stringify(user));
      return user;
    } catch (err) {
      console.error('Email/Password login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithCredentials = async (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role: UserRole;
    district: string;
    phoneNumber?: string;
    tradingArea?: string;
    village?: string;
    vehicleType?: string;
    vehicleRegistration?: string;
    plateNumber?: string;
    licenseType?: string;
    yearsExperience?: string;
    vehicleCapacityKg?: number;
    photoUrl?: string;
  }): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      // Attempt to register in Firebase Auth if provider is configured
      try {
        await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      } catch (fbErr: any) {
        console.debug('Firebase Auth registration fallback:', fbErr?.code || fbErr?.message);
      }

      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Registration failed.');
      }

      return {
        success: true,
        message: parsed.data?.message || 'Account created successfully! Please sign in with your email and password.',
      };
    } finally {
      setLoading(false);
    }
  };

  const uploadProfilePhoto = async (photoUrl: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/profile-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, photoUrl }),
      });
      if (res.ok) {
        const data: any = await safeParseJson(res, null);
        if (data?.user) {
          const updatedUser = { ...data.user, photoUrl };
          setCurrentUser(updatedUser);
          localStorage.setItem('mhh_cached_user', JSON.stringify(updatedUser));
          sessionStorage.setItem('mhh_cached_user', JSON.stringify(updatedUser));
          if (updatedUser.uid) {
            localStorage.setItem(`mhh_user_photo_${updatedUser.uid}`, photoUrl);
          }
          if (updatedUser.email) {
            localStorage.setItem(`mhh_user_photo_${updatedUser.email.toLowerCase().trim()}`, photoUrl);
          }
        }
      } else {
        const parsed = await safeParseResponse(res);
        throw new Error(parsed.error || 'Failed to update profile photo');
      }
    } catch (err) {
      console.error('Failed to upload profile photo:', err);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const user = cred.user;
      setFbUser(user);
      const token = await user.getIdToken();
      setIdToken(token);
      sessionStorage.removeItem('mhh_logged_out');
      localStorage.removeItem('mhh_logged_out');

      const isSuperAdmin =
        user.email === 'petermalikebujr@gmail.com' ||
        user.email === 'petermalikebu0@gmail.com' ||
        user.email === 'joshuamalikebu927@gmail.com';

      // Sync or create in centralized database
      const syncRes = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: isSuperAdmin ? 'frF3xukObzdA8AhCBYIBPYV0UK13' : user.uid,
          email: user.email || 'user@malawiharvesthub.mw',
          fullName: isSuperAdmin ? 'Peter Malikebu' : user.displayName || 'Google User',
          role: isSuperAdmin ? 'admin' : 'farmer',
          district: 'Lilongwe',
          region: 'Central',
        }),
      });

      if (syncRes.ok) {
        const dbUser: User | null = await safeParseJson<User | null>(syncRes, null);
        if (dbUser) {
          setCurrentUser(dbUser);
          sessionStorage.setItem('mhh_active_uid', dbUser.uid);
          localStorage.setItem('mhh_active_uid', dbUser.uid);
          localStorage.setItem('mhh_cached_user', JSON.stringify(dbUser));
          sessionStorage.setItem('mhh_cached_user', JSON.stringify(dbUser));
        }
      }
    } catch (err) {
      console.error('Google Sign In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUser.uid,
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          ...currentUser,
          ...data,
          uid: currentUser.uid,
          email: currentUser.email,
        }),
      });
      if (res.ok) {
        const updated = await safeParseJson<User | null>(res, null);
        if (updated) {
          setCurrentUser(updated);
          localStorage.setItem('mhh_cached_user', JSON.stringify(updated));
          sessionStorage.setItem('mhh_cached_user', JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }
    setFbUser(null);
    setIdToken(null);
    localStorage.removeItem('mhh_active_uid');
    localStorage.removeItem('mhh_cached_user');
    sessionStorage.removeItem('mhh_active_uid');
    sessionStorage.removeItem('mhh_cached_user');
    localStorage.setItem('mhh_logged_out', 'true');
    sessionStorage.setItem('mhh_logged_out', 'true');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        fbUser,
        idToken,
        loading,
        loginWithEmailPassword,
        registerWithCredentials,
        uploadProfilePhoto,
        loginWithGoogle,
        updateProfile,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
