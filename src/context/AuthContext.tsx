import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut as fbSignOut, User as FbUser } from 'firebase/auth';
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

  // Load saved active UID from storage so session and profile persist across tab close & refresh
  useEffect(() => {
    const initAuth = async () => {
      try {
        const isLoggedOut =
          localStorage.getItem('mhh_logged_out') === 'true' ||
          sessionStorage.getItem('mhh_logged_out') === 'true';
        const savedUid =
          localStorage.getItem('mhh_active_uid') ||
          sessionStorage.getItem('mhh_active_uid');

        if (!isLoggedOut && savedUid) {
          // Check cached user first for instantaneous UI render
          const cachedRaw = localStorage.getItem('mhh_cached_user') || sessionStorage.getItem('mhh_cached_user');
          if (cachedRaw) {
            try {
              const parsed = JSON.parse(cachedRaw);
              if (parsed && (parsed.uid === savedUid || String(parsed.id) === savedUid)) {
                const localPhoto =
                  (parsed.uid ? localStorage.getItem(`mhh_user_photo_${parsed.uid}`) : null) ||
                  (parsed.email ? localStorage.getItem(`mhh_user_photo_${parsed.email.toLowerCase().trim()}`) : null);
                if (localPhoto && (!parsed.photoUrl || parsed.photoUrl.trim() === '')) {
                  parsed.photoUrl = localPhoto;
                }
                setCurrentUser(parsed);
              }
            } catch (e) {
              // ignore cache parse error
            }
          }

          const res = await fetch(`/api/users/${savedUid}`);
          if (res.ok) {
            const u = await safeParseJson<User | null>(res, null);
            if (u) {
              const localPhoto =
                (u.uid ? localStorage.getItem(`mhh_user_photo_${u.uid}`) : null) ||
                (u.email ? localStorage.getItem(`mhh_user_photo_${u.email.toLowerCase().trim()}`) : null);
              if (localPhoto && (!u.photoUrl || u.photoUrl.trim() === '')) {
                u.photoUrl = localPhoto;
              } else if (u.photoUrl) {
                if (u.uid) localStorage.setItem(`mhh_user_photo_${u.uid}`, u.photoUrl);
                if (u.email) localStorage.setItem(`mhh_user_photo_${u.email.toLowerCase().trim()}`, u.photoUrl);
              }
              setCurrentUser(u);
              localStorage.setItem('mhh_cached_user', JSON.stringify(u));
              sessionStorage.setItem('mhh_cached_user', JSON.stringify(u));
              return;
            }
          }
        }

        // On first visit or if explicitly logged out, user signs in
        setCurrentUser(null);
      } catch (err) {
        console.error('Failed to load initial user profile:', err);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
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
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
    photoUrl?: string;
  }): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Registration failed.');
      }

      // DO NOT auto-login as instructed by user:
      // prompt him or her to sign in after signing up.
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

      // Sync or create in database
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
        },
        body: JSON.stringify({
          ...currentUser,
          ...data,
          uid: currentUser.uid,
          email: currentUser.email,
        }),
      });
      if (res.ok) {
        const updated = await safeParseJson(res, null);
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
      // ignore
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
