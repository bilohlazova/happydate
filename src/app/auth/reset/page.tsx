"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";
import { mapAuthError } from "@/lib/auth/mapAuthError";
import { Capacitor } from "@capacitor/core";
import { nativeAuthRedirect, webAuthOrigin } from "@/lib/navigation/safeDeepLink";
import { MobileUI } from "@/lib/theme/mobile";
import { AuthLegalLinks } from "@/components/auth/AuthLegalLinks";

export default function ResetPasswordPage() {
  const translate = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);

    const appUrl = webAuthOrigin();
    // Po kliknięciu w mailu użytkownik trafi na formularz ustawienia nowego hasła
    const redirectTo = Capacitor.isNativePlatform()
      ? nativeAuthRedirect("/auth/update-password")
      : `${appUrl}/auth/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setLoading(false);

    if (error) {
      setErr(translate(`errors.${mapAuthError(error)}`));
    } else {
      setMsg(translate("reset.success"));
      setTimeout(() => setMsg(null), 5000);
    }
  };

  return (
    <main className={`auth-care-page ${MobileUI.screen} flex items-center justify-center px-4 py-6`}>
      <div className={`auth-care-card ${MobileUI.card} w-full max-w-[430px] p-5`}>
        <div className="auth-care-brand" aria-hidden="true"><span>♥</span> HappyDate</div>
        <p className="auth-care-eyebrow">{translate("brand.eyebrow")}</p>
        <h1 className="text-2xl font-bold mb-1 text-sky-600">{translate("reset.title")}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {translate("reset.subtitle")}
        </p>
        <div className="auth-care-promise"><span aria-hidden="true">✉️</span>{translate("reset.promise")}</div>

        {err && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
        {msg && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {msg}
          </div>
        )}

        <form onSubmit={handleReset} className="auth-care-form space-y-4" aria-label={translate("accessibility.resetForm")}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="auth-reset-email">
              {translate("common.email")}
            </label>
            <input
              id="auth-reset-email"
              type="email"
              required
              placeholder={translate("common.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={MobileUI.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${MobileUI.button} auth-care-submit w-full text-white disabled:opacity-60`}
          >
            {loading ? translate("reset.submitting") : translate("reset.submit")}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <a href="/auth/login" className="text-sky-600 hover:underline">
            ← {translate("reset.backToLogin")}
          </a>
        </div>
        <AuthLegalLinks />
      </div>
    </main>
  );
}
