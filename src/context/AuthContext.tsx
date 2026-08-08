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
import { isFirebaseConfigured } from "@/firebase/config";
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
  /** True when Firebase is not configured and demo accounts are in use. */
  demoMode: boolean;
  /** Creates a new account with email + password (and optionally a name). */
  signup: (email: string, password: string, name?: string) => Promise<void>;
  /** Signs in with email + password. */
  login: (email: string, password: string) => Promise<void>;
  /** Signs in with a Google popup. */
  googleLogin: () => Promise<void>;
  /** Demo-only: signs in with a local demo account (no Firebase needed). */
  demoLogin: (email?: string) => Promise<void>;
  /** Signs out the current user and clears auth state. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USER_KEY = "urbansafe-demo-user";

function buildDemoUser(email: string): User {
  const displayName = email.split("@")[0] || "Demo User";
  return {
    uid: `demo-${Math.abs(hashString(email)).toString(36)}`,
    email,
    displayName,
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
    metadata: { creationTime: String(Date.now()), lastSignInTime: String(Date.now()) },
    phoneNumber: null,
    refreshToken: "",
    tenantId: null,
    delete: async () => undefined,
    getIdToken: async () => "",
    getIdTokenResult: async () => ({ token: "" }) as never,
    reload: async () => undefined,
    toJSON: () => ({}),
  } as unknown as User;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function readStoredDemoUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email: string };
    return parsed?.email ? buildDemoUser(parsed.email) : null;
  } catch {
    return null;
  }
}

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

    if (!isFirebaseConfigured()) {
      // Demo mode: Firebase is not configured, so authentication uses
      // stable local demo accounts. Multiple tabs/accounts stay in sync
      // via the browser storage event, enabling two-user testing.
      const stored = readStoredDemoUser();
      if (stored) {
        setUser(stored);
        void ensureProfile(stored);
      }
      const onStorage = (event: StorageEvent) => {
        if (cancelled) return;
        if (event.key === DEMO_USER_KEY) {
          const next = readStoredDemoUser();
          if (next) {
            setUser(next);
            void ensureProfile(next);
          }
        }
        if (event.key === "urbansafe-demo-signout") {
          setUser(null);
          setProfile(null);
        }
      };
      window.addEventListener("storage", onStorage);
      setLoading(false);
      return () => {
        cancelled = true;
        window.removeEventListener("storage", onStorage);
      };
    }

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

  const demoLogin = useCallback(
    async (email?: string) => {
      if (isFirebaseConfigured()) {
        throw new Error("Demo login is only available when Firebase is not configured.");
      }
      const demoEmail = (email ?? "demo-a@urbansafe.test").trim() || "demo-a@urbansafe.test";
      const demoUser = buildDemoUser(demoEmail);
      try {
        window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify({ email: demoEmail }));
      } catch {
        // ignore storage errors
      }
      setUser(demoUser);
      await ensureProfile(demoUser);
      toast.success(`Signed in as demo user ${demoUser.displayName}.`);
    },
    [ensureProfile]
  );

  const logout = useCallback(async () => {
    if (isFirebaseConfigured()) {
      await logOut();
    } else {
      try {
        window.localStorage.removeItem(DEMO_USER_KEY);
        window.localStorage.setItem("urbansafe-demo-signout", String(Date.now()));
        window.localStorage.removeItem("urbansafe-demo-signout");
      } catch {
        // ignore storage errors
      }
    }
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
      demoMode: !isFirebaseConfigured(),
      signup,
      login,
      googleLogin,
      demoLogin,
      logout,
    }),
    [user, profile, loading, profileLoading, signup, login, googleLogin, demoLogin, logout]
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
