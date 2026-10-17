"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MobileUI } from "@/lib/theme/mobile";
import { useTranslations } from "next-intl";
import { mapAuthError } from "@/lib/auth/mapAuthError";
import { Capacitor } from "@capacitor/core";
import { nativeAuthRedirect, safePostAuthPath, webAuthOrigin } from "@/lib/navigation/safeDeepLink";
import { AuthLegalLinks } from "@/components/auth/AuthLegalLinks";

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const translate = useTranslations("auth");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Куди вести після реєстрації/логіну
  const routeAfterAuth = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    // `profiles` is the canonical source for the optional display name.
    // Keep an existing profile untouched when the field is left blank.
    const canonicalName = `${firstName.trim()} ${lastName.trim()}`.trim();
    await supabase.from("profiles").upsert(
      canonicalName ? { id: user.id, full_name: canonicalName } : { id: user.id },
      { onConflict: "id", ignoreDuplicates: !canonicalName }
    );

    const { data: survey } = await supabase.from("user_survey").select("is_completed").eq("user_id", user.id).maybeSingle();
    const redirectTo = safePostAuthPath(params.get("redirectTo"), survey?.is_completed ? "/" : "/onboarding-preview");
    router.replace(redirectTo);
  };

  // Якщо користувач уже залогінений — відразу перенаправляємо
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

  // Проста валідація
  const validate = () => {
    setErrorMsg(null);
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg(translate("validation.nameRequired"));
      return false;
    }
    if (!email.match(/^\S+@\S+\.\S+$/)) {
      setErrorMsg(translate("validation.emailInvalid"));
      return false;
    }
    if (password.length < 8) {
      setErrorMsg(translate("validation.passwordTooShort"));
      return false;
    }
    if (password !== password2) {
      setErrorMsg(translate("validation.passwordMismatch"));
      return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    // Після підтвердження листа повернемося на /auth/callback,
    // який встановить сесію; потім useEffect збереже профіль і виконає safe redirect.
    const appUrl = webAuthOrigin();
    const next = safePostAuthPath(params.get("redirectTo"), "/onboarding-preview");
    const callbackQuery = `next=${encodeURIComponent(next)}`;
    const emailRedirectTo = Capacitor.isNativePlatform()
      ? nativeAuthRedirect("/auth/callback", callbackQuery)
      : `${appUrl}/auth/callback?${callbackQuery}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(translate(`errors.${mapAuthError(error)}`));
      return;
    }

    // Якщо в проекті Supabase увімкнене "Email confirmations",
    // то сесії ще нема → просимо перевірити пошту.
    if (!data.session) {
      setInfoMsg(translate("register.confirmationEmail"));
    } else {
      // Якщо підтвердження не вимагається та сесія вже є
      await routeAfterAuth();
    }
  };

  return (
    <main className={`auth-care-page ${MobileUI.screen} flex items-center justify-center px-3 py-3 sm:px-4 sm:py-6`}>
      <div className={`auth-care-card ${MobileUI.card} w-full max-w-[560px] p-4 sm:p-6`}>
        <p className="auth-care-eyebrow">{translate("brand.eyebrow")}</p>
        <h1 className="mb-1 text-[1.75rem] font-black leading-tight text-slate-900 sm:text-[2rem]">{translate("register.title")}</h1>
        <p className="mb-3 text-sm leading-5 text-slate-500">
          {translate("register.subtitle")}
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-[0.95rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 rounded-[0.95rem] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="auth-care-form space-y-2.5" aria-label={translate("accessibility.registerForm")}>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="auth-register-first-name">{translate("register.firstName")} *</label>
            <input
              id="auth-register-first-name"
              type="text"
              placeholder={translate("register.firstNamePlaceholder")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={MobileUI.input}
              autoComplete="given-name"
              required
            />
          </div>
            <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="auth-register-last-name">{translate("register.lastName")} *</label>
            <input
              id="auth-register-last-name"
              type="text"
              placeholder={translate("register.lastNamePlaceholder")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={MobileUI.input}
              autoComplete="family-name"
              required
            />
          </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="auth-register-email">{translate("common.email")} *</label>
            <input
              id="auth-register-email"
              type="email"
              autoComplete="email"
              placeholder={translate("common.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={MobileUI.input}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="auth-register-password">{translate("common.password")} *</label>
            <div className="relative">
              <input
                id="auth-register-password"
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                placeholder={translate("register.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${MobileUI.input} pr-11`}
                required
                minLength={8}
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

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="auth-register-confirm">{translate("common.confirmPassword")} *</label>
            <input
              id="auth-register-confirm"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder={translate("register.confirmPlaceholder")}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className={MobileUI.input}
              required
              minLength={8}
            />
          </div>

          <AuthLegalLinks consent />

          <button
            type="submit"
            disabled={loading}
            className={`${MobileUI.button} auth-care-submit w-full text-white disabled:opacity-60`}
          >
            {loading ? translate("register.submitting") : translate("register.submit")}
          </button>
        </form>

        <div className="mt-2.5 text-sm text-gray-600">
          {translate("register.haveAccount")} {" "}
          <a href="/auth/login" className="text-sky-600 hover:underline">
            {translate("register.login")}
          </a>
        </div>

      </div>
    </main>
  );
}
