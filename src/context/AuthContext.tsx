import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut as fbSignOut, User as FbUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { User, UserRole } from '../types/index.ts';

interface AuthContextType {
  currentUser: User | null;
  fbUser: FbUser | null;
  idToken: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  loginAsUser: (uid: string) => Promise<void>;
  registerNewUser: (data: {
    email: string;
    fullName: string;
    role: UserRole;
    district: string;
    phoneNumber?: string;
    tradingArea?: string;
    vehicleType?: string;
  }) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset demo users seeded in the database for instant role testing
const DEMO_UID_MAP: Record<UserRole, string> = {
  farmer: 'farmer-chimwemwe-01',
  buyer: 'buyer-alinafe-02',
  transporter: 'transporter-kondwani-03',
  admin: 'frF3xukObzdA8AhCBYIBPYV0UK13', // Peter Malikebu (Default Admin)
  finance_admin: 'finance-chisomo-05',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [fbUser, setFbUser] = useState<FbUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load saved active UID from session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const isLoggedOut = sessionStorage.getItem('mhh_logged_out') === 'true';
        const savedUid = sessionStorage.getItem('mhh_active_uid');

        if (savedUid) {
          const res = await fetch(`/api/users/${savedUid}`);
          if (res.ok) {
            const u: User = await res.json();
            setCurrentUser(u);
            return;
          }
        }

        // If explicitly logged out, keep logged out
        if (isLoggedOut) {
          setCurrentUser(null);
          return;
        }

        // First-time visit: default to farmer
        const fbRes = await fetch(`/api/users/${DEMO_UID_MAP.farmer}`);
        if (fbRes.ok) {
          const u: User = await fbRes.json();
          setCurrentUser(u);
          sessionStorage.setItem('mhh_active_uid', u.uid);
        }
      } catch (err) {
        console.error('Failed to load initial user profile:', err);
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
        const u = await res.json();
        setCurrentUser(u);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
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

      const isAdminUser =
        user.uid === '9DXK6Cfy4FaODmqyVm7q8yrKup82' ||
        user.uid === 'frF3xukObzdA8AhCBYIBPYV0UK13' ||
        user.email === 'joshuamalikebu927@gmail.com' ||
        user.email === 'petermalikebujr@gmail.com' ||
        user.email === 'petermalikebu0@gmail.com';

      // Sync or create in PostgreSQL database
      const syncRes = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email || 'user@malawiharvesthub.mw',
          fullName: user.displayName || 'Google User',
          role: isAdminUser ? 'admin' : 'farmer',
          district: 'Lilongwe',
          region: 'Central',
        }),
      });

      if (syncRes.ok) {
        const dbUser = await syncRes.json();
        setCurrentUser(dbUser);
        sessionStorage.setItem('mhh_active_uid', dbUser.uid);
      }
    } catch (err) {
      console.error('Google Sign In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    try {
      setLoading(true);
      sessionStorage.removeItem('mhh_logged_out');
      const targetUid = DEMO_UID_MAP[role];
      const res = await fetch(`/api/users/${targetUid}`);
      if (res.ok) {
        const u = await res.json();
        setCurrentUser(u);
        sessionStorage.setItem('mhh_active_uid', u.uid);
      }
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setLoading(false);
    }
  };

  const loginAsUser = async (uid: string) => {
    try {
      setLoading(true);
      sessionStorage.removeItem('mhh_logged_out');
      const res = await fetch(`/api/users/${uid}`);
      if (res.ok) {
        const u = await res.json();
        setCurrentUser(u);
        sessionStorage.setItem('mhh_active_uid', u.uid);
      } else {
        throw new Error('User not found');
      }
    } catch (err) {
      console.error('Failed to log in as user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerNewUser = async (data: {
    email: string;
    fullName: string;
    role: UserRole;
    district: string;
    phoneNumber?: string;
    tradingArea?: string;
    vehicleType?: string;
  }) => {
    try {
      setLoading(true);
      sessionStorage.removeItem('mhh_logged_out');
      const uid = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          ...data,
        }),
      });
      if (res.ok) {
        const newUser = await res.json();
        setCurrentUser(newUser);
        sessionStorage.setItem('mhh_active_uid', newUser.uid);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to register account');
      }
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
        const updated = await res.json();
        setCurrentUser(updated);
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
    sessionStorage.removeItem('mhh_active_uid');
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
        loginWithGoogle,
        switchDemoRole,
        loginAsUser,
        registerNewUser,
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
