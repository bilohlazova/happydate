"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  name: string;
  birthday: string | null;
  relation: string | null;
  created_at: string;
  notes_count?: number;
  last_note_at?: string | null;
};

type ModalMode = "add" | "edit";

const RELATIONS = [
  { value: "family",  label: "Rodzina",    bg: "#e8f0fe", text: "#1a4a9e" },
  { value: "friend",  label: "Przyjaciel", bg: "#e8f5ed", text: "#1a6644" },
  { value: "partner", label: "Partner",    bg: "#fce8ed", text: "#8a1a38" },
  { value: "work",    label: "Praca",      bg: "#fdf6e8", text: "#7a5c1a" },
  { value: "other",   label: "Inne",       bg: "#f0ede8", text: "#5a5550" },
];

const TABS = [
  { value: "all",     label: "Wszyscy"     },
  { value: "family",  label: "Rodzina"     },
  { value: "friend",  label: "Przyjaciele" },
  { value: "partner", label: "Partner"     },
];

function getRelation(val: string | null) {
  return RELATIONS.find(r => r.value === val) ?? RELATIONS[4];
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function getDaysUntilBirthday(birthday: string | null): number | null {
  if (!birthday) return null;
  const today = new Date();
  const bday  = new Date(birthday);
  const next  = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatLastNote(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "dziś";
  if (diff === 1) return "wczoraj";
  if (diff < 7)  return `${diff} dni temu`;
  if (diff < 30) return `${Math.floor(diff / 7)} tyg. temu`;
  return `${Math.floor(diff / 30)} mies. temu`;
}

function Avatar({ name, relation }: { name: string; relation: string | null }) {
  const rel = getRelation(relation);
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 14,
      background: rel.bg, color: rel.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, fontWeight: 600, flexShrink: 0, letterSpacing: "0.3px",
    }}>
      {getInitials(name)}
    </div>
  );
}



export default function PeoplePage() {
  const router = useRouter();

  const [people,        setPeople]        = useState<Person[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [modalMode,     setModalMode]     = useState<ModalMode>("add");
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [filterRel,     setFilterRel]     = useState("all");
  const [formName,      setFormName]      = useState("");
  const [formBirthday,  setFormBirthday]  = useState("");
  const [formRelation,  setFormRelation]  = useState("friend");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data, error } = await supabase
      .from("people").select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (!error && data) setPeople(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadPeople(); }, [loadPeople]);

  function openAdd() {
    setModalMode("add"); setEditingId(null);
    setFormName(""); setFormBirthday(""); setFormRelation("friend");
    setShowModal(true);
  }

  function openEdit(p: Person) {
    setModalMode("edit"); setEditingId(p.id);
    setFormName(p.name); setFormBirthday(p.birthday ?? ""); setFormRelation(p.relation ?? "friend");
    setDeleteConfirm(null); setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditingId(null); setDeleteConfirm(null); }

  async function savePerson() {
    if (!formName.trim()) return;
    setSaving(true);
    if (modalMode === "add") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      await supabase.from("people").insert({
        user_id: user.id, name: formName.trim(),
        birthday: formBirthday || null, relation: formRelation,
      });
    } else {
      await supabase.from("people").update({
        name: formName.trim(), birthday: formBirthday || null, relation: formRelation,
      }).eq("id", editingId!);
    }
    setSaving(false); closeModal(); loadPeople();
  }

  async function deletePerson(id: string) {
    setDeleting(id);
    await supabase.from("people").delete().eq("id", id);
    setDeleting(null); setDeleteConfirm(null); closeModal(); loadPeople();
  }

  const filtered = people
    .filter(p => filterRel === "all" || p.relation === filterRel)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // First person with upcoming birthday — used for the top AI chip
  const firstUpcoming = [...people]
    .filter(p => { const d = getDaysUntilBirthday(p.birthday); return d !== null && d <= 14; })
    .sort((a, b) => (getDaysUntilBirthday(a.birthday) ?? 99) - (getDaysUntilBirthday(b.birthday) ?? 99))[0];

  // Insert an AI chip after every 3rd card
  const AI_CHIP_INTERVAL = 3;

  return (
    <>
      <style>{`
        .pp {
          font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif;
          min-height: 100svh;
          background: #f2f2f7;
          padding-bottom: 100px;
          color: #000;
        }

        /* ── HEADER ── */
        .pp-hdr {
          padding: 16px 20px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pp-title {
          font-size: 28px;
          font-weight: 700;
          color: #000;
          letter-spacing: -.5px;
          margin: 0 0 1px;
        }
        .pp-count {
          font-size: 13px;
          color: #8e8e93;
          font-weight: 400;
        }
        .pp-add-btn {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: #007aff;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer;
          box-shadow: 0 3px 10px rgba(0,122,255,.28);
          transition: transform .1s, box-shadow .1s;
          flex-shrink: 0;
        }
        .pp-add-btn:active { transform: scale(.93); box-shadow: 0 1px 5px rgba(0,122,255,.2); }
        .pp-add-btn svg { width: 16px; height: 16px; color: #fff; }

        /* ── SEARCH ── */
        .pp-search {
          margin: 0 16px 10px;
          background: #fff;
          border-radius: 14px;
          display: flex; align-items: center; gap: 8px;
          padding: 0 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
        }
        .pp-search svg { width: 14px; height: 14px; color: #c7c7cc; flex-shrink: 0; }
        .pp-search input {
          flex: 1; border: none; background: transparent;
          padding: 11px 0; font-size: 14px;
          font-family: -apple-system, sans-serif; color: #000; outline: none;
        }
        .pp-search input::placeholder { color: #c7c7cc; }
        .pp-search-clear {
          background: none; border: none; cursor: pointer;
          color: #c7c7cc; font-size: 15px; padding: 4px; line-height: 1;
        }

        /* ── TABS ── */
        .pp-tabs {
          display: flex; gap: 6px;
          padding: 0 16px 14px;
          overflow-x: auto; scrollbar-width: none;
        }
        .pp-tabs::-webkit-scrollbar { display: none; }
        .pp-tab {
          flex-shrink: 0; background: #fff; border-radius: 20px;
          padding: 5px 14px; font-size: 12px; font-weight: 500;
          color: #8e8e93; border: none; cursor: pointer;
          font-family: -apple-system, sans-serif;
          transition: background .12s, color .12s;
        }
        .pp-tab.on { background: #007aff; color: #fff; }

        /* ── AI CHIP ── */
        .pp-ai-chip {
          margin: 0 16px 12px;
          background: #fff;
          border-radius: 14px;
          padding: 10px 14px;
          display: flex; align-items: flex-start; gap: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,.05);
        }
        .pp-ai-chip-inner {
          background: rgba(0,122,255,.07);
          border-radius: 14px;
          padding: 10px 14px;
          display: flex; align-items: flex-start; gap: 8px;
        }
        .pp-ai-glyph { font-size: 11px; color: #007aff; margin-top: 1px; flex-shrink: 0; }
        .pp-ai-text { font-size: 12px; color: #3c3c43; line-height: 1.45; }
        .pp-ai-text strong { color: #000; font-weight: 600; }

        /* ── LIST ── */
        .pp-list { padding: 0 16px; display: flex; flex-direction: column; gap: 8px; }

        /* ── CARD ── */
        .pp-card {
          background: #fff;
          border-radius: 16px;
          padding: 13px 14px;
          display: flex; align-items: center; gap: 12px;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
          transition: transform .1s;
          -webkit-tap-highlight-color: transparent;
        }
        .pp-card:active { transform: scale(.99); }

        .pp-card-body { flex: 1; min-width: 0; }
        .pp-card-name {
          font-size: 15px; font-weight: 600; color: #000;
          margin-bottom: 3px; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; letter-spacing: -.1px;
        }
        .pp-card-meta {
          font-size: 12px; color: #8e8e93; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; font-weight: 400;
        }
        .pp-card-meta .bday-soon { color: #ff9500; font-weight: 500; }
        .pp-card-meta .sep { margin: 0 4px; opacity: .45; }

        .pp-card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .pp-note-btn {
          width: 30px; height: 30px; border-radius: 9px;
          background: #f2f2f7; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background .12s;
        }
        .pp-note-btn:active { background: #e5e5ea; }
        .pp-note-btn svg { width: 14px; height: 14px; color: #8e8e93; }
        .pp-chevron { color: #c7c7cc; display: flex; align-items: center; }
        .pp-chevron svg { width: 13px; height: 13px; }

        /* ── INLINE AI CHIP ── */
        .pp-mid-chip {
          margin: 4px 0;
          background: rgba(0,122,255,.06);
          border-radius: 14px;
          padding: 10px 14px;
          display: flex; align-items: flex-start; gap: 8px;
        }

        /* ── EMPTY ── */
        .pp-empty { text-align: center; padding: 60px 28px; }
        .pp-empty-icon { font-size: 44px; margin-bottom: 14px; opacity: .35; }
        .pp-empty-title { font-size: 17px; font-weight: 600; color: #000; margin-bottom: 6px; }
        .pp-empty-sub { font-size: 14px; color: #8e8e93; line-height: 1.6; }

        /* ── MODAL ── */
        .pp-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.45);
          display: flex; align-items: flex-end; justify-content: center;
          z-index: 300;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: ppFadeIn .18s ease;
        }
        @keyframes ppFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ppSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .pp-modal {
          background: #fff;
          border-radius: 24px 24px 0 0;
          padding: 8px 20px 44px;
          width: 100%; max-width: 480px;
          animation: ppSlideUp .3s cubic-bezier(.32,.72,0,1);
        }
        .pp-modal-handle {
          width: 36px; height: 4px; border-radius: 2px;
          background: #d1d1d6; margin: 10px auto 20px;
        }
        .pp-modal-title {
          font-size: 18px; font-weight: 700; color: #000;
          margin-bottom: 20px; letter-spacing: -.2px;
        }

        .pp-field { margin-bottom: 14px; }
        .pp-label {
          font-size: 11px; font-weight: 600; color: #8e8e93;
          text-transform: uppercase; letter-spacing: .07em;
          margin-bottom: 7px; display: block;
        }
        .pp-input {
          width: 100%; border: none; border-radius: 12px;
          padding: 13px 14px; font-size: 15px;
          font-family: -apple-system, sans-serif; color: #000;
          background: #f2f2f7; outline: none;
          transition: background .15s; box-sizing: border-box;
        }
        .pp-input:focus { background: #e5e5ea; }

        .pp-rel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .pp-rel-btn {
          border: none; border-radius: 12px; background: #f2f2f7;
          padding: 12px 8px; text-align: center; cursor: pointer;
          transition: background .15s; font-family: -apple-system, sans-serif;
        }
        .pp-rel-btn.on { background: #e8f0fe; }
        .pp-rel-av {
          width: 30px; height: 30px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600; margin: 0 auto 6px; letter-spacing: .3px;
        }
        .pp-rel-label { font-size: 11px; font-weight: 500; color: #6c6c70; }
        .pp-rel-btn.on .pp-rel-label { color: #1a4a9e; }

        .pp-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
        .pp-btn-cancel {
          flex: 1; border: none; background: #f2f2f7; border-radius: 14px;
          padding: 14px; font-size: 15px; font-weight: 500; color: #6c6c70;
          cursor: pointer; font-family: -apple-system, sans-serif;
        }
        .pp-btn-save {
          flex: 2; border: none; background: #007aff; border-radius: 14px;
          padding: 14px; font-size: 15px; font-weight: 600; color: #fff;
          cursor: pointer; font-family: -apple-system, sans-serif;
          transition: opacity .15s;
        }
        .pp-btn-save:disabled { opacity: .4; cursor: not-allowed; }
        .pp-btn-save:active:not(:disabled) { opacity: .85; }

        .pp-btn-del {
          width: 100%; border: none; background: #fff0f0; border-radius: 14px;
          padding: 13px; font-size: 15px; font-weight: 500; color: #ff3b30;
          cursor: pointer; font-family: -apple-system, sans-serif; margin-top: 10px;
          transition: background .15s;
        }
        .pp-btn-del:active { background: #ffe0de; }

        .pp-del-confirm {
          margin-top: 12px; padding: 14px;
          background: #fff5f5; border-radius: 14px;
        }
        .pp-del-text {
          font-size: 13px; color: #c0392b; margin-bottom: 12px; line-height: 1.5;
        }
        .pp-del-btns { display: flex; gap: 8px; }
        .pp-del-no {
          flex: 1; border: none; background: #f2f2f7; border-radius: 12px;
          padding: 11px; font-size: 13px; font-weight: 500; color: #6c6c70;
          cursor: pointer; font-family: -apple-system, sans-serif;
        }
        .pp-del-yes {
          flex: 1; border: none; background: #ff3b30; border-radius: 12px;
          padding: 11px; font-size: 13px; font-weight: 600; color: #fff;
          cursor: pointer; font-family: -apple-system, sans-serif;
        }
        .pp-del-yes:disabled { opacity: .55; }
      `}</style>

      <div className="pp">

        {/* ── HEADER ── */}
        <div className="pp-hdr">
          <div>
            <h1 className="pp-title">Osoby</h1>
            <p className="pp-count">{people.length} {people.length === 1 ? "osoba" : people.length < 5 ? "osoby" : "osób"}</p>
          </div>
          <button className="pp-add-btn" onClick={openAdd} aria-label="Dodaj osobę">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
            </svg>
          </button>
        </div>

        {/* ── SEARCH ── */}
        <div className="pp-search">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="8.5" cy="8.5" r="5.5"/><line x1="12.5" y1="12.5" x2="17" y2="17"/>
          </svg>
          <input
            placeholder="Szukaj..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="pp-search-clear" onClick={() => setSearch("")} aria-label="Wyczyść">✕</button>
          )}
        </div>

        {/* ── TABS ── */}
        <div className="pp-tabs">
          {TABS.map(t => (
            <button
              key={t.value}
              className={`pp-tab ${filterRel === t.value ? "on" : ""}`}
              onClick={() => setFilterRel(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TOP AI CHIP ── */}
        {firstUpcoming && !search && (
          <div className="pp-ai-chip">
            <span className="pp-ai-glyph">✦</span>
            <span className="pp-ai-text">
              <strong>{firstUpcoming.name}</strong>{" "}
              {getDaysUntilBirthday(firstUpcoming.birthday) === 0
                ? "ma dziś urodziny 🎉"
                : `ma urodziny za ${getDaysUntilBirthday(firstUpcoming.birthday)} dni.`
              }
            </span>
          </div>
        )}

        {/* ── PEOPLE LIST ── */}
        <div className="pp-list">
          {loading && (
            <div style={{ textAlign: "center", padding: 44, color: "#8e8e93", fontSize: 14 }}>
              Ładowanie...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="pp-empty">
              <div className="pp-empty-icon">👤</div>
              <div className="pp-empty-title">
                {search ? "Brak wyników" : "Dodaj pierwszą osobę"}
              </div>
              <div className="pp-empty-sub">
                {search
                  ? `Nic nie pasuje do "${search}"`
                  : "Zapisuj notatki, daty i wspomnienia o bliskich."}
              </div>
            </div>
          )}

          {filtered.map((person, idx) => {
            const rel    = getRelation(person.relation);
            const days   = getDaysUntilBirthday(person.birthday);
            const lastNote = formatLastNote(person.last_note_at);
            const noteCount = person.notes_count ?? 0;

            // Build compact metadata line
            const metaParts: React.ReactNode[] = [
              <span key="rel">{rel.label}</span>
            ];
            if (days !== null) {
              metaParts.push(<span key="sep1" className="sep">·</span>);
              if (days === 0) {
                metaParts.push(<span key="bday" className="bday-soon">urodziny dziś 🎉</span>);
              } else if (days <= 14) {
                metaParts.push(<span key="bday" className="bday-soon">ur. za {days} dni</span>);
              } else {
                metaParts.push(<span key="bday">ur. za {days} dni</span>);
              }
            } else if (noteCount > 0) {
              metaParts.push(<span key="sep2" className="sep">·</span>);
              metaParts.push(<span key="notes">{noteCount} {noteCount === 1 ? "notatka" : noteCount < 5 ? "notatki" : "notatek"}</span>);
              if (lastNote) {
                metaParts.push(<span key="sep3" className="sep">·</span>);
                metaParts.push(<span key="last">{lastNote}</span>);
              }
            }

            // Insert a subtle AI chip every AI_CHIP_INTERVAL items (only first occurrence)
            const showChip = idx === AI_CHIP_INTERVAL && filtered.length > AI_CHIP_INTERVAL && !search;
            const chipPerson = filtered[0];

            return (
              <div key={person.id}>
                {showChip && chipPerson && (
                  <div className="pp-mid-chip">
                    <span className="pp-ai-glyph">✦</span>
                    <span className="pp-ai-text">
                      <strong>{chipPerson.name}</strong> często pojawia się w Twoich notatkach.
                    </span>
                  </div>
                )}

                <div className="pp-card" onClick={() => router.push(`/person/${person.id}`)}>
                  <Avatar name={person.name} relation={person.relation} />

                  <div className="pp-card-body">
                    <div className="pp-card-name">{person.name}</div>
                    <div className="pp-card-meta">{metaParts}</div>
                  </div>

                  <div className="pp-card-actions">
                    <button
                      className="pp-note-btn"
                      onClick={e => { e.stopPropagation(); router.push(`/person/${person.id}?tab=notes`); }}
                      aria-label="Notatki"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M3 3h10v8l-2 2H3V3z"/>
                        <line x1="5" y1="6" x2="11" y2="6"/>
                        <line x1="5" y1="9" x2="8" y2="9"/>
                      </svg>
                    </button>
                    <button
                      className="pp-note-btn"
                      onClick={e => { e.stopPropagation(); openEdit(person); }}
                      aria-label="Edytuj"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 2l3 3-8 8H3v-3l8-8z"/>
                      </svg>
                    </button>
                    <span className="pp-chevron">
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4,2 8,6 4,10"/>
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="pp-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="pp-modal">
            <div className="pp-modal-handle" />
            <div className="pp-modal-title">
              {modalMode === "add" ? "Nowa osoba" : "Edytuj osobę"}
            </div>

            <div className="pp-field">
              <label className="pp-label">Imię i nazwisko</label>
              <input
                className="pp-input"
                placeholder="np. Anna Kowalska"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="pp-field">
              <label className="pp-label">Data urodzin</label>
              <input
                className="pp-input"
                type="date"
                value={formBirthday}
                onChange={e => setFormBirthday(e.target.value)}
              />
            </div>

            <div className="pp-field">
              <label className="pp-label">Relacja</label>
              <div className="pp-rel-grid">
                {RELATIONS.map(r => (
                  <button
                    key={r.value}
                    className={`pp-rel-btn ${formRelation === r.value ? "on" : ""}`}
                    onClick={() => setFormRelation(r.value)}
                  >
                    <div className="pp-rel-av" style={{ background: r.bg, color: r.text }}>
                      {r.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="pp-rel-label">{r.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pp-modal-actions">
              <button className="pp-btn-cancel" onClick={closeModal}>Anuluj</button>
              <button
                className="pp-btn-save"
                onClick={savePerson}
                disabled={!formName.trim() || saving}
              >
                {saving ? "Zapisuję..." : modalMode === "add" ? "Dodaj" : "Zapisz"}
              </button>
            </div>

            {modalMode === "edit" && editingId && (
              deleteConfirm !== editingId ? (
                <button className="pp-btn-del" onClick={() => setDeleteConfirm(editingId)}>
                  Usuń osobę
                </button>
              ) : (
                <div className="pp-del-confirm">
                  <div className="pp-del-text">Usunąć {formName}? Tej operacji nie można cofnąć.</div>
                  <div className="pp-del-btns">
                    <button className="pp-del-no" onClick={() => setDeleteConfirm(null)}>Anuluj</button>
                    <button
                      className="pp-del-yes"
                      disabled={deleting === editingId}
                      onClick={() => deletePerson(editingId!)}
                    >
                      {deleting === editingId ? "Usuwam..." : "Usuń"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}