import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut as fbSignOut, User as FbUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { User, UserRole } from '../types/index.ts';

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

  // Load saved active UID from session only if explicitly signed in
  useEffect(() => {
    const initAuth = async () => {
      try {
        const isLoggedOut = sessionStorage.getItem('mhh_logged_out') === 'true';
        const savedUid = sessionStorage.getItem('mhh_active_uid');

        if (!isLoggedOut && savedUid) {
          const res = await fetch(`/api/users/${savedUid}`);
          if (res.ok) {
            const u: User = await res.json();
            setCurrentUser(u);
            return;
          }
        }

        // On first visit or if logged out, do NOT auto-login.
        // User should view the landing page and choose to sign in or create an account.
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
        const u = await res.json();
        setCurrentUser(u);
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      const user: User = data.user;
      setCurrentUser(user);
      sessionStorage.removeItem('mhh_logged_out');
      sessionStorage.setItem('mhh_active_uid', user.uid);
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

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Registration failed.');
      }

      // DO NOT auto-login as instructed by user:
      // prompt him or her to sign in after signing up.
      return {
        success: true,
        message: resData.message || 'Account created successfully! Please sign in with your email and password.',
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
        const data = await res.json();
        setCurrentUser(data.user);
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
