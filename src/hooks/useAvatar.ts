"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logOperationalWarning } from "@/lib/observability/safeLogger";

/** Повертає publicUrl аватарки (або null) і метод refresh() */
export function useAvatar(userId?: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  const refresh = async () => {
    if (!userId) return setUrl(null);

    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (error) {
      logOperationalWarning("avatar", "profile-select-failed", error);
      return setUrl(null);
    }

    const path = data?.avatar_url as string | null;
    if (!path) return setUrl(null);

    const key = path.startsWith("avatars/") ? path.replace(/^avatars\//, "") : path;
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(key);
    setUrl(pub?.publicUrl ?? null);
  };

  useEffect(() => {
    // Avatar ownership changes require a fresh storage lookup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { url, refresh, setUrl };
}
