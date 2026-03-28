"use client";

import Image from "next/image";
import Link from "next/link";
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

  const [userId,    setUserId]    = useState<string | null>(null);
  const [email,     setEmail]     = useState<string | null>(null);
  const [fullName,  setFullName]  = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const { url: avatarUrl, refresh } = useAvatar(userId);

  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [events,          setEvents]          = useState<EventRow[]>([]);
  const [points,          setPoints]          = useState<number>(0);
  const [surveyCompleted, setSurveyCompleted] = useState<boolean>(false);
  const [hasCare,         setHasCare]         = useState<boolean>(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDate,  setNewDate]  = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }

      setUserId(user.id);
      setEmail(user.email ?? null);
      setCreatedAt(user.created_at ?? null);

      const { data: profile } = await supabase
        .from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({ id: user.id, full_name: "", avatar_url: null });
      } else {
        setFullName(profile.full_name ?? "");
        setAvatarPath(profile.avatar_url ?? null);
      }

      const { data: bal } = await supabase
        .from("points_balance").select("balance").eq("user_id", user.id).maybeSingle();
      setPoints(bal?.balance ?? 0);

      const { data: survey } = await supabase
        .from("user_survey").select("is_completed").eq("user_id", user.id).maybeSingle();
      setSurveyCompleted(Boolean(survey?.is_completed));

      // Перевіряємо чи є підписка Care
      const { data: sub } = await supabase
        .from("subscriptions").select("status").eq("user_id", user.id).eq("status", "active").maybeSingle();
      setHasCare(!!sub);

      await refreshEvents(user.id);
    };
    load();
  }, [router]);

  const refreshEvents = async (uid: string) => {
    const { data } = await supabase
      .from("events").select("id,title,date,category")
      .eq("user_id", uid).order("date", { ascending: true }).limit(5);
    setEvents(data ?? []);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true); setMessage(null);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, avatar_url: avatarPath }).eq("id", userId);
    setSaving(false);
    setMessage(error ? error.message : "Zapisano ✅");
    refresh();
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const file = e.target.files?.[0]; if (!file) return;
    const ext = file.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true, contentType: file.type });
    if (error) { setMessage(error.message); return; }
    setAvatarPath(filePath);
    setMessage("Avatar przesłany ✅ Kliknij Zapisz.");
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newTitle || !newDate) return;
    const { error } = await supabase.from("events").insert({ user_id: userId, title: newTitle, date: newDate });
    if (error) { setMessage(error.message); return; }
    setNewTitle(""); setNewDate("");
    await refreshEvents(userId);
  };

  const avatarFallback = fullName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .pr-root { font-family:'Plus Jakarta Sans',sans-serif; min-height:100svh; background:#f8f7ff; padding-bottom:100px; }
        .pr-section { margin:0 16px 14px; background:#fff; border-radius:20px; border:1.5px solid #ede9f8; padding:16px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .pr-label { font-size:11px; font-weight:700; color:#b0a8cc; text-transform:uppercase; letter-spacing:.06em; margin-bottom:10px; display:block; }
        .pr-input { width:100%; border:1.5px solid #e8e3f5; border-radius:12px; padding:10px 14px; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; color:#1a1040; background:#f8f7ff; outline:none; box-sizing:border-box; transition:border-color .15s; }
        .pr-input:focus { border-color:#7c3aed; background:#fff; }
        .pr-btn { width:100%; border:none; background:linear-gradient(135deg,#7c3aed,#ec4899); border-radius:12px; padding:11px; font-size:14px; font-weight:700; color:#fff; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:opacity .15s; }
        .pr-btn:disabled { opacity:.6; }
        .pr-btn-outline { width:100%; border:1.5px solid #e8e3f5; background:#f8f7ff; border-radius:12px; padding:10px; font-size:14px; font-weight:600; color:#7c6f9f; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .pr-event-item { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #f5f3ff; }
        .pr-event-item:last-child { border-bottom:none; }
      `}</style>

      <div className="pr-root">

        {/* ── Шапка профілю ── */}
        <div style={{ padding: "20px 16px 0", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Аватар */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {avatarUrl ? (
                <Image src={avatarUrl} alt="avatar" width={64} height={64}
                  style={{ borderRadius: 20, objectFit: "cover", border: "2px solid #ede9f8" }} unoptimized />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#ede9fe,#fce7f3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#7c3aed" }}>
                  {avatarFallback}
                </div>
              )}
              <label style={{ position: "absolute", bottom: -4, right: -4, background: "#7c3aed", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8, cursor: "pointer" }}>
                zmień
                <input type="file" accept="image/*" onChange={onAvatarChange} style={{ display: "none" }} />
              </label>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#1a1040", marginBottom: 2 }}>{fullName || "Twoje imię"}</div>
              {email && <div style={{ fontSize: 12, color: "#7c6f9f", marginBottom: 4 }}>{email}</div>}
              {createdAt && <div style={{ fontSize: 11, color: "#b0a8cc" }}>Konto od {new Date(createdAt).toLocaleDateString("pl-PL")}</div>}
            </div>
          </div>

          {/* Бейджі */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#f1eeff", color: "#7c3aed" }}>⭐ {points} pkt</span>
            {hasCare && <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#fce7f3", color: "#be185d" }}>💛 Care aktywne</span>}
            {surveyCompleted
              ? <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#dcfce7", color: "#15803d" }}>✅ ankieta</span>
              : <a href="/survey" style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#fef3c7", color: "#92400e", textDecoration: "none" }}>+100 pkt za ankietę</a>
            }
          </div>
        </div>

        {/* ── CARE BANNER — tylko jeśli nie ma subskrypcji ── */}
        {!hasCare && (
          <div style={{ margin: "0 16px 14px", background: "linear-gradient(135deg,#7c3aed,#ec4899)", borderRadius: 20, padding: "16px", color: "#fff" }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>💛 Wypróbuj HappyDate Care</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 12, lineHeight: 1.4 }}>
              Pamiętamy za Ciebie — przypomnienia, AI podpowiedzi i więcej. Od 29 zł/mies.
            </div>
            <Link href="/care" style={{ display: "inline-block", background: "#fff", color: "#7c3aed", borderRadius: 12, padding: "8px 18px", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
              Zobacz Care →
            </Link>
          </div>
        )}

        {/* ── Edycja profilu ── */}
        <div className="pr-section">
          <span className="pr-label">Edytuj profil</span>
          <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="pr-input" type="text" placeholder="Imię i nazwisko" value={fullName} onChange={e => setFullName(e.target.value)} />
            <button className="pr-btn" type="submit" disabled={saving}>{saving ? "Zapisywanie…" : "Zapisz zmiany"}</button>
          </form>
          {message && <div style={{ marginTop: 8, fontSize: 13, color: "#7c6f9f", background: "#f8f7ff", borderRadius: 10, padding: "8px 12px" }}>{message}</div>}
        </div>

        {/* ── Dodaj wydarzenie ── */}
        <div className="pr-section">
          <span className="pr-label">Dodaj wydarzenie</span>
          <form onSubmit={addEvent} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="pr-input" type="text" placeholder="Tytuł" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <input className="pr-input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <button className="pr-btn" type="submit">Dodaj wydarzenie</button>
          </form>
        </div>

        {/* ── Najbliższe wydarzenia ── */}
        {events.length > 0 && (
          <div className="pr-section">
            <span className="pr-label">Najbliższe wydarzenia</span>
            {events.map(ev => (
              <div key={ev.id} className="pr-event-item">
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f1eeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📅</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: "#b0a8cc" }}>{new Date(ev.date).toLocaleDateString("pl-PL")}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Wyloguj ── */}
        <div style={{ padding: "0 16px" }}>
          <button
            className="pr-btn-outline"
            onClick={async () => { await supabase.auth.signOut(); router.replace("/"); }}
          >
            🚪 Wyloguj się
          </button>
        </div>

      </div>
    </>
  );
}