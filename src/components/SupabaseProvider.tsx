"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type SupabaseContextType = {
  supabase: typeof supabase;
  session: Session | null;
};

const Context = createContext<SupabaseContextType | undefined>(undefined);

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Context.Provider value={{ supabase, session }}>
      {children}
    </Context.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSupabase must be used inside SupabaseProvider");
  return ctx;
}
