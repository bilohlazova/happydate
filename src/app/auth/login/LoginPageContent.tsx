"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MobileUI } from "@/lib/theme/mobile";
import { useTranslations } from "next-intl";
import { mapAuthError } from "@/lib/auth/mapAuthError";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const translate = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // ——— куди вести після успішної авторизації
  const routeAfterAuth = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    // перевіряємо, чи пройдена анкета
    const { data: survey } = await supabase
      .from("user_survey")
      .select("is_completed")
      .eq("user_id", user.id)
      .maybeSingle();

    const redirectTo = params.get("redirectTo");
    if (survey?.is_completed) {
      router.replace(redirectTo || "/profile");
    } else {
      router.replace("/survey");
    }
  };

  // якщо вже залогінений — відразу перенаправляємо
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) routeAfterAuth();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) routeAfterAuth();
    });
    return () => sub?.subscription?.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    setErrorMsg(null);
    if (!email.match(/^\S+@\S+\.\S+$/)) {
      setErrorMsg(translate("validation.emailInvalid"));
      return false;
    }
    if (password.length < 6) {
      setErrorMsg(translate("validation.passwordTooShort"));
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(translate(`errors.${mapAuthError(error)}`));
      return;
    }

    setInfoMsg(translate("login.success"));
    // редірект виконає useEffect (onAuthStateChange), але зробимо і тут
    await routeAfterAuth();
  };

  return (
    <main className={`auth-care-page ${MobileUI.screen} flex items-center justify-center px-4 py-6`}>
      <div className={`auth-care-card ${MobileUI.card} w-full max-w-[430px] p-5`}>
        <div className="auth-care-brand" aria-hidden="true"><span>♥</span> HappyDate</div>
        <p className="auth-care-eyebrow">{translate("brand.eyebrow")}</p>
        <h1 className="mb-1 text-[2rem] font-black leading-tight text-sky-600">{translate("login.title")}</h1>
        <p className="mb-5 text-sm font-semibold leading-5 text-gray-500">{translate("login.subtitle")}</p>

        <div className="auth-care-promise"><span aria-hidden="true">💛</span>{translate("login.promise")}</div>

        {errorMsg && (
          <div className="mb-4 rounded-[0.95rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 rounded-[0.95rem] border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-care-form space-y-4" aria-label={translate("accessibility.loginForm")}>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700" htmlFor="auth-login-email">{translate("common.email")}</label>
            <input
              id="auth-login-email"
              type="email"
              autoComplete="email"
              placeholder={translate("common.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={MobileUI.input}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700" htmlFor="auth-login-password">{translate("common.password")}</label>
            <div className="relative">
              <input
                id="auth-login-password"
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${MobileUI.input} pr-11`}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute inset-y-0 right-0 min-w-11 px-3 text-gray-500 hover:text-gray-700"
                aria-label={translate(showPwd ? "common.hidePassword" : "common.showPassword")}
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${MobileUI.button} auth-care-submit w-full text-white disabled:opacity-60`}
          >
            {loading ? translate("login.submitting") : translate("login.submit")}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <a href="/auth/reset" className="text-sky-600 hover:underline">
            {translate("login.forgotPassword")}
          </a>
          <a href="/auth/register" className="text-sky-600 hover:underline">
            {translate("login.noAccount")} {translate("login.register")}
          </a>
        </div>

        {/* opcjonalnie: separator i інші методи входу
        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="px-3 text-xs text-gray-400">albo</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <button className="w-full border rounded-md py-2 hover:bg-gray-50">
          Zaloguj przez Google
        </button>
        */}
      </div>
    </main>
  );
}
