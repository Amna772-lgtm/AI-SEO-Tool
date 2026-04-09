"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { fetchCurrentUser, signOut as apiSignOut, AuthUser, Subscription, fetchSubscription } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  subscription: Subscription | null;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const refreshSubscription = useCallback(async () => {
    try {
      setSubscription(await fetchSubscription());
    } catch {
      setSubscription(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const u = await fetchCurrentUser();
    setUser(u);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await fetchCurrentUser();
        if (!cancelled) {
          setUser(u);
          if (u && !u.is_admin) {
            try {
              const sub = await fetchSubscription();
              if (!cancelled) setSubscription(sub);
            } catch {
              // subscription fetch failure is non-fatal
            }
          }
        }
      } finally {
        // Only mark loading complete after both user AND subscription are resolved
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setUser(null);
    setSubscription(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refresh, subscription, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
