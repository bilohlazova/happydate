"use client";

export const dynamic = "force-dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const next = url.searchParams.get("next") || "/dashboard";
      const code = url.searchParams.get("code");

      try {
        if (code) {
          // PKCE / code flow (?code=...)
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          router.replace(next);
          return;
        }

        // Hash flow (#access_token=...&refresh_token=...)
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
          router.replace(next);
          return;
        }

        // Якщо нічого з вище — повертаємо на логін
        router.replace("/auth/login");
      } catch {
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
