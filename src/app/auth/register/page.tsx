"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();

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

    // створюємо профіль (id, full_name) якщо ще нема
    await supabase.from("profiles").upsert(
      { id: user.id, full_name: fullName || user.email?.split("@")[0] || "" },
      { onConflict: "id" }
    );

    // якщо анкета вже заповнена → поважаємо redirectTo, інакше → /survey
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
      setErrorMsg("Podaj poprawny adres e-mail.");
      return false;
    }
    if (password.length < 6) {
      setErrorMsg("Hasło musi mieć co najmniej 6 znaków.");
      return false;
    }
    if (password !== password2) {
      setErrorMsg("Hasła nie są takie same.");
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
    // який встановить сесію; потім useEffect перенаправить на /survey
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const next = params.get("redirectTo") || "/survey";
    const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo,
      },
    });

    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("user already registered")) {
        setErrorMsg("Konto z tym adresem już istnieje. Zaloguj się.");
      } else if (msg.includes("rate limit")) {
        setErrorMsg("Zbyt wiele prób. Spróbuj ponownie za chwilę.");
      } else {
        setErrorMsg(error.message);
      }
      return;
    }

    // Якщо в проекті Supabase увімкнене "Email confirmations",
    // то сесії ще нема → просимо перевірити пошту.
    if (!data.session) {
      setInfoMsg(
        "Sprawdź swoją skrzynkę e-mail, aby potwierdzić rejestrację. Po potwierdzeniu wrócisz do aplikacji."
      );
    } else {
      // Якщо підтвердження не вимагається та сесія вже є
      await routeAfterAuth();
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-1 text-sky-600">Załóż konto</h1>
        <p className="text-sm text-gray-500 mb-6">
          Utwórz konto, a następnie wypełnij krótką ankietę i odbierz <b>+100 punktów</b>.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imię i nazwisko (opcjonalnie)</label>
            <input
              type="text"
              placeholder="Maria Kowalska"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="nazwa@domena.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                placeholder="min. 6 znaków"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-md p-2 pr-11"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                aria-label={showPwd ? "Ukryj hasło" : "Pokaż hasło"}
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Powtórz hasło</label>
            <input
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="powtórz hasło"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full border rounded-md p-2"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-2 rounded-md hover:bg-sky-700 transition disabled:opacity-60"
          >
            {loading ? "Rejestracja…" : "Zarejestruj"}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          Masz już konto?{" "}
          <a href="/auth/login" className="text-sky-600 hover:underline">
            Zaloguj się
          </a>
        </div>
      </div>
    </main>
  );
}
