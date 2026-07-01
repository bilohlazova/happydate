"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/brain/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();

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
        setErr("Brak aktywnej sesji resetu. Kliknij ponownie link z e-maila.");
      }
    })();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (password.length < 6) {
      setErr("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    if (password !== password2) {
      setErr("Hasła nie są identyczne.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErr(error.message);
    } else {
      setMsg("✅ Hasło zostało pomyślnie zmienione. Zaloguj się ponownie.");
      // przekierowanie do logowania po 2 sekundach
      setTimeout(() => router.replace("/auth/login"), 2000);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-1 text-sky-600">Ustaw nowe hasło</h1>
        <p className="text-sm text-gray-500 mb-6">
          Wprowadź nowe hasło do swojego konta.
        </p>

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

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nowe hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded-md p-2"
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Powtórz hasło
            </label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              className="w-full border rounded-md p-2"
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-2 rounded-md hover:bg-sky-700 transition disabled:opacity-60"
          >
            {loading ? "Zapisywanie…" : "Zmień hasło"}
          </button>
        </form>
      </div>
    </main>
  );
}
