"use client";

import Image from "next/image";
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
  const [points, setPoints] = useState<number>(0);
  const [surveyCompleted, setSurveyCompleted] = useState<boolean>(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  // ================= LOAD USER =================
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

      // PROFILE
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          full_name: "",
          avatar_url: null,
        });
      } else {
        setFullName(profile.full_name ?? "");
        setAvatarPath(profile.avatar_url ?? null);
      }

      // POINTS
      const { data: bal } = await supabase
        .from("points_balance")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      setPoints(bal?.balance ?? 0);

      // SURVEY
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

  // ================= EVENTS =================
  const refreshEvents = async (uid: string) => {
    const { data } = await supabase
      .from("events")
      .select("id,title,date,category")
      .eq("user_id", uid)
      .order("date", { ascending: true })
      .limit(5);

    setEvents(data ?? []);
  };

  // ================= SAVE PROFILE =================
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        avatar_url: avatarPath,
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Zapisano ✅");
    }

    refresh();
  };

  // ================= AVATAR =================
  const onAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!userId) return;

    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setAvatarPath(filePath);
    setMessage("Avatar przesłany ✅ Kliknij „Zapisz”.");
  };

  // ================= ADD EVENT =================
  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newTitle || !newDate) return;

    const { error } = await supabase.from("events").insert({
      user_id: userId,
      title: newTitle,
      date: newDate,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewTitle("");
    setNewDate("");
    await refreshEvents(userId);
  };

  // ================= UI =================
  return (
    <main className="flex min-h-screen justify-center bg-gray-50 p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6 space-y-6">

        {/* USER CARD */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="avatar"
                width={80}
                height={80}
                className="rounded-full border object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border flex items-center justify-center text-xs text-gray-500">
                brak
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-sky-500 text-white text-xs px-2 py-1 rounded-md cursor-pointer">
              zmień
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <p className="text-lg font-semibold text-sky-600">
              {fullName || "Twoje imię"}
            </p>
            {email && <p className="text-sm text-gray-500">{email}</p>}
            {createdAt && (
              <p className="text-xs text-gray-400">
                Konto od {new Date(createdAt).toLocaleDateString("pl-PL")}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="bg-sky-50 text-sky-700 px-2 py-1 rounded-md border">
                ⭐ {points} pkt
              </span>
              {surveyCompleted ? (
                <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md border">
                  ✅ ankieta
                </span>
              ) : (
                <a
                  href="/survey"
                  className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md border"
                >
                  +100 pkt
                </a>
              )}
            </div>
          </div>
        </div>

        {/* EDIT PROFILE */}
        <form onSubmit={save} className="space-y-4">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border rounded-md p-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-sky-500 text-white py-2 rounded-md"
          >
            {saving ? "Zapisywanie…" : "Zapisz"}
          </button>
        </form>

        {message && (
          <div className="p-2 text-sm rounded-md bg-gray-100">
            {message}
          </div>
        )}

        {/* ADD EVENT */}
        <div>
          <h2 className="text-lg font-semibold text-sky-600 mb-2">
            Dodaj wydarzenie
          </h2>

          <form onSubmit={addEvent} className="space-y-2">
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
              className="w-full bg-sky-500 text-white py-2 rounded-md"
            >
              Dodaj
            </button>
          </form>
        </div>

        {/* EVENTS */}
        <div>
          <h2 className="text-lg font-semibold text-sky-600 mb-2">
            Moje wydarzenia
          </h2>

          {events.length === 0 ? (
            <p className="text-sm text-gray-500">Brak wydarzeń</p>
          ) : (
            <ul className="space-y-2">
              {events.map((ev) => (
                <li key={ev.id} className="border rounded-md p-2">
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(ev.date).toLocaleDateString("pl-PL")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </main>
  );
}