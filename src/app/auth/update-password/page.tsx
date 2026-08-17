"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";
import { mapAuthError } from "@/lib/auth/mapAuthError";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const translate = useTranslations("auth");

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
    <main className="auth-care-page flex min-h-screen items-center justify-center p-6">
      <div className="auth-care-card w-full max-w-md p-6">
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
            <input
              id="auth-new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="min-h-12 w-full rounded-2xl border p-3 text-base outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              minLength={8}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="auth-confirm-password">
              {translate("updatePassword.confirmPassword")}
            </label>
            <input
              id="auth-confirm-password"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              className="min-h-12 w-full rounded-2xl border p-3 text-base outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              minLength={8}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-care-submit min-h-12 w-full rounded-2xl px-4 font-extrabold text-white transition disabled:opacity-60"
          >
            {loading ? translate("updatePassword.submitting") : translate("updatePassword.submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
