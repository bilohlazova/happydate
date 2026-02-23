"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAvatar } from "@/hooks/useAvatar";

type EventRow = {
  id: string;
  title: string;
  date: string;
  category: string | null;
};

type UnknownRec = Record<string, unknown>;

function asString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (v === null || v === undefined) return null;
  return String(v);
}
function pickString(rec: UnknownRec, keys: string[]): string | null {
  for (const k of keys) {
    const val = asString(rec[k]);
    if (val) return val;
  }
  return null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const { url: avatarUrl, refresh } = useAvatar(userId);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [events, setEvents] = useState<EventRow[]>([]);

  // 🔵 нове: поінти та статус анкети
  const [points, setPoints] = useState<number>(0);
  const [surveyCompleted, setSurveyCompleted] = useState<boolean>(false);

  // поля форми додавання події
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(""); // YYYY-MM-DD

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? null);
      setCreatedAt(user.created_at ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      setFullName(profile?.full_name ?? "");
      setAvatarPath(profile?.avatar_url ?? null);

      // 🔵 баланс поінтів (view points_balance)
      const { data: bal } = await supabase
        .from("points_balance")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      setPoints((bal?.balance as number) ?? 0);

      // 🔵 статус анкети
      const { data: survey } = await supabase
        .from("user_survey")
        .select("is_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      setSurveyCompleted(Boolean(survey?.is_completed));

      await refreshEvents(user.id);
    };
    load();
  }, [router]);

  const refreshEvents = async (uid: string) => {
    const orFilter = `uid.eq.${uid},user_id.eq.${uid},owner_id.eq.${uid}`;
    const { data } = await supabase.from("events").select("*").or(orFilter).limit(100);
    const raw = (data as UnknownRec[]) ?? [];

    const normalized: EventRow[] = raw
      .map((rec) => {
        const date = pickString(rec, [
          "date",
          "start",
          "start_date",
          "starts_at",
          "when",
          "datetime",
        ]);
        if (!date) return null;

        const id = asString(rec["id"]) ?? crypto.randomUUID();
        const title = pickString(rec, ["title", "name"]) ?? "Bez tytułu";
        const category = pickString(rec, ["category", "type"]);

        return { id, title, date, category: category ?? null };
      })
      .filter((r): r is EventRow => r !== null);

    normalized.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setEvents(normalized.slice(0, 5));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: fullName, avatar_url: avatarPath }, { onConflict: "id" });

    setSaving(false);
    setMessage(error ? error.message : "Zapisano ✅");
    refresh();
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const ext = file.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { cacheControl: "3600", upsert: true, contentType: file.type });

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    setAvatarPath(filePath);
    setMessage("Avatar przesłany ✅ (kliknij „Zapisz”, aby utrwalić w profilu)");
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newTitle || !newDate) return;

    const { error } = await supabase.from("events").insert([
      { user_id: userId, title: newTitle, date: newDate, notes: null },
    ]);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Nowe wydarzenie dodane ✅");
    setNewTitle("");
    setNewDate("");
    await refreshEvents(userId);
  };

  return (
    <main className="flex min-h-screen justify-center bg-gray-50 p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6 space-y-6">
        {/* karta użytkownika */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-full border object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full border flex items-center justify-center text-xs text-gray-500">
                brak
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-sky-500 text-white text-xs px-2 py-1 rounded-md opacity-80 group-hover:opacity-100 cursor-pointer">
              zmień
              <input type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
            </label>
          </div>

          <div className="flex-1">
            <p className="text-lg font-semibold text-sky-600">{fullName || "Twoje imię"}</p>
            {email && <p className="text-sm text-gray-500">{email}</p>}
            {createdAt && (
              <p className="text-xs text-gray-400">Konto od {new Date(createdAt).toLocaleDateString("pl-PL")}</p>
            )}

            {/* 🔵 Punkty + CTA анкети */}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 text-xs px-3 py-1 border border-sky-200">
                ⭐️ Punkty: <span className="ml-1 font-semibold">{points}</span>
              </span>

              {!surveyCompleted && (
                <a
                  href="/survey"
                  className="text-xs px-3 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition"
                  title="Wypełnij krótką ankietę i odbierz +100 pkt"
                >
                  Wypełnij ankietę (+100 pkt)
                </a>
              )}

              {surveyCompleted && (
                <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-md">
                  ✅ ankieta wypełniona
                </span>
              )}
            </div>
          </div>
        </div>

        {/* форма edycji */}
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Imię i nazwisko</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Twoje imię"
              className="w-full border rounded-md p-2 mt-1"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-sky-500 text-white py-2 rounded-md hover:bg-sky-600 transition disabled:opacity-60"
          >
            {saving ? "Zapisywanie…" : "Zapisz"}
          </button>
        </form>

        {message && (
          <div
            className={`p-2 text-sm rounded-md ${
              message.includes("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* ➕ Dodaj nowe wydarzenie */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-sky-600">Dodaj wydarzenie</h2>
          <form onSubmit={addEvent} className="space-y-3">
            <input
              type="text"
              placeholder="Tytuł"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full border rounded-md p-2"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full border rounded-md p-2"
            />
            <button
              type="submit"
              className="w-full bg-sky-500 text-white py-2 rounded-md hover:bg-sky-600 transition"
            >
              Dodaj
            </button>
          </form>
        </div>

        {/* 🔔 Moje wydarzenia */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-sky-600">Moje wydarzenia</h2>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">Brak wydarzeń</p>
          ) : (
            <ul className="space-y-2">
              {events.map((ev) => (
                <li key={ev.id} className="flex justify-between items-center border rounded-md p-2 hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(ev.date).toLocaleDateString("pl-PL")} {ev.category ? `• ${ev.category}` : ""}
                    </p>
                  </div>
                  <a href={`/dashboard?highlight=${ev.id}`} className="text-sky-600 text-sm underline hover:no-underline">
                    szczegóły
                  </a>
                </li>
              ))}
            </ul>
          )}
          {events.length > 0 && (
            <div className="mt-3 text-right">
              <a href="/dashboard" className="text-sky-600 text-sm underline hover:no-underline">
                Zobacz wszystkie →
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

