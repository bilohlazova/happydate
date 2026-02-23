"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

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
      setErrorMsg("Podaj poprawny adres e-mail.");
      return false;
    }
    if (password.length < 6) {
      setErrorMsg("Hasło musi mieć co najmniej 6 znaków.");
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
      // дружні повідомлення
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setErrorMsg("Nieprawidłowy e-mail lub hasło.");
      } else if (error.message.toLowerCase().includes("rate limit")) {
        setErrorMsg("Zbyt wiele prób. Spróbuj ponownie za chwilę.");
      } else {
        setErrorMsg(error.message);
      }
      return;
    }

    setInfoMsg("Zalogowano pomyślnie ✅");
    // редірект виконає useEffect (onAuthStateChange), але зробимо і тут
    await routeAfterAuth();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-1 text-sky-600">Zaloguj się</h1>
        <p className="text-sm text-gray-500 mb-6">Witaj ponownie! Wpisz e-mail i hasło.</p>

        {errorMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-2 rounded-md hover:bg-sky-700 transition disabled:opacity-60"
          >
            {loading ? "Logowanie…" : "Zaloguj"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <a href="/auth/reset" className="text-sky-600 hover:underline">
            Zapomniałeś hasła?
          </a>
          <a href="/auth/register" className="text-sky-600 hover:underline">
            Nie masz konta? Zarejestruj się
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
