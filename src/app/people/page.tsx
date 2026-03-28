"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  name: string;
  birthday: string | null;
  relation: string | null;
  created_at: string;
};

const RELATIONS = [
  { value: "family",  label: "Rodzina",    emoji: "👨‍👩‍👧" },
  { value: "friend",  label: "Przyjaciel", emoji: "🤝" },
  { value: "partner", label: "Partner",    emoji: "💑" },
  { value: "work",    label: "Praca",      emoji: "💼" },
  { value: "other",   label: "Inne",       emoji: "✨" },
];

function getRelation(val: string | null) {
  return RELATIONS.find((r) => r.value === val) ?? { emoji: "👤", label: "Osoba" };
}

function getDaysUntilBirthday(birthday: string | null): number | null {
  if (!birthday) return null;
  const today = new Date();
  const bday  = new Date(birthday);
  const next  = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function BirthdayBadge({ birthday }: { birthday: string | null }) {
  const days = getDaysUntilBirthday(birthday);
  if (days === null) return null;
  let bg = "#f1f5f9", color = "#64748b", text = `za ${days} dni`;
  if (days === 0)      { bg = "#fce7f3"; color = "#be185d"; text = "Dziś! 🎉"; }
  else if (days <= 7)  { bg = "#fef3c7"; color = "#92400e"; text = `za ${days} dni 🎂`; }
  else if (days <= 30) { bg = "#e0f2fe"; color = "#0369a1"; text = `za ${days} dni`; }
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: bg, color }}>
      {text}
    </span>
  );
}

export default function PeoplePage() {
  const router = useRouter();

  const [people,      setPeople]      = useState<Person[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState("");
  const [filterRel,   setFilterRel]   = useState("all");
  const [newName,     setNewName]     = useState("");
  const [newBirthday, setNewBirthday] = useState("");
  const [newRelation, setNewRelation] = useState("friend");
  const [modalBottom, setModalBottom] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Піднімаємо модалку над клавіатурою (iOS) ────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onViewport = () => {
      // скільки пікселів займає клавіатура
      const kbHeight = window.innerHeight - vv.height;
      setModalBottom(Math.max(0, kbHeight));
    };
    vv.addEventListener("resize", onViewport);
    vv.addEventListener("scroll", onViewport);
    return () => {
      vv.removeEventListener("resize", onViewport);
      vv.removeEventListener("scroll", onViewport);
    };
  }, []);

  useEffect(() => {
    if (!showModal) setModalBottom(0);
  }, [showModal]);

  // ── Дані ────────────────────────────────────────────────
  async function loadPeople() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data, error } = await supabase
      .from("people").select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (!error && data) setPeople(data);
    setLoading(false);
  }

  useEffect(() => { loadPeople(); }, []);

  async function createPerson() {
    if (!newName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("people").insert({
      user_id:  user.id,
      name:     newName.trim(),
      birthday: newBirthday || null,
      relation: newRelation,
    });
    setSaving(false);
    if (!error) {
      setShowModal(false);
      setNewName(""); setNewBirthday(""); setNewRelation("friend");
      loadPeople();
    }
  }

  const filtered = people
    .filter(p => filterRel === "all" || p.relation === filterRel)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const upcomingBirthdays = people
    .filter(p => { const d = getDaysUntilBirthday(p.birthday); return d !== null && d <= 30; })
    .sort((a, b) => (getDaysUntilBirthday(a.birthday) ?? 999) - (getDaysUntilBirthday(b.birthday) ?? 999));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .pp-root { font-family:'Plus Jakarta Sans',sans-serif; min-height:100svh; background:#f8f7ff; padding-bottom:100px; }

        .pp-header { padding:20px 16px 0; }
        .pp-header-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:4px; }
        .pp-title { font-size:26px; font-weight:800; color:#1a1040; letter-spacing:-0.5px; }
        .pp-count-pill { background:linear-gradient(135deg,#a78bfa,#ec4899); color:#fff; font-size:13px; font-weight:700; padding:4px 14px; border-radius:20px; box-shadow:0 2px 8px rgba(167,139,250,.35); }
        .pp-subtitle { font-size:13px; color:#7c6f9f; margin-bottom:16px; }

        .pp-add-btn { display:flex; align-items:center; gap:6px; background:linear-gradient(135deg,#7c3aed,#ec4899); color:#fff; border:none; cursor:pointer; padding:10px 18px; border-radius:14px; font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; font-weight:700; box-shadow:0 4px 14px rgba(124,58,237,.35); transition:transform .15s; white-space:nowrap; flex-shrink:0; }
        .pp-add-btn:active { transform:scale(.96); }

        .pp-search { margin:0 16px 12px; display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #e8e3f5; border-radius:14px; padding:0 14px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .pp-search input { flex:1; border:none; background:transparent; padding:11px 0; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; color:#1a1040; outline:none; }
        .pp-search input::placeholder { color:#b0a8cc; }

        .pp-filters { display:flex; gap:8px; padding:0 16px 14px; overflow-x:auto; scrollbar-width:none; }
        .pp-filters::-webkit-scrollbar { display:none; }
        .pp-filter-chip { flex-shrink:0; border:1.5px solid #e8e3f5; background:#fff; border-radius:20px; padding:5px 14px; font-size:12px; font-weight:600; color:#7c6f9f; cursor:pointer; transition:all .15s; font-family:'Plus Jakarta Sans',sans-serif; white-space:nowrap; }
        .pp-filter-chip.active { background:#7c3aed; border-color:#7c3aed; color:#fff; box-shadow:0 2px 8px rgba(124,58,237,.3); }

        .pp-upcoming { margin:0 16px 16px; }
        .pp-section-title { font-size:12px; font-weight:700; color:#b0a8cc; text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
        .pp-upcoming-scroll { display:flex; gap:10px; overflow-x:auto; scrollbar-width:none; padding-bottom:4px; }
        .pp-upcoming-scroll::-webkit-scrollbar { display:none; }
        .pp-upcoming-card { flex-shrink:0; background:#fff; border-radius:14px; padding:10px 14px; border:1.5px solid #fde8f5; cursor:pointer; transition:transform .15s; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .pp-upcoming-card:active { transform:scale(.96); }
        .pp-upcoming-name { font-size:13px; font-weight:700; color:#1a1040; margin-bottom:3px; }
        .pp-upcoming-days { font-size:11px; color:#ec4899; font-weight:600; }

        .pp-list { padding:0 16px; display:flex; flex-direction:column; gap:10px; }

        .pp-card { background:#fff; border-radius:18px; border:1.5px solid #ede9f8; padding:14px 16px; display:flex; align-items:center; gap:14px; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.04); transition:transform .15s,border-color .15s; -webkit-tap-highlight-color:transparent; }
        .pp-card:active { transform:scale(.985); border-color:#c4b5f8; }

        .pp-avatar { width:48px; height:48px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; background:linear-gradient(135deg,#ede9fe,#fce7f3); }
        .pp-card-body { flex:1; min-width:0; }
        .pp-card-name { font-size:15px; font-weight:700; color:#1a1040; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pp-card-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .pp-rel-tag { font-size:11px; color:#7c6f9f; font-weight:500; }
        .pp-arrow { color:#c4b5f8; font-size:20px; flex-shrink:0; }

        .pp-empty { text-align:center; padding:48px 24px; }
        .pp-empty-icon { font-size:52px; margin-bottom:12px; }
        .pp-empty-title { font-size:16px; font-weight:700; color:#1a1040; margin-bottom:6px; }
        .pp-empty-sub { font-size:13px; color:#7c6f9f; line-height:1.5; }

        /* ── Modal ── */
        .pp-overlay {
          position:fixed; inset:0;
          background:rgba(10,5,30,.55);
          display:flex; align-items:flex-end; justify-content:center;
          z-index:200;
          backdrop-filter:blur(4px);
          -webkit-backdrop-filter:blur(4px);
          animation:ppFadeIn .2s ease;
        }
        @keyframes ppFadeIn { from{opacity:0} to{opacity:1} }

        .pp-modal {
          background:#fff;
          border-radius:28px 28px 0 0;
          padding:24px 20px 32px;
          width:100%; max-width:480px;
          /* Скрол всередині модалки — не сторінка */
          max-height:85svh;
          overflow-y:auto;
          -webkit-overflow-scrolling:touch;
          /* Плавний підйом над клавіатурою */
          transition:transform .22s cubic-bezier(.32,.72,0,1);
          will-change:transform;
          animation:ppSlideUp .28s cubic-bezier(.34,1.2,.64,1);
        }
        @keyframes ppSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }

        .pp-modal-handle { width:36px; height:4px; background:#e8e3f5; border-radius:2px; margin:0 auto 20px; }
        .pp-modal-title { font-size:20px; font-weight:800; color:#1a1040; margin-bottom:20px; }

        .pp-field { margin-bottom:14px; }
        .pp-label { font-size:12px; font-weight:700; color:#7c6f9f; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; display:block; }
        .pp-input { width:100%; border:1.5px solid #e8e3f5; border-radius:14px; padding:12px 14px; font-size:15px; font-family:'Plus Jakarta Sans',sans-serif; color:#1a1040; background:#f8f7ff; outline:none; transition:border-color .15s; box-sizing:border-box; }
        .pp-input:focus { border-color:#7c3aed; background:#fff; }

        .pp-rel-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
        .pp-rel-btn { border:1.5px solid #e8e3f5; border-radius:12px; background:#f8f7ff; padding:8px 4px; text-align:center; cursor:pointer; transition:all .15s; font-family:'Plus Jakarta Sans',sans-serif; }
        .pp-rel-btn.active { border-color:#7c3aed; background:#ede9fe; }
        .pp-rel-btn-emoji { font-size:20px; display:block; margin-bottom:2px; }
        .pp-rel-btn-label { font-size:10px; font-weight:600; color:#7c6f9f; }
        .pp-rel-btn.active .pp-rel-btn-label { color:#7c3aed; }

        .pp-modal-actions { display:flex; gap:10px; margin-top:20px; }
        .pp-btn-cancel { flex:1; border:1.5px solid #e8e3f5; background:#f8f7ff; border-radius:14px; padding:13px; font-size:15px; font-weight:700; color:#7c6f9f; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .pp-btn-save { flex:2; border:none; background:linear-gradient(135deg,#7c3aed,#ec4899); border-radius:14px; padding:13px; font-size:15px; font-weight:700; color:#fff; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; box-shadow:0 4px 14px rgba(124,58,237,.3); transition:all .15s; }
        .pp-btn-save:disabled { opacity:.6; cursor:not-allowed; }
        .pp-btn-save:active:not(:disabled) { transform:scale(.97); }
      `}</style>

      <div className="pp-root">

        <div className="pp-header">
          <div className="pp-header-top">
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:2 }}>
                <h1 className="pp-title">👥 Osoby</h1>
                <span className="pp-count-pill">{people.length}</span>
              </div>
              <p className="pp-subtitle">Twoi bliscy w jednym miejscu</p>
            </div>
            <button className="pp-add-btn" onClick={() => setShowModal(true)}>
              <span>＋</span> Dodaj
            </button>
          </div>
        </div>

        <div className="pp-search">
          <span style={{ fontSize:16, color:"#b0a8cc" }}>🔍</span>
          <input
            placeholder="Szukaj osoby..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="pp-filters">
          <button className={`pp-filter-chip ${filterRel==="all"?"active":""}`} onClick={() => setFilterRel("all")}>Wszyscy</button>
          {RELATIONS.map(r => (
            <button key={r.value} className={`pp-filter-chip ${filterRel===r.value?"active":""}`} onClick={() => setFilterRel(r.value)}>
              {r.emoji} {r.label}
            </button>
          ))}
        </div>

        {upcomingBirthdays.length > 0 && (
          <div className="pp-upcoming">
            <div className="pp-section-title">🎂 Nadchodzące urodziny</div>
            <div className="pp-upcoming-scroll">
              {upcomingBirthdays.map(p => {
                const days = getDaysUntilBirthday(p.birthday)!;
                return (
                  <div key={p.id} className="pp-upcoming-card" onClick={() => router.push(`/person/${p.id}`)}>
                    <div className="pp-upcoming-name">{p.name}</div>
                    <div className="pp-upcoming-days">{days===0?"🎉 Dziś!":`za ${days} dni`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pp-list">
          {loading && <div style={{ textAlign:"center", padding:40, color:"#b0a8cc", fontSize:14 }}>Ładowanie...</div>}
          {!loading && filtered.length === 0 && (
            <div className="pp-empty">
              <div className="pp-empty-icon">👥</div>
              <div className="pp-empty-title">{search?"Nie znaleziono":"Brak osób"}</div>
              <div className="pp-empty-sub">{search?`Brak wyników dla "${search}"`:"Dodaj pierwszą osobę — zapamiętaj co ją uszczęśliwia ✨"}</div>
            </div>
          )}
          {filtered.map(person => {
            const rel = getRelation(person.relation);
            return (
              <div key={person.id} className="pp-card" onClick={() => router.push(`/person/${person.id}`)}>
                <div className="pp-avatar">{rel.emoji}</div>
                <div className="pp-card-body">
                  <div className="pp-card-name">{person.name}</div>
                  <div className="pp-card-meta">
                    <span className="pp-rel-tag">{rel.label}</span>
                    <BirthdayBadge birthday={person.birthday} />
                  </div>
                </div>
                <span className="pp-arrow">›</span>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="pp-overlay" onClick={e => { if (e.target===e.currentTarget) setShowModal(false); }}>
          <div
            ref={modalRef}
            className="pp-modal"
            style={{ transform:`translateY(-${modalBottom}px)` }}
          >
            <div className="pp-modal-handle" />
            <div className="pp-modal-title">Nowa osoba ✨</div>

            <div className="pp-field">
              <label className="pp-label">Imię i nazwisko</label>
              <input className="pp-input" placeholder="np. Anna Kowalska" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>

            <div className="pp-field">
              <label className="pp-label">Data urodzin (opcjonalnie)</label>
              <input className="pp-input" type="date" value={newBirthday} onChange={e => setNewBirthday(e.target.value)} />
            </div>

            <div className="pp-field">
              <label className="pp-label">Relacja</label>
              <div className="pp-rel-grid">
                {RELATIONS.map(r => (
                  <button key={r.value} className={`pp-rel-btn ${newRelation===r.value?"active":""}`} onClick={() => setNewRelation(r.value)}>
                    <span className="pp-rel-btn-emoji">{r.emoji}</span>
                    <span className="pp-rel-btn-label">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pp-modal-actions">
              <button className="pp-btn-cancel" onClick={() => setShowModal(false)}>Anuluj</button>
              <button className="pp-btn-save" onClick={createPerson} disabled={!newName.trim()||saving}>
                {saving?"Zapisywanie...":"Dodaj osobę →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}