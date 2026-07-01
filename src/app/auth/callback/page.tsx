"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/brain/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);

      const code = url.searchParams.get("code");
      const type = url.searchParams.get("type");
      const next = url.searchParams.get("next");

      try {
        // PKCE flow (?code=...)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Hash flow (#access_token=...)
        const hash = url.hash.startsWith("#") ? url.hash.slice(1) : "";
        const params = new URLSearchParams(hash);

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        }

        // 🔥 НАЙВАЖЛИВІШЕ
        if (type === "recovery") {
          router.replace("/auth/update-password");
          return;
        }

        // normal login redirect
        router.replace(next || "/dashboard");

      } catch (e) {
        console.error(e);
        router.replace("/auth/login");
      }
    };

    run();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-gray-700">Ładowanie…</p>
    </main>
  );
}