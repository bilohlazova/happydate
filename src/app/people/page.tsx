"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────
// TYPES — match real Supabase schema
// ─────────────────────────────────────────────

type Person = {
  id: string;
  name: string;
  birthday: string | null;
  relation: string | null;
  notes: string | null;       // short bio field on people table
  created_at: string;
};

// Matches public.memories table
type Memory = {
  id: string;
  person_id: string;
  content_text: string | null;
  ai_tags: string[] | null;
  ai_summary: string | null;
  created_at: string;
};

type PersonInsight = {
  personId: string;
  memoryCount: number;
  lastMemoryAt: string | null;
  topKeywords: string[];
  recentText: string | null;
  aiTags: string[];
};

type InsightSheetData = {
  person: Person;
  insight: PersonInsight;
};

type ModalMode = "add" | "edit";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

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

// Polish stop-words for keyword extraction
const STOP_WORDS = new Set([
  "i","w","z","na","do","że","się","to","jest","nie","tak","ale","jak","co","po",
  "już","też","by","go","jej","jego","ich","nam","nas","pan","pani","ten","ta",
  "te","tego","tej","czy","dla","gdy","lub","ma","mi","my","no","o","od","on",
  "ona","one","oni","po","pod","przy","są","u","we","za","ze","być","który",
  "która","które","tego","które","przez","oraz","jako","sobie","tego","będzie",
]);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

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

function formatRelativeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return "dziś";
  if (diff === 1) return "wczoraj";
  if (diff < 7)  return `${diff} dni temu`;
  if (diff < 30) return `${Math.floor(diff / 7)} tyg. temu`;
  return `${Math.floor(diff / 30)} mies. temu`;
}

function getZodiacSign(birthday: string | null): string | null {
  if (!birthday) return null;
  const d = new Date(birthday);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return "Baran ♈";
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return "Byk ♉";
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return "Bliźnięta ♊";
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return "Rak ♋";
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return "Lew ♌";
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return "Panna ♍";
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return "Waga ♎";
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return "Skorpion ♏";
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return "Strzelec ♐";
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return "Koziorożec ♑";
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return "Wodnik ♒";
  return "Ryby ♓";
}

/** Extract top N keywords from memories (content_text + ai_tags) */
function extractKeywords(memories: Memory[], topN = 5): string[] {
  const freq: Record<string, number> = {};

  // First: use ai_tags if available (already processed by AI)
  for (const m of memories) {
    if (m.ai_tags) {
      for (const tag of m.ai_tags) {
        const t = tag.toLowerCase().trim();
        if (t.length > 2) freq[t] = (freq[t] ?? 0) + 2; // weight tags higher
      }
    }
  }

  // Second: extract from content_text
  for (const m of memories) {
    if (!m.content_text) continue;
    const words = m.content_text
      .toLowerCase()
      .replace(/[^a-ząćęłńóśźżа-я\s]/gi, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w));
    for (const w of words) {
      freq[w] = (freq[w] ?? 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function Avatar({ name, relation }: { name: string; relation: string | null }) {
  const rel = getRelation(relation);
  return (
    <div className="hd-avatar" style={{ background: rel.bg, color: rel.text }}>
      {getInitials(name)}
    </div>
  );
}

function AiInsightSheet({
  data,
  onClose,
}: {
  data: InsightSheetData;
  onClose: () => void;
}) {
  const { person, insight } = data;
  const days   = getDaysUntilBirthday(person.birthday);
  const zodiac = getZodiacSign(person.birthday);
  const rel    = getRelation(person.relation);

  const hasContent =
    days !== null ||
    insight.topKeywords.length > 0 ||
    insight.recentText ||
    insight.memoryCount > 0;

  return (
    <div
      className="hd-sheet-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="hd-sheet">
        <div className="hd-sheet-handle" />

        {/* Person header */}
        <div className="hd-sheet-hdr">
          <div className="hd-sheet-avatar" style={{ background: rel.bg, color: rel.text }}>
            {getInitials(person.name)}
          </div>
          <div className="hd-sheet-person">
            <div className="hd-sheet-name">{person.name}</div>
            <div className="hd-sheet-rel">
              {rel.label}{zodiac ? ` · ${zodiac}` : ""}
            </div>
          </div>
          <button className="hd-sheet-close" onClick={onClose} aria-label="Zamknij">✕</button>
        </div>

        <div className="hd-sheet-divider" />

        {/* AI observations — warm bubbles */}
        <div className="hd-sheet-ai-section">
          <div className="hd-sheet-ai-label">
            <span className="hd-ai-glyph">✦</span> AI zauważyło
          </div>

          {/* Birthday */}
          {days !== null && (
            <div className="hd-sheet-bubble">
              {days === 0
                ? `Dziś urodziny ${person.name.split(" ")[0]}! 🎉`
                : days <= 7
                  ? `Urodziny ${person.name.split(" ")[0]} już za ${days} dni 🎂`
                  : `Urodziny ${person.name.split(" ")[0]} za ${days} dni 🎂`
              }
            </div>
          )}

          {/* Top keywords from real memories + ai_tags */}
          {insight.topKeywords.length > 0 && (
            <div className="hd-sheet-bubble">
              Najczęściej pojawiają się:{" "}
              <strong>{insight.topKeywords.join(" · ")}</strong>
            </div>
          )}

          {/* Most recent memory snippet */}
          {insight.recentText && (
            <div className="hd-sheet-bubble">
              Ostatnio: &ldquo;{insight.recentText.slice(0, 100)}
              {insight.recentText.length > 100 ? "…" : ""}&rdquo;
            </div>
          )}

          {/* Activity summary */}
          {insight.memoryCount > 0 && (
            <div className="hd-sheet-bubble hd-sheet-bubble-soft">
              {insight.memoryCount === 1 ? "1 wspomnienie" : `${insight.memoryCount} wspomnień`}
              {insight.lastMemoryAt
                ? ` · ostatnie ${formatRelativeDate(insight.lastMemoryAt)}`
                : ""}
            </div>
          )}

          {/* Notes field from people table */}
          {person.notes && (
            <div className="hd-sheet-bubble hd-sheet-bubble-soft">
              {person.notes}
            </div>
          )}

          {/* Empty state */}
          {!hasContent && (
            <div className="hd-sheet-bubble hd-sheet-bubble-soft">
              Dodaj pierwsze wspomnienia, żeby AI mogło lepiej zapamiętać tę osobę.
            </div>
          )}
        </div>

        <div className="hd-sheet-footer">
          <button className="hd-sheet-cta" onClick={onClose}>Zamknij</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function PeoplePage() {
  const router = useRouter();

  const [people,        setPeople]        = useState<Person[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filterRel,     setFilterRel]     = useState("all");
  const [insights,      setInsights]      = useState<Record<string, PersonInsight>>({});
  const [insightSheet,  setInsightSheet]  = useState<InsightSheetData | null>(null);
  const [loadingInsight,setLoadingInsight]= useState<string | null>(null);
  const [showModal,     setShowModal]     = useState(false);
  const [modalMode,     setModalMode]     = useState<ModalMode>("add");
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formName,      setFormName]      = useState("");
  const [formBirthday,  setFormBirthday]  = useState("");
  const [formRelation,  setFormRelation]  = useState("friend");

  // ── Load people ──
  const loadPeople = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (!error && data) {
      setPeople(data);
      loadInsightsMeta(data);
    }
    setLoading(false);
  }, [router]); 
  // ── Load lightweight insight metadata for ALL people in one query ──
  async function loadInsightsMeta(personList: Person[]) {
    if (personList.length === 0) return;
    const ids = personList.map(p => p.id);

    const { data: memories } = await supabase
      .from("memories")
      .select("id, person_id, content_text, ai_tags, ai_summary, created_at")
      .in("person_id", ids)
      .order("created_at", { ascending: false });

    if (!memories) return;

    // Group by person_id
    const grouped: Record<string, Memory[]> = {};
    for (const m of memories) {
      if (!grouped[m.person_id]) grouped[m.person_id] = [];
      grouped[m.person_id].push(m);
    }

    const result: Record<string, PersonInsight> = {};
    for (const person of personList) {
      const pMems = grouped[person.id] ?? [];
      result[person.id] = {
        personId:     person.id,
        memoryCount:  pMems.length,
        lastMemoryAt: pMems[0]?.created_at ?? null,
        topKeywords:  extractKeywords(pMems, 4),
        recentText:   pMems[0]?.ai_summary ?? pMems[0]?.content_text ?? null,
        aiTags:       pMems.flatMap(m => m.ai_tags ?? []).slice(0, 8),
      };
    }
    setInsights(result);
  }

  useEffect(() => { loadPeople(); }, [loadPeople]);

  // ── Open Insight sheet — fetch full memories for this person ──
  async function openInsight(person: Person) {
    setLoadingInsight(person.id);

    const { data: memories } = await supabase
      .from("memories")
      .select("id, person_id, content_text, ai_tags, ai_summary, created_at")
      .eq("person_id", person.id)
      .order("created_at", { ascending: false });

    const pMems: Memory[] = memories ?? [];
    const fullInsight: PersonInsight = {
      personId:     person.id,
      memoryCount:  pMems.length,
      lastMemoryAt: pMems[0]?.created_at ?? null,
      topKeywords:  extractKeywords(pMems, 6),
      recentText:   pMems[0]?.ai_summary ?? pMems[0]?.content_text ?? null,
      aiTags:       pMems.flatMap(m => m.ai_tags ?? []).slice(0, 10),
    };

    setInsights(prev => ({ ...prev, [person.id]: fullInsight }));
    setInsightSheet({ person, insight: fullInsight });
    setLoadingInsight(null);
  }

  // ── Modal helpers ──
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
    setSaving(false); closeModal(); loadPeople();
  }

  async function deletePerson(id: string) {
    setDeleting(id);
    await supabase.from("people").delete().eq("id", id);
    setDeleting(null); setDeleteConfirm(null); closeModal(); loadPeople();
  }

  // ── Derived ──
  const filtered = people
    .filter(p => filterRel === "all" || p.relation === filterRel)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const firstUpcoming = [...people]
    .filter(p => { const d = getDaysUntilBirthday(p.birthday); return d !== null && d <= 14; })
    .sort((a, b) => (getDaysUntilBirthday(a.birthday) ?? 99) - (getDaysUntilBirthday(b.birthday) ?? 99))[0];

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <>
      <style>{`
        /* ══════════════════════════════════════
           HAPPYDATE DESIGN SYSTEM
           Reusable across all pages
        ══════════════════════════════════════ */

        .hd-page {
          font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif;
          min-height: 100svh;
          background: #f2f2f7;
          padding-top: env(safe-area-inset-top);
          padding-bottom: calc(96px + env(safe-area-inset-bottom));
          color: #000;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Header ── */
        .hd-header {
          padding: 16px 20px 8px;
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 12px;
        }
        .hd-header-left h1 {
          font-size: 32px; font-weight: 700; color: #000;
          letter-spacing: -.7px; line-height: 1; margin: 0 0 3px;
        }
        .hd-header-left p {
          font-size: 13px; color: #aeaeb2; font-weight: 400; margin: 0;
        }
        .hd-add-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: #007aff;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,122,255,.32);
          transition: transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s;
          flex-shrink: 0; margin-bottom: 1px;
        }
        .hd-add-btn:active { transform: scale(.88); box-shadow: 0 2px 6px rgba(0,122,255,.2); }
        .hd-add-btn svg { width: 15px; height: 15px; color: #fff; }

        /* ── Search ── */
        .hd-search {
          margin: 6px 16px 10px;
          background: rgba(118,118,128,.12);
          border-radius: 12px;
          display: flex; align-items: center; gap: 7px;
          padding: 0 12px;
        }
        .hd-search svg { width: 14px; height: 14px; color: #8e8e93; flex-shrink: 0; }
        .hd-search input {
          flex: 1; border: none; background: transparent;
          padding: 10px 0; font-size: 15px;
          font-family: -apple-system, sans-serif; color: #000; outline: none;
        }
        .hd-search input::placeholder { color: #8e8e93; }
        .hd-search-clear {
          width: 16px; height: 16px; border-radius: 50%;
          background: rgba(60,60,67,.22); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 9px; flex-shrink: 0;
          font-family: -apple-system, sans-serif;
        }

        /* ── Tabs ── */
        .hd-tabs {
          display: flex; gap: 7px; padding: 2px 16px 14px;
          overflow-x: auto; scrollbar-width: none;
        }
        .hd-tabs::-webkit-scrollbar { display: none; }
        .hd-tab {
          flex-shrink: 0; background: rgba(118,118,128,.12);
          border-radius: 20px; padding: 6px 15px;
          font-size: 13px; font-weight: 500; color: #3c3c43;
          border: none; cursor: pointer;
          font-family: -apple-system, sans-serif;
          transition: background .12s, color .12s, box-shadow .12s;
          letter-spacing: -.1px; min-height: 32px;
        }
        .hd-tab.on {
          background: #007aff; color: #fff;
          box-shadow: 0 2px 8px rgba(0,122,255,.28);
        }

        /* ── Top AI chip ── */
        .hd-ai-chip {
          margin: 0 16px 12px;
          background: rgba(0,122,255,.07);
          border-radius: 12px; padding: 9px 13px;
          display: flex; align-items: center; gap: 8px;
        }
        .hd-ai-glyph { font-size: 11px; color: #007aff; flex-shrink: 0; }
        .hd-ai-text { font-size: 13px; color: #3c3c43; line-height: 1.4; }
        .hd-ai-text strong { color: #000; font-weight: 600; }

        /* ── People list — clean, no interruptions ── */
        .hd-list { padding: 0 16px; display: flex; flex-direction: column; }

        /* Grouped card borders (Apple Reminders style) */
        .hd-item:first-child .hd-card  { border-radius: 14px 14px 0 0; }
        .hd-item:last-child  .hd-card  { border-radius: 0 0 14px 14px; border-top: .5px solid rgba(60,60,67,.1); }
        .hd-item:only-child  .hd-card  { border-radius: 14px; border-top: none !important; }
        .hd-item + .hd-item  .hd-card  { border-top: .5px solid rgba(60,60,67,.1); border-radius: 0; }

        /* ── Card ── */
        .hd-card {
          background: #fff;
          padding: 11px 12px 11px 16px;
          display: flex; align-items: center; gap: 13px;
          cursor: pointer; transition: background .08s;
          -webkit-tap-highlight-color: transparent;
          min-height: 64px;
        }
        .hd-card:active { background: #f2f2f7; }

        /* ── Avatar ── */
        .hd-avatar {
          width: 42px; height: 42px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 600; flex-shrink: 0; letter-spacing: .4px;
        }

        /* ── Card body ── */
        .hd-card-body { flex: 1; min-width: 0; }
        .hd-card-name {
          font-size: 16px; font-weight: 590; color: #000;
          margin-bottom: 2px; letter-spacing: -.2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .hd-card-meta {
          font-size: 13px; color: #8e8e93; font-weight: 400;
          letter-spacing: -.1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .hd-card-meta .bsoon { color: #ff9500; font-weight: 500; }
        .hd-card-meta .sep   { margin: 0 3px; opacity: .38; font-size: 11px; }

        /* ── Card actions ── */
        .hd-card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

        .hd-icon-btn {
          width: 32px; height: 32px; border-radius: 9px;
          background: rgba(118,118,128,.1); border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background .1s; flex-shrink: 0; min-width: 32px;
        }
        .hd-icon-btn:active { background: rgba(118,118,128,.22); }
        .hd-icon-btn svg { width: 14px; height: 14px; color: #8e8e93; }

        .hd-insight-btn {
          width: 32px; height: 32px; border-radius: 9px;
          background: rgba(0,122,255,.09); border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background .1s;
          flex-shrink: 0; min-width: 32px;
          font-size: 12px; color: #007aff;
        }
        .hd-insight-btn:active { background: rgba(0,122,255,.18); }
        .hd-insight-btn-loading { opacity: .45; pointer-events: none; }

        /* ── Loading / Empty ── */
        .hd-loading { text-align: center; padding: 48px 28px; color: #aeaeb2; font-size: 14px; }
        .hd-empty { text-align: center; padding: 72px 28px; }
        .hd-empty-glyph { font-size: 38px; margin-bottom: 14px; opacity: .25; }
        .hd-empty-title { font-size: 17px; font-weight: 600; color: #000; margin-bottom: 6px; letter-spacing: -.2px; }
        .hd-empty-sub { font-size: 15px; color: #8e8e93; line-height: 1.5; }

        /* ══════════════════════════════════════
           AI INSIGHT SHEET — position: fixed
        ══════════════════════════════════════ */

        .hd-sheet-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.38);
          display: flex; align-items: flex-end; justify-content: center;
          z-index: 400;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          animation: hdFadeIn .18s ease;
        }
        @keyframes hdFadeIn  { from { opacity: 0; }               to { opacity: 1; }              }
        @keyframes hdSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .hd-sheet {
          background: #f2f2f7;
          border-radius: 20px 20px 0 0;
          width: 100%; max-width: 480px;
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
          animation: hdSlideUp .3s cubic-bezier(.32,.72,0,1);
          max-height: 88svh; overflow-y: auto;
        }
        .hd-sheet-handle {
          width: 36px; height: 5px; border-radius: 3px;
          background: rgba(60,60,67,.22); margin: 10px auto 0;
        }
        .hd-sheet-hdr {
          padding: 16px 16px 12px;
          display: flex; align-items: center; gap: 12px;
        }
        .hd-sheet-avatar {
          width: 46px; height: 46px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 600; flex-shrink: 0; letter-spacing: .4px;
        }
        .hd-sheet-person { flex: 1; min-width: 0; }
        .hd-sheet-name { font-size: 18px; font-weight: 700; color: #000; letter-spacing: -.3px; }
        .hd-sheet-rel  { font-size: 13px; color: #8e8e93; margin-top: 1px; }
        .hd-sheet-close {
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(118,118,128,.18); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #636366; font-size: 12px; flex-shrink: 0;
          font-family: -apple-system, sans-serif;
        }
        .hd-sheet-divider { height: .5px; background: rgba(60,60,67,.14); margin: 0 16px; }

        /* Warm AI content */
        .hd-sheet-ai-section { padding: 16px 16px 8px; }
        .hd-sheet-ai-label {
          font-size: 12px; font-weight: 600; color: #8e8e93;
          text-transform: uppercase; letter-spacing: .07em;
          margin-bottom: 12px;
          display: flex; align-items: center; gap: 5px;
        }
        .hd-sheet-bubble {
          background: #fff; border-radius: 14px;
          padding: 12px 14px; font-size: 15px;
          color: #1c1c1e; line-height: 1.5;
          margin-bottom: 8px; font-weight: 400; letter-spacing: -.1px;
        }
        .hd-sheet-bubble strong { color: #000; font-weight: 600; }
        .hd-sheet-bubble-soft { color: #8e8e93; font-size: 13px; }

        .hd-sheet-footer { padding: 10px 16px 0; }
        .hd-sheet-cta {
          width: 100%; border: none;
          background: rgba(118,118,128,.12);
          border-radius: 14px; padding: 14px;
          font-size: 16px; font-weight: 500; color: #3c3c43;
          cursor: pointer; font-family: -apple-system, sans-serif;
          transition: background .1s;
        }
        .hd-sheet-cta:active { background: rgba(118,118,128,.2); }

        /* ══════════════════════════════════════
           ADD / EDIT MODAL SHEET
        ══════════════════════════════════════ */

        .hd-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.38);
          display: flex; align-items: flex-end; justify-content: center;
          z-index: 300;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          animation: hdFadeIn .18s ease;
        }
        .hd-modal {
          background: #f2f2f7;
          border-radius: 20px 20px 0 0;
          width: 100%; max-width: 480px;
          padding-bottom: calc(20px + env(safe-area-inset-bottom));
          animation: hdSlideUp .3s cubic-bezier(.32,.72,0,1);
        }
        .hd-modal-handle {
          width: 36px; height: 5px; border-radius: 3px;
          background: rgba(60,60,67,.22); margin: 10px auto 0;
        }
        .hd-modal-hdr {
          padding: 14px 16px 12px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .hd-modal-title { font-size: 17px; font-weight: 600; color: #000; letter-spacing: -.2px; }
        .hd-modal-close {
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(118,118,128,.18); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #636366; font-size: 12px;
          font-family: -apple-system, sans-serif;
        }
        .hd-modal-body { padding: 0 16px; }

        .hd-field { margin-bottom: 12px; }
        .hd-label {
          font-size: 12px; font-weight: 600; color: #8e8e93;
          text-transform: uppercase; letter-spacing: .06em;
          margin-bottom: 6px; display: block; padding-left: 2px;
        }
        .hd-input {
          width: 100%; border: none; border-radius: 12px;
          padding: 13px 15px; font-size: 16px;
          font-family: -apple-system, sans-serif; color: #000;
          background: #fff; outline: none; box-sizing: border-box;
          transition: box-shadow .15s; letter-spacing: -.1px;
        }
        .hd-input:focus { box-shadow: 0 0 0 3px rgba(0,122,255,.15); }

        .hd-rel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .hd-rel-btn {
          border: none; border-radius: 12px; background: #fff;
          padding: 12px 8px; text-align: center; cursor: pointer;
          transition: all .12s; font-family: -apple-system, sans-serif;
          min-height: 68px;
        }
        .hd-rel-btn.on { background: #e0edff; box-shadow: 0 0 0 2px rgba(0,122,255,.4) inset; }
        .hd-rel-av {
          width: 30px; height: 30px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600; margin: 0 auto 6px;
        }
        .hd-rel-label { font-size: 11px; font-weight: 500; color: #636366; }
        .hd-rel-btn.on .hd-rel-label { color: #007aff; font-weight: 600; }

        .hd-modal-actions { display: flex; gap: 10px; margin: 14px 16px 0; }
        .hd-btn-cancel {
          flex: 1; border: none; background: #fff; border-radius: 14px;
          padding: 14px; font-size: 16px; font-weight: 500; color: #007aff;
          cursor: pointer; font-family: -apple-system, sans-serif; letter-spacing: -.1px;
        }
        .hd-btn-save {
          flex: 2; border: none; background: #007aff; border-radius: 14px;
          padding: 14px; font-size: 16px; font-weight: 600; color: #fff;
          cursor: pointer; font-family: -apple-system, sans-serif;
          box-shadow: 0 4px 12px rgba(0,122,255,.28);
          transition: opacity .12s; letter-spacing: -.1px;
        }
        .hd-btn-save:disabled { opacity: .36; box-shadow: none; cursor: not-allowed; }
        .hd-btn-save:active:not(:disabled) { opacity: .8; }

        .hd-btn-del {
          display: block; width: calc(100% - 32px); margin: 10px 16px 0;
          border: none; background: #fff; border-radius: 14px;
          padding: 14px; font-size: 16px; font-weight: 500; color: #ff3b30;
          cursor: pointer; font-family: -apple-system, sans-serif;
          transition: background .1s; letter-spacing: -.1px; text-align: center;
        }
        .hd-btn-del:active { background: #fff0ef; }

        .hd-del-confirm { margin: 10px 16px 0; padding: 14px; background: #fff; border-radius: 14px; }
        .hd-del-text { font-size: 14px; color: #ff3b30; margin-bottom: 12px; line-height: 1.5; }
        .hd-del-btns { display: flex; gap: 8px; }
        .hd-del-no {
          flex: 1; border: none; background: rgba(118,118,128,.12);
          border-radius: 12px; padding: 12px;
          font-size: 15px; font-weight: 500; color: #3c3c43;
          cursor: pointer; font-family: -apple-system, sans-serif;
        }
        .hd-del-yes {
          flex: 1; border: none; background: #ff3b30; border-radius: 12px;
          padding: 12px; font-size: 15px; font-weight: 600; color: #fff;
          cursor: pointer; font-family: -apple-system, sans-serif; transition: opacity .1s;
        }
        .hd-del-yes:disabled { opacity: .5; }
      `}</style>

      <div className="hd-page">

        {/* ── HEADER ── */}
        <div className="hd-header">
          <div className="hd-header-left">
            <h1>Osoby</h1>
            <p>
              {people.length === 0
                ? "brak osób"
                : `${people.length} ${people.length === 1 ? "zapisana osoba" : people.length < 5 ? "zapisane osoby" : "zapisanych osób"}`
              }
            </p>
          </div>
          <button className="hd-add-btn" onClick={openAdd} aria-label="Dodaj osobę">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
            </svg>
          </button>
        </div>

        {/* ── SEARCH ── */}
        <div className="hd-search">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="8.5" cy="8.5" r="5.5"/><line x1="12.5" y1="12.5" x2="17" y2="17"/>
          </svg>
          <input
            placeholder="Szukaj..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="hd-search-clear" onClick={() => setSearch("")} aria-label="Wyczyść">✕</button>
          )}
        </div>

        {/* ── FILTER TABS ── */}
        <div className="hd-tabs">
          {TABS.map(t => (
            <button
              key={t.value}
              className={`hd-tab ${filterRel === t.value ? "on" : ""}`}
              onClick={() => setFilterRel(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TOP AI CHIP — only if upcoming birthday ── */}
        {firstUpcoming && !search && (
          <div className="hd-ai-chip">
            <span className="hd-ai-glyph">✦</span>
            <span className="hd-ai-text">
              <strong>{firstUpcoming.name}</strong>{" "}
              {getDaysUntilBirthday(firstUpcoming.birthday) === 0
                ? "ma dziś urodziny 🎉"
                : `ma urodziny za ${getDaysUntilBirthday(firstUpcoming.birthday)} dni.`
              }
            </span>
          </div>
        )}

        {/* ── PEOPLE LIST — clean, no AI chips inside ── */}
        <div className="hd-list">
          {loading && (
            <div className="hd-loading">Ładowanie...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="hd-empty">
              <div className="hd-empty-glyph">👤</div>
              <div className="hd-empty-title">
                {search ? "Brak wyników" : "Dodaj pierwszą osobę"}
              </div>
              <div className="hd-empty-sub">
                {search
                  ? `Nic nie pasuje do „${search}"`
                  : "Zapisuj wspomnienia i ważne chwile o bliskich."}
              </div>
            </div>
          )}

          {filtered.map(person => {
            const rel         = getRelation(person.relation);
            const days        = getDaysUntilBirthday(person.birthday);
            const ins         = insights[person.id];
            const memCount    = ins?.memoryCount ?? 0;
            const lastMem     = formatRelativeDate(ins?.lastMemoryAt);

            // Metadata line — relation · birthday or memories
            const metaParts: React.ReactNode[] = [
              <span key="rel">{rel.label}</span>,
            ];
            if (days !== null) {
              metaParts.push(<span key="s1" className="sep">·</span>);
              if (days === 0) {
                metaParts.push(<span key="bd" className="bsoon">urodziny dziś 🎉</span>);
              } else if (days <= 14) {
                metaParts.push(<span key="bd" className="bsoon">ur. za {days} dni</span>);
              } else {
                metaParts.push(<span key="bd">ur. za {days} dni</span>);
              }
            } else if (memCount > 0) {
              metaParts.push(<span key="s2" className="sep">·</span>);
              metaParts.push(
                <span key="mc">
                  {memCount} {memCount === 1 ? "wspomnienie" : memCount < 5 ? "wspomnienia" : "wspomnień"}
                </span>
              );
              if (lastMem) {
                metaParts.push(<span key="s3" className="sep">·</span>);
                metaParts.push(<span key="lm">{lastMem}</span>);
              }
            }

            return (
              <div key={person.id} className="hd-item">
                <div
                  className="hd-card"
                  onClick={() => router.push(`/person/${person.id}`)}
                >
                  <Avatar name={person.name} relation={person.relation} />

                  <div className="hd-card-body">
                    <div className="hd-card-name">{person.name}</div>
                    <div className="hd-card-meta">{metaParts}</div>
                  </div>

                  <div className="hd-card-actions">
                    {/* ✦ AI Insight */}
                    <button
                      className={`hd-insight-btn${loadingInsight === person.id ? " hd-insight-btn-loading" : ""}`}
                      onClick={e => { e.stopPropagation(); openInsight(person); }}
                      aria-label="AI Insight"
                    >
                      ✦
                    </button>
                    {/* Edit */}
                    <button
                      className="hd-icon-btn"
                      onClick={e => { e.stopPropagation(); openEdit(person); }}
                      aria-label="Edytuj"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 2l3 3-8 8H3v-3l8-8z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI INSIGHT SHEET (fixed overlay) ── */}
      {insightSheet && (
        <AiInsightSheet
          data={insightSheet}
          onClose={() => setInsightSheet(null)}
        />
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div
          className="hd-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="hd-modal">
            <div className="hd-modal-handle" />
            <div className="hd-modal-hdr">
              <div className="hd-modal-title">
                {modalMode === "add" ? "Nowa osoba" : "Edytuj osobę"}
              </div>
              <button className="hd-modal-close" onClick={closeModal} aria-label="Zamknij">✕</button>
            </div>

            <div className="hd-modal-body">
              <div className="hd-field">
                <label className="hd-label">Imię i nazwisko</label>
                <input
                  className="hd-input"
                  placeholder="np. Anna Kowalska"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="hd-field">
                <label className="hd-label">Data urodzin (opcjonalnie)</label>
                <input
                  className="hd-input"
                  type="date"
                  value={formBirthday}
                  onChange={e => setFormBirthday(e.target.value)}
                />
              </div>

              <div className="hd-field">
                <label className="hd-label">Relacja</label>
                <div className="hd-rel-grid">
                  {RELATIONS.map(r => (
                    <button
                      key={r.value}
                      className={`hd-rel-btn ${formRelation === r.value ? "on" : ""}`}
                      onClick={() => setFormRelation(r.value)}
                    >
                      <div className="hd-rel-av" style={{ background: r.bg, color: r.text }}>
                        {r.label.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="hd-rel-label">{r.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="hd-modal-actions">
              <button className="hd-btn-cancel" onClick={closeModal}>Anuluj</button>
              <button
                className="hd-btn-save"
                onClick={savePerson}
                disabled={!formName.trim() || saving}
              >
                {saving ? "Zapisuję..." : modalMode === "add" ? "Dodaj" : "Zapisz"}
              </button>
            </div>

            {modalMode === "edit" && editingId && (
              deleteConfirm !== editingId ? (
                <button className="hd-btn-del" onClick={() => setDeleteConfirm(editingId)}>
                  Usuń osobę
                </button>
              ) : (
                <div className="hd-del-confirm">
                  <div className="hd-del-text">
                    Usunąć {formName}? Tej operacji nie można cofnąć.
                  </div>
                  <div className="hd-del-btns">
                    <button className="hd-del-no" onClick={() => setDeleteConfirm(null)}>Anuluj</button>
                    <button
                      className="hd-del-yes"
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