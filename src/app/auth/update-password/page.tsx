"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";
import { mapAuthError } from "@/lib/auth/mapAuthError";
import { MobileUI } from "@/lib/theme/mobile";
import { AuthLegalLinks } from "@/components/auth/AuthLegalLinks";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const translate = useTranslations("auth");

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  // 🔒 Sprawdzamy, czy jest aktywna sesja resetu
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setErr(translate("updatePassword.noSession"));
      }
    })();
  }, [translate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (password.length < 8) {
      setErr(translate("validation.passwordTooShort"));
      return;
    }
    if (password !== password2) {
      setErr(translate("validation.passwordMismatch"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErr(translate(`errors.${mapAuthError(error)}`));
    } else {
      setMsg(translate("updatePassword.success"));
      // przekierowanie do logowania po 2 sekundach
      setTimeout(() => router.replace("/auth/login"), 2000);
    }
  };

  return (
    <main className={`auth-care-page ${MobileUI.screen} flex items-center justify-center px-4 py-6`}>
      <div className={`auth-care-card ${MobileUI.card} w-full max-w-[430px] p-5`}>
        <div className="auth-care-brand" aria-hidden="true"><span>♥</span> HappyDate</div>
        <p className="auth-care-eyebrow">{translate("brand.eyebrow")}</p>
        <h1 className="text-2xl font-bold mb-1 text-sky-600">{translate("updatePassword.title")}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {translate("updatePassword.subtitle")}
        </p>
        <div className="auth-care-promise"><span aria-hidden="true">🔐</span>{translate("updatePassword.promise")}</div>

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

        <form onSubmit={handleUpdate} className="auth-care-form space-y-4" aria-label={translate("accessibility.updatePasswordForm")}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="auth-new-password">
              {translate("updatePassword.newPassword")}
            </label>
            <div className="relative">
              <input
                id="auth-new-password"
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${MobileUI.input} pr-11`}
                minLength={8}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPwd((value) => !value)} className="absolute inset-y-0 right-0 min-w-11 px-3 text-gray-500" aria-label={translate(showPwd ? "common.hidePassword" : "common.showPassword")}>
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="auth-confirm-password">
              {translate("updatePassword.confirmPassword")}
            </label>
            <input
              id="auth-confirm-password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              className={MobileUI.input}
              minLength={8}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${MobileUI.button} auth-care-submit w-full text-white disabled:opacity-60`}
          >
            {loading ? translate("updatePassword.submitting") : translate("updatePassword.submit")}
          </button>
        </form>
        <AuthLegalLinks />
      </div>
    </main>
  );
}
