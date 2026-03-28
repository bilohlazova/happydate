"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  name: string;
  birthday: string | null;
  relation: string | null;
  created_at: string;
};

type ModalMode = "add" | "edit";

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

  const [people,        setPeople]        = useState<Person[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [modalMode,     setModalMode]     = useState<ModalMode>("add");
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [showDeleteFor, setShowDeleteFor] = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [filterRel,     setFilterRel]     = useState("all");
  const [formName,      setFormName]      = useState("");
  const [formBirthday,  setFormBirthday]  = useState("");
  const [formRelation,  setFormRelation]  = useState("friend");

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

  // ── Відкрити модалку додавання ──────────────────────────
  function openAdd() {
    setModalMode("add");
    setEditingId(null);
    setFormName(""); setFormBirthday(""); setFormRelation("friend");
    setShowModal(true);
  }

  // ── Відкрити модалку редагування ────────────────────────
  function openEdit(p: Person, e: React.MouseEvent) {
    e.stopPropagation();
    setModalMode("edit");
    setEditingId(p.id);
    setFormName(p.name);
    setFormBirthday(p.birthday ?? "");
    setFormRelation(p.relation ?? "friend");
    setShowDeleteFor(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
  }

  // ── Зберегти (додати або оновити) ───────────────────────
  async function savePerson() {
    if (!formName.trim()) return;
    setSaving(true);

    if (modalMode === "add") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      await supabase.from("people").insert({
        user_id:  user.id,
        name:     formName.trim(),
        birthday: formBirthday || null,
        relation: formRelation,
      });
    } else {
      await supabase.from("people").update({
        name:     formName.trim(),
        birthday: formBirthday || null,
        relation: formRelation,
      }).eq("id", editingId!);
    }

    setSaving(false);
    closeModal();
    loadPeople();
  }

  // ── Видалити ────────────────────────────────────────────
  async function deletePerson(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(id);
    await supabase.from("people").delete().eq("id", id);
    setDeleting(null);
    setShowDeleteFor(null);
    loadPeople();
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

        /* ── Картка з кнопками дій ── */
        .pp-card-wrap { position:relative; }
        .pp-card {
          background:#fff; border-radius:18px; border:1.5px solid #ede9f8;
          padding:14px 16px; display:flex; align-items:center; gap:14px;
          cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.04);
          transition:transform .15s,border-color .15s;
          -webkit-tap-highlight-color:transparent;
          position:relative;
        }
        .pp-card:active { transform:scale(.985); border-color:#c4b5f8; }
        .pp-avatar { width:48px; height:48px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; background:linear-gradient(135deg,#ede9fe,#fce7f3); }
        .pp-card-body { flex:1; min-width:0; }
        .pp-card-name { font-size:15px; font-weight:700; color:#1a1040; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pp-card-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .pp-rel-tag { font-size:11px; color:#7c6f9f; font-weight:500; }

        /* Кнопки дій на картці */
        .pp-card-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .pp-icon-btn {
          width:34px; height:34px; border-radius:10px; border:none;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; font-size:15px; transition:all .15s;
          flex-shrink:0;
        }
        .pp-icon-btn-edit { background:#f1eeff; color:#7c3aed; }
        .pp-icon-btn-edit:active { background:#e0d9ff; }
        .pp-icon-btn-delete { background:#fff0f0; color:#e53e3e; }
        .pp-icon-btn-delete:active { background:#ffe0e0; }

        /* Підтвердження видалення */
        .pp-delete-confirm {
          position:absolute; right:0; top:calc(100% + 6px);
          background:#fff; border:1.5px solid #fde8e8;
          border-radius:14px; padding:12px 14px;
          box-shadow:0 8px 24px rgba(0,0,0,.12);
          z-index:10; min-width:200px;
          animation:ppPop .2s cubic-bezier(.34,1.3,.64,1);
        }
        .pp-delete-confirm-text { font-size:13px; font-weight:600; color:#1a1040; margin-bottom:10px; }
        .pp-delete-confirm-btns { display:flex; gap:8px; }
        .pp-delete-no { flex:1; border:1.5px solid #e8e3f5; background:#f8f7ff; border-radius:10px; padding:8px; font-size:13px; font-weight:700; color:#7c6f9f; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .pp-delete-yes { flex:1; border:none; background:#e53e3e; border-radius:10px; padding:8px; font-size:13px; font-weight:700; color:#fff; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:opacity .15s; }
        .pp-delete-yes:disabled { opacity:.6; }

        .pp-empty { text-align:center; padding:48px 24px; }
        .pp-empty-icon { font-size:52px; margin-bottom:12px; }
        .pp-empty-title { font-size:16px; font-weight:700; color:#1a1040; margin-bottom:6px; }
        .pp-empty-sub { font-size:13px; color:#7c6f9f; line-height:1.5; }

        /* ── Modal ── */
        .pp-overlay { position:fixed; inset:0; background:rgba(10,5,30,.6); display:flex; align-items:flex-start; justify-content:center; padding:60px 16px 16px; z-index:200; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); animation:ppFadeIn .2s ease; overflow-y:auto; }
        @keyframes ppFadeIn { from{opacity:0} to{opacity:1} }

        .pp-modal { background:#fff; border-radius:24px; padding:24px 20px 28px; width:100%; max-width:420px; animation:ppPop .25s cubic-bezier(.34,1.3,.64,1); position:relative; }
        @keyframes ppPop { from{opacity:0;transform:scale(.92) translateY(-10px)} to{opacity:1;transform:scale(1) translateY(0)} }

        .pp-modal-close { position:absolute; top:16px; right:16px; width:32px; height:32px; border-radius:50%; background:#f1eeff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; color:#7c6f9f; transition:background .15s; }
        .pp-modal-close:active { background:#e0d9ff; }
        .pp-modal-title { font-size:20px; font-weight:800; color:#1a1040; margin-bottom:20px; padding-right:40px; }

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

        /* Кнопка видалити в модалці редагування */
        .pp-btn-delete-modal { width:100%; border:1.5px solid #fde8e8; background:#fff0f0; border-radius:14px; padding:12px; font-size:14px; font-weight:700; color:#e53e3e; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; margin-top:10px; transition:all .15s; }
        .pp-btn-delete-modal:active { background:#ffe0e0; }
      `}</style>

      <div className="pp-root" onClick={() => setShowDeleteFor(null)}>

        <div className="pp-header">
          <div className="pp-header-top">
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:2 }}>
                <h1 className="pp-title">👥 Osoby</h1>
                <span className="pp-count-pill">{people.length}</span>
              </div>
              <p className="pp-subtitle">Twoi bliscy w jednym miejscu</p>
            </div>
            <button className="pp-add-btn" onClick={openAdd}>
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
            const isDeleteOpen = showDeleteFor === person.id;
            return (
              <div key={person.id} className="pp-card-wrap">
                <div
                  className="pp-card"
                  onClick={() => router.push(`/person/${person.id}`)}
                >
                  <div className="pp-avatar">{rel.emoji}</div>
                  <div className="pp-card-body">
                    <div className="pp-card-name">{person.name}</div>
                    <div className="pp-card-meta">
                      <span className="pp-rel-tag">{rel.label}</span>
                      <BirthdayBadge birthday={person.birthday} />
                    </div>
                  </div>

                  {/* Кнопки ✏️ і 🗑️ */}
                  <div className="pp-card-actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="pp-icon-btn pp-icon-btn-edit"
                      onClick={e => openEdit(person, e)}
                      title="Edytuj"
                    >
                      ✏️
                    </button>
                    <button
                      className="pp-icon-btn pp-icon-btn-delete"
                      onClick={e => { e.stopPropagation(); setShowDeleteFor(isDeleteOpen ? null : person.id); }}
                      title="Usuń"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Підтвердження видалення */}
                {isDeleteOpen && (
                  <div className="pp-delete-confirm" onClick={e => e.stopPropagation()}>
                    <div className="pp-delete-confirm-text">Usunąć {person.name}?</div>
                    <div className="pp-delete-confirm-btns">
                      <button className="pp-delete-no" onClick={() => setShowDeleteFor(null)}>Anuluj</button>
                      <button
                        className="pp-delete-yes"
                        disabled={deleting === person.id}
                        onClick={e => deletePerson(person.id, e)}
                      >
                        {deleting === person.id ? "..." : "Usuń"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal — додавання або редагування */}
      {showModal && (
        <div className="pp-overlay" onClick={e => { if (e.target===e.currentTarget) closeModal(); }}>
          <div className="pp-modal">
            <button className="pp-modal-close" onClick={closeModal}>✕</button>

            <div className="pp-modal-title">
              {modalMode === "add" ? "Nowa osoba ✨" : "Edytuj osobę ✏️"}
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
              <label className="pp-label">Data urodzin (opcjonalnie)</label>
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
                  <button key={r.value} className={`pp-rel-btn ${formRelation===r.value?"active":""}`} onClick={() => setFormRelation(r.value)}>
                    <span className="pp-rel-btn-emoji">{r.emoji}</span>
                    <span className="pp-rel-btn-label">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pp-modal-actions">
              <button className="pp-btn-cancel" onClick={closeModal}>Anuluj</button>
              <button className="pp-btn-save" onClick={savePerson} disabled={!formName.trim()||saving}>
                {saving ? "Zapisywanie..." : modalMode === "add" ? "Dodaj osobę →" : "Zapisz zmiany →"}
              </button>
            </div>

            {/* Видалити з модалки редагування */}
            {modalMode === "edit" && editingId && (
              <button
                className="pp-btn-delete-modal"
                disabled={deleting === editingId}
                onClick={async () => {
                  setDeleting(editingId);
                  await supabase.from("people").delete().eq("id", editingId);
                  setDeleting(null);
                  closeModal();
                  loadPeople();
                }}
              >
                {deleting === editingId ? "Usuwanie..." : "🗑️ Usuń tę osobę"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}