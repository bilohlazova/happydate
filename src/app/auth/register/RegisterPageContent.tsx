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

  const [fullName, setFullName] = useState("");
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
    const canonicalName = fullName.trim();
    await supabase.from("profiles").upsert(
      canonicalName ? { id: user.id, full_name: canonicalName } : { id: user.id },
      { onConflict: "id", ignoreDuplicates: !canonicalName }
    );

    const redirectTo = safePostAuthPath(params.get("redirectTo"), "/profile");
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
    const next = safePostAuthPath(params.get("redirectTo"), "/profile");
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
    <main className={`auth-care-page ${MobileUI.screen} flex items-center justify-center px-4 py-6`}>
      <div className={`auth-care-card ${MobileUI.card} w-full max-w-[430px] p-5`}>
        <div className="auth-care-brand" aria-hidden="true"><span>♥</span> HappyDate</div>
        <p className="auth-care-eyebrow">{translate("brand.eyebrow")}</p>
        <h1 className="mb-1 text-[2rem] font-black leading-tight text-sky-600">{translate("register.title")}</h1>
        <p className="mb-5 text-sm font-semibold leading-5 text-gray-500">
          {translate("register.subtitle")}
        </p>

        <div className="auth-care-promise"><span aria-hidden="true">🔒</span>{translate("register.promise")}</div>

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

        <form onSubmit={handleRegister} className="auth-care-form space-y-4" aria-label={translate("accessibility.registerForm")}>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700" htmlFor="auth-register-name">{translate("register.nameOptional")}</label>
            <input
              id="auth-register-name"
              type="text"
              placeholder={translate("register.namePlaceholder")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={MobileUI.input}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700" htmlFor="auth-register-email">{translate("common.email")}</label>
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
            <label className="mb-1.5 block text-sm font-bold text-gray-700" htmlFor="auth-register-password">{translate("common.password")}</label>
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
            <label className="mb-1.5 block text-sm font-bold text-gray-700" htmlFor="auth-register-confirm">{translate("common.confirmPassword")}</label>
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

          <button
            type="submit"
            disabled={loading}
            className={`${MobileUI.button} auth-care-submit w-full text-white disabled:opacity-60`}
          >
            {loading ? translate("register.submitting") : translate("register.submit")}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          {translate("register.haveAccount")} {" "}
          <a href="/auth/login" className="text-sky-600 hover:underline">
            {translate("register.login")}
          </a>
        </div>

        <AuthLegalLinks />
      </div>
    </main>
  );
}
