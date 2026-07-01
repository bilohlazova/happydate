"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/brain/supabaseClient";

type SpecialDate = {
  id?: string;
  date: string;
  label: string;
  kind: "support" | "celebration";
};

/* Helpers */
function splitTags(s: string): string[] {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}
function joinTags(arr: string[]): string {
  return arr.join(", ");
}
function toYmd(d: string): string | null {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // już OK
  const m = d.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); // np. 26.09.2025
  if (m) {
    const [, dd, mm, yyyy] = m;
    const pad = (n: string) => n.padStart(2, "0");
    return `${yyyy}-${pad(mm)}-${pad(dd)}`;
  }
  const dt = new Date(d);
  if (isNaN(+dt)) return null;
  return dt.toISOString().slice(0, 10);
}

export default function SurveyPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  // Stan formularza
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [dream, setDream] = useState("");
  const [notes, setNotes] = useState("");
  const [dates, setDates] = useState<SpecialDate[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Guard + preload
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        router.replace("/auth/login?redirectTo=/survey");
        return;
      }
      setUid(user.id);

      // Wczytaj ankietę
      const { data: s } = await supabase
        .from("user_survey")
        .select("likes, dislikes, dream, notes, is_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (s) {
        setLikes((s.likes as string[]) ?? []);
        setDislikes((s.dislikes as string[]) ?? []);
        setDream((s.dream as string) ?? "");
        setNotes((s.notes as string) ?? "");
      }

      // Wczytaj szczególne daty
      const { data: ds } = await supabase
        .from("user_special_dates")
        .select("id, date, label, kind")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      setDates(((ds ?? []) as SpecialDate[]) ?? []);
      setLoading(false);
    })();
  }, [router]);

  const likesText = useMemo(() => joinTags(likes), [likes]);
  const dislikesText = useMemo(() => joinTags(dislikes), [dislikes]);

  const addEmptyDate = () =>
    setDates((d) => [...d, { date: "", label: "", kind: "support" }]);

  const updateDate = (idx: number, patch: Partial<SpecialDate>) =>
    setDates((d) => d.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const removeDate = (idx: number) => setDates((d) => d.filter((_, i) => i !== idx));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      // Walidacja i normalizacja dat
      const normalizedDates = dates
        .map((d) => {
          const ymd = toYmd(d.date);
          return ymd
            ? {
                user_id: uid,
                date: ymd,
                label: d.label?.trim() || (d.kind === "support" ? "Trudny dzień" : "Święto"),
                kind: d.kind,
              }
            : null;
        })
        .filter((d): d is { user_id: string; date: string; label: string; kind: "support" | "celebration" } => d !== null);

      // 1) Upsert ankiety
      const { error: sErr } = await supabase
        .from("user_survey")
        .upsert(
          {
            user_id: uid,
            likes,
            dislikes,
            dream,
            notes,
            is_completed: true,
          },
          { onConflict: "user_id" }
        );
      if (sErr) throw new Error(`user_survey: ${sErr.message}`);

      // 2) Nadpisanie listy dat
      const { error: delErr } = await supabase
        .from("user_special_dates")
        .delete()
        .eq("user_id", uid);
      if (delErr) throw new Error(`user_special_dates(delete): ${delErr.message}`);

      if (normalizedDates.length) {
        const { error: insErr } = await supabase
          .from("user_special_dates")
          .insert(normalizedDates);
        if (insErr) throw new Error(`user_special_dates(insert): ${insErr.message}`);
      }

      setMsg("Dziękujemy! Ankieta zapisana ✅ (+100 pkt)");
      setTimeout(() => router.replace("/profile"), 800);
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Wystąpił błąd";
      setErr(text);
      console.error("[survey] submit error:", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Ładowanie…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen justify-center bg-gray-50 p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-6 space-y-6">
        <h1 className="text-2xl font-bold text-sky-600">Krótka ankieta 🎁</h1>
        <p className="text-sm text-gray-600">
          Pomóż nam lepiej dobierać prezenty i wsparcie — za wypełnienie otrzymasz <b>+100 punktów</b>.
        </p>

        <form onSubmit={submit} className="space-y-6">
          {/* Likes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Co chętnie dostał(a)byś w prezencie? (wpisz po przecinku)
            </label>
            <input
              type="text"
              defaultValue={likesText}
              onChange={(e) => setLikes(splitTags(e.target.value))}
              className="w-full border rounded-md p-2"
              placeholder="kwiaty, książki, czekolada…"
            />
          </div>

          {/* Dislikes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Czego nie chcesz otrzymywać? (po przecinku)
            </label>
            <input
              type="text"
              defaultValue={dislikesText}
              onChange={(e) => setDislikes(splitTags(e.target.value))}
              className="w-full border rounded-md p-2"
              placeholder="słodycze, alkohol…"
            />
          </div>

          {/* Dream */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Twoje marzenie</label>
            <textarea
              value={dream}
              onChange={(e) => setDream(e.target.value)}
              className="w-full border rounded-md p-2"
              rows={3}
              placeholder="O czym marzysz? (np. kurs językowy, weekend w górach)"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dodatkowe uwagi (rozmiar, alergie, itp.)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-md p-2"
              rows={3}
              placeholder="Np. rozmiar M, alergia na orzechy…"
            />
          </div>

          {/* Special dates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-sky-600">Szczególne daty</h2>
              <button
                type="button"
                onClick={addEmptyDate}
                className="text-sm px-3 py-1 rounded-md bg-sky-500 text-white hover:bg-sky-600"
              >
                + Dodaj datę
              </button>
            </div>

            {dates.length === 0 && (
              <p className="text-sm text-gray-500">
                Dodaj dni, o których powinniśmy pamiętać — święta i trudne rocznice.
              </p>
            )}

            <div className="space-y-3">
              {dates.map((d, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center border rounded-md p-2"
                >
                  <input
                    type="date"
                    value={d.date}
                    onChange={(e) => updateDate(i, { date: e.target.value })}
                    className="border rounded-md p-2 col-span-1"
                  />
                  <select
                    value={d.kind}
                    onChange={(e) =>
                      updateDate(i, { kind: e.target.value as SpecialDate["kind"] })
                    }
                    className="border rounded-md p-2 col-span-1"
                  >
                    <option value="support">trudny dzień</option>
                    <option value="celebration">święto</option>
                  </select>
                  <input
                    type="text"
                    value={d.label}
                    onChange={(e) => updateDate(i, { label: e.target.value })}
                    className="border rounded-md p-2 col-span-1"
                    placeholder="opis (np. rocznica)"
                  />
                  <button
                    type="button"
                    onClick={() => removeDate(i)}
                    className="text-sm px-3 py-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 col-span-1"
                  >
                    Usuń
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-600 text-white py-2 rounded-md hover:bg-emerald-700 transition disabled:opacity-60"
            >
              {saving ? "Zapisywanie…" : "Zakończ i odbierz +100 pkt"}
            </button>
          </div>

          {msg && (
            <div className="p-2 text-sm rounded-md bg-green-100 text-green-700">{msg}</div>
          )}
          {err && (
            <div className="p-2 text-sm rounded-md bg-red-100 text-red-700">
              {err}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
