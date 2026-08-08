"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import toast from "react-hot-toast";
import {
  logInWithEmail,
  logInWithGoogle,
  logOut,
  signUpWithEmail,
  subscribeToAuthChanges,
} from "@/firebase/auth";
import { ensureUserProfile, getUserProfile } from "@/firebase/firestore";
import { buildUserProfileInput, parseUserProfile, type UserProfile } from "@/lib/user";

export interface AuthContextValue {
  /** The current Firebase user, or null when signed out. */
  user: User | null;
  /** The user's Firestore profile, or null while unknown. */
  profile: UserProfile | null;
  /** True until the initial auth state has been resolved. */
  loading: boolean;
  /** True while the Firestore profile is being fetched/created. */
  profileLoading: boolean;
  /** Creates a new account with email + password (and optionally a name). */
  signup: (email: string, password: string, name?: string) => Promise<void>;
  /** Signs in with email + password. */
  login: (email: string, password: string) => Promise<void>;
  /** Signs in with a Google popup. */
  googleLogin: () => Promise<void>;
  /** Signs out the current user and clears auth state. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const ensureProfile = useCallback(async (authUser: User) => {
    try {
      setProfileLoading(true);
      let existing = await getUserProfile(authUser.uid);

      if (!existing) {
        existing = await ensureUserProfile(
          buildUserProfileInput(authUser)
        );
      }

      setProfile(parseUserProfile(existing));
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToAuthChanges((authUser) => {
        if (cancelled) return;

        if (authUser) {
          setUser(authUser);
          void ensureProfile(authUser);
        } else {
          setUser(null);
          setProfile(null);
        }

        setLoading(false);
      });
    } catch {
      // Firebase is not configured yet — render as signed out.
      setLoading(false);
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [ensureProfile]);

  const signup = useCallback(
    async (email: string, password: string, name?: string) => {
      const authUser = await signUpWithEmail(email, password, name);
      setUser(authUser);
      await ensureProfile(authUser);
      toast.success("Account created. Welcome aboard!");
    },
    [ensureProfile]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const authUser = await logInWithEmail(email, password);
      setUser(authUser);
      await ensureProfile(authUser);
      toast.success("Logged in successfully.");
    },
    [ensureProfile]
  );

  const googleLogin = useCallback(async () => {
    const authUser = await logInWithGoogle();
    setUser(authUser);
    await ensureProfile(authUser);
    toast.success("Logged in with Google.");
  }, [ensureProfile]);

  const logout = useCallback(async () => {
    await logOut();
    setUser(null);
    setProfile(null);
    toast.success("Signed out. See you soon!");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      signup,
      login,
      googleLogin,
      logout,
    }),
    [user, profile, loading, profileLoading, signup, login, googleLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Accesses the auth context. Throws when used outside an AuthProvider. */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
