"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { shouldApplyInitialAuthResult, shouldApplyProfileResult } from "@/components/authRace";

export type AuthProfile = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  profile: AuthProfile | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  profile: null,
  refreshProfile: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const profileRequestRef = useRef(0);
  const authVersionRef = useRef(0);

  const refreshProfile = useCallback(async () => {
    const requestId = ++profileRequestRef.current;
    const requestedUserId = user?.id ?? null;
    if (!user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (!shouldApplyProfileResult(requestId, profileRequestRef.current, requestedUserId, currentUserRef.current?.id ?? null)) return;
    setProfile(data ? {
      firstName: data.first_name?.trim() || null,
      lastName: data.last_name?.trim() || null,
      fullName: data.full_name?.trim() || null,
    } : null);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const initialAuthVersion = authVersionRef.current;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && shouldApplyInitialAuthResult(initialAuthVersion, authVersionRef.current)) { setUser(data.user); setLoading(false); }
    }).catch(() => {
      if (!cancelled && shouldApplyInitialAuthResult(initialAuthVersion, authVersionRef.current)) { setUser(null); setLoading(false); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      authVersionRef.current += 1;
      currentUserRef.current = session?.user ?? null;
      profileRequestRef.current += 1;
      setProfile(null);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    document.body.dataset.authenticated = user ? "true" : "false";
  }, [user]);

  useEffect(() => {
    currentUserRef.current = user;
    profileRequestRef.current += 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(null);
  }, [user]);

  useEffect(() => {
    void (async () => {
      await refreshProfile();
    })();
  }, [refreshProfile]);

  return <AuthContext.Provider value={{ user, loading, profile, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
