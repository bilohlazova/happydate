"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";

export default function AuthCallbackPage() {
  const router = useRouter();
  const translate = useTranslations("auth.callback");

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
    <main className="auth-care-page flex min-h-screen items-center justify-center px-4">
      <div className="auth-care-card w-full max-w-sm p-6 text-center" role="status">
        <div className="auth-care-brand justify-center" aria-hidden="true"><span>♥</span> HappyDate</div>
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-600">{translate("loading")}</p>
      </div>
    </main>
  );
}
