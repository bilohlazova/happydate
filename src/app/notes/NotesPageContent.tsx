"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ═══════════════════ TYPES ═══════════════════ */

type Person = {
  id: string;
  name: string;
  relation: string | null;
};

type Memory = {
  id: string;
  content_text: string | null;
  created_at: string;
  person_id: string | null;
  images: string[] | null;
};

/* ═══════════════════ HELPERS ═══════════════════ */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ═══════════════════ VOICE HOOK ═══════════════════ */
// Спочатку пробує @capacitor-community/speech-recognition (iOS нативний),
// якщо недоступний — fallback на Web Speech API (браузер/Chrome)

function useVoice(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const start = useCallback(async () => {
    // ── Capacitor (iOS/Android native) ──────────────────
    try {
      const mod = await import("@capacitor-community/speech-recognition");
      const SR  = mod.SpeechRecognition;

      const avail = await SR.available();
      if (!avail.available) throw new Error("not available");

      const perm = await SR.requestPermissions();
      if (
        (perm as unknown as Record<string, string>).speechRecognition !== "granted" ||
        (perm as unknown as Record<string, string>).microphone !== "granted"
      ) {
        alert("Brak uprawnień do mikrofonu. Zezwól w Ustawieniach.");
        return;
      }

      setListening(true);

      await SR.start({ language: "pl-PL", maxResults: 1, partialResults: true, popup: false });

      const handle = await SR.addListener(
        "partialResults",
        (data: { matches?: string[] }) => {
          const text = data.matches?.[0];
          if (text) {
            onResult(text);
            void SR.stop();
            handle.remove();
            setListening(false);
            stopRef.current = null;
          }
        }
      );

      stopRef.current = () => {
        handle.remove();
        void SR.stop();
        setListening(false);
        stopRef.current = null;
      };

      return; // Capacitor OK — не йдемо у fallback
    } catch {
      // Capacitor недоступний або помилка — використовуємо Web Speech
    }

    // ── Web Speech API (Safari desktop / Chrome) ────────
    const W = window as unknown as {
      SpeechRecognition?: new () => SpeechRecLike;
      webkitSpeechRecognition?: new () => SpeechRecLike;
    };

    interface SpeechRecLike {
      lang: string; continuous: boolean; interimResults: boolean;
      start(): void; stop(): void;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    }

    const SR2 = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR2) {
      alert("Nagrywanie głosu wymaga aplikacji mobilnej lub przeglądarki Chrome.");
      return;
    }

    const rec = new SR2();
    rec.lang = "pl-PL";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => onResult(e.results[0][0].transcript);
    rec.onend    = () => { setListening(false); stopRef.current = null; };
    rec.onerror  = () => { setListening(false); stopRef.current = null; };
    rec.start();
    setListening(true);
    stopRef.current = () => { rec.stop(); setListening(false); };
  }, [onResult]);

  const stop = useCallback(() => {
    stopRef.current?.();
  }, []);

  return { listening, start, stop };
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */

export default function NotesPageContent() {
  const [memories,       setMemories]       = useState<Memory[]>([]);
  const [people,         setPeople]         = useState<Person[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [editingMemory,  setEditingMemory]  = useState<Memory | null>(null);
  const [filterPersonId, setFilterPersonId] = useState<string>("all");

  const [noteText,       setNoteText]       = useState("");
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [photoFiles,     setPhotoFiles]     = useState<File[]>([]);
  const [photoPreviews,  setPhotoPreviews]  = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const appendTranscript = useCallback((text: string) => {
    setNoteText(prev => prev ? prev + " " + text : text);
  }, []);

  const { listening, start: startVoice, stop: stopVoice } = useVoice(appendTranscript);

  /* ── Load ── */
  const loadPeople = useCallback(async () => {
    const { data } = await supabase.from("people").select("id, name, relation").order("name");
    setPeople(data ?? []);
  }, []);

  const loadMemories = useCallback(async () => {
    const { data } = await supabase
      .from("memories").select("*")
      .order("created_at", { ascending: false });
    setMemories(data ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPeople(), loadMemories()]);
      setLoading(false);
    })();
  }, [loadPeople, loadMemories]);

  /* ── Photo ── */
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotoFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removePhoto(idx: number) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  function removeExistingPhoto(url: string) {
    setExistingImages(prev => prev.filter(u => u !== url));
  }

  async function uploadPhotos(userId: string): Promise<string[]> {
    if (!photoFiles.length) return [];
    setUploadProgress(true);
    const urls: string[] = [];
    for (const file of photoFiles) {
      const ext  = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("memory-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("memory-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setUploadProgress(false);
    return urls;
  }

  /* ── Modal ── */
  function openNew() {
    setEditingMemory(null);
    setNoteText(""); setSelectedPerson("");
    setPhotoFiles([]); setPhotoPreviews([]); setExistingImages([]);
    setShowModal(true);
  }

  function openEdit(m: Memory) {
    setEditingMemory(m);
    setNoteText(m.content_text ?? "");
    setSelectedPerson(m.person_id ?? "");
    setPhotoFiles([]); setPhotoPreviews([]);
    setExistingImages(m.images ?? []);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingMemory(null);
    stopVoice();
  }

  /* ── Save ── */
  async function saveMemory() {
    if (!noteText.trim()) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setSaving(false); return; }

    const newUrls   = await uploadPhotos(auth.user.id);
    const allImages = [...existingImages, ...newUrls];

    const payload = {
      content_text: noteText.trim(),
      person_id:    selectedPerson || null,
      images:       allImages.length ? allImages : null,
    };

    if (editingMemory) {
      await supabase.from("memories").update(payload).eq("id", editingMemory.id);
    } else {
      await supabase.from("memories").insert({ ...payload, user_id: auth.user.id });
    }

    setSaving(false);
    closeModal();
    loadMemories();
  }

  /* ── Delete ── */
  async function deleteMemory(id: string) {
    if (!confirm("Usunąć notatkę?")) return;
    await supabase.from("memories").delete().eq("id", id);
    loadMemories();
  }

  /* ── Filter ── */
  const filtered = filterPersonId === "all"
    ? memories
    : filterPersonId === "none"
      ? memories.filter(m => !m.person_id)
      : memories.filter(m => m.person_id === filterPersonId);

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .np-root { font-family:'Plus Jakarta Sans',sans-serif; min-height:100svh; background:#f8f7ff; padding-bottom:100px; }

        .np-header { padding:20px 16px 0; }
        .np-header-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:4px; }
        .np-title { font-size:26px; font-weight:800; color:#1a1040; letter-spacing:-0.5px; }
        .np-count-pill { background:linear-gradient(135deg,#a78bfa,#ec4899); color:#fff; font-size:13px; font-weight:700; padding:4px 14px; border-radius:20px; box-shadow:0 2px 8px rgba(167,139,250,.35); }
        .np-subtitle { font-size:13px; color:#7c6f9f; margin-bottom:16px; }
        .np-add-btn { display:flex; align-items:center; gap:6px; background:linear-gradient(135deg,#7c3aed,#ec4899); color:#fff; border:none; cursor:pointer; padding:10px 18px; border-radius:14px; font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; font-weight:700; box-shadow:0 4px 14px rgba(124,58,237,.35); transition:transform .15s; white-space:nowrap; flex-shrink:0; }
        .np-add-btn:active { transform:scale(.96); }

        .np-filters { display:flex; gap:8px; padding:0 16px 14px; overflow-x:auto; scrollbar-width:none; }
        .np-filters::-webkit-scrollbar { display:none; }
        .np-filter-chip { flex-shrink:0; border:1.5px solid #e8e3f5; background:#fff; border-radius:20px; padding:5px 14px; font-size:12px; font-weight:600; color:#7c6f9f; cursor:pointer; transition:all .15s; font-family:'Plus Jakarta Sans',sans-serif; white-space:nowrap; }
        .np-filter-chip.active { background:#7c3aed; border-color:#7c3aed; color:#fff; box-shadow:0 2px 8px rgba(124,58,237,.3); }

        .np-list { padding:0 16px; display:flex; flex-direction:column; gap:12px; }

        /* Card */
        .np-card { background:#fff; border-radius:20px; border:1.5px solid #ede9f8; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .np-card-body { padding:14px 16px; }
        .np-card-top { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .np-card-avatar { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#7c3aed; background:linear-gradient(135deg,#ede9fe,#fce7f3); flex-shrink:0; }
        .np-card-person { font-size:13px; font-weight:600; color:#7c3aed; }
        .np-card-date { font-size:11px; color:#b0a8cc; margin-left:auto; }
        .np-card-text { font-size:14px; color:#1a1040; line-height:1.6; white-space:pre-wrap; word-break:break-word; }

        /* Photo grid — простий <img> без next/image */
        .np-photo-grid { display:grid; gap:2px; margin-top:10px; border-radius:12px; overflow:hidden; }
        .np-photo-grid.g1 { grid-template-columns:1fr; }
        .np-photo-grid.g2 { grid-template-columns:1fr 1fr; }
        .np-photo-grid.g3 { grid-template-columns:1fr 1fr 1fr; }
        .np-photo-grid img { width:100%; height:160px; object-fit:cover; display:block; }
        .np-photo-grid.g1 img { height:220px; }

        .np-card-actions { display:flex; gap:8px; padding:10px 16px 14px; border-top:1px solid #f5f3ff; }
        .np-card-action-btn { flex:1; border:none; background:transparent; border-radius:10px; padding:8px; font-size:12px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all .15s; }
        .np-card-action-edit { color:#7c3aed; background:#f5f3ff; }
        .np-card-action-edit:active { background:#ede9fe; }
        .np-card-action-delete { color:#e53e3e; background:#fff5f5; }
        .np-card-action-delete:active { background:#ffe4e4; }

        .np-empty { text-align:center; padding:48px 24px; }
        .np-empty-icon { font-size:52px; margin-bottom:12px; }
        .np-empty-title { font-size:16px; font-weight:700; color:#1a1040; margin-bottom:6px; }
        .np-empty-sub { font-size:13px; color:#7c6f9f; line-height:1.5; }

        /* Modal — overlay скролить, модалка фіксованої ширини */
        .np-overlay {
          position: fixed; inset: 0;
          background: rgba(10,5,30,.6);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 60px 16px 40px;
          z-index: 200;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: npFadeIn .2s ease;
          /* ключове: скрол на overlay, не на сторінці */
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        @keyframes npFadeIn { from{opacity:0} to{opacity:1} }

        .np-modal {
          background: #fff;
          border-radius: 24px;
          padding: 24px 20px 28px;
          width: 100%;
          max-width: 480px;
          /* не ставимо max-height — нехай росте, overlay скролить */
          animation: npPop .25s cubic-bezier(.34,1.3,.64,1);
          position: relative;
          flex-shrink: 0; /* важливо щоб не стискався */
        }
        @keyframes npPop { from{opacity:0;transform:scale(.92) translateY(-10px)} to{opacity:1;transform:scale(1) translateY(0)} }

        .np-modal-close { position:absolute; top:16px; right:16px; width:32px; height:32px; border-radius:50%; background:#f1eeff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; color:#7c6f9f; }
        .np-modal-title { font-size:20px; font-weight:800; color:#1a1040; margin-bottom:18px; padding-right:40px; }

        .np-field { margin-bottom:14px; }
        .np-label { font-size:12px; font-weight:700; color:#7c6f9f; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; display:block; }

        .np-textarea { width:100%; border:1.5px solid #e8e3f5; border-radius:14px; padding:12px 14px; font-size:15px; font-family:'Plus Jakarta Sans',sans-serif; color:#1a1040; background:#f8f7ff; outline:none; resize:none; min-height:90px; max-height:200px; overflow-y:auto; transition:border-color .15s; box-sizing:border-box; }
        .np-textarea:focus { border-color:#7c3aed; background:#fff; }

        .np-voice-row { display:flex; gap:8px; align-items:center; margin-bottom:14px; }
        .np-voice-btn { display:flex; align-items:center; gap:6px; border:1.5px solid #e8e3f5; background:#f8f7ff; border-radius:12px; padding:9px 14px; font-size:13px; font-weight:700; color:#7c6f9f; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all .15s; flex-shrink:0; }
        .np-voice-btn.active { border-color:#ec4899; background:#fce7f3; color:#be185d; }
        .np-voice-pulse { width:8px; height:8px; border-radius:50%; background:#ec4899; animation:npPulse 1s ease infinite; flex-shrink:0; }
        @keyframes npPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }

        .np-photo-upload-btn { display:flex; align-items:center; gap:8px; border:1.5px dashed #c4b5f8; background:#f8f7ff; border-radius:12px; padding:10px 14px; font-size:13px; font-weight:600; color:#7c3aed; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all .15s; width:100%; justify-content:center; box-sizing:border-box; }
        .np-photo-upload-btn:active { background:#ede9fe; }

        .np-preview-grid { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
        .np-preview-item { position:relative; width:72px; height:72px; border-radius:10px; overflow:hidden; flex-shrink:0; }
        .np-preview-item img { width:100%; height:100%; object-fit:cover; display:block; }
        .np-preview-remove { position:absolute; top:2px; right:2px; width:18px; height:18px; border-radius:50%; background:rgba(0,0,0,.6); color:#fff; border:none; cursor:pointer; font-size:10px; display:flex; align-items:center; justify-content:center; line-height:1; padding:0; }

        .np-select { width:100%; border:1.5px solid #e8e3f5; border-radius:14px; padding:12px 14px; font-size:15px; font-family:'Plus Jakarta Sans',sans-serif; color:#1a1040; background:#f8f7ff; outline:none; appearance:none; box-sizing:border-box; }
        .np-select:focus { border-color:#7c3aed; }

        .np-modal-actions { display:flex; gap:10px; margin-top:20px; }
        .np-btn-cancel { flex:1; border:1.5px solid #e8e3f5; background:#f8f7ff; border-radius:14px; padding:13px; font-size:15px; font-weight:700; color:#7c6f9f; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .np-btn-save { flex:2; border:none; background:linear-gradient(135deg,#7c3aed,#ec4899); border-radius:14px; padding:13px; font-size:15px; font-weight:700; color:#fff; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; box-shadow:0 4px 14px rgba(124,58,237,.3); transition:all .15s; }
        .np-btn-save:disabled { opacity:.6; cursor:not-allowed; }
        .np-btn-save:active:not(:disabled) { transform:scale(.97); }
      `}</style>

      <div className="np-root">

        <div className="np-header">
          <div className="np-header-top">
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:2 }}>
                <h1 className="np-title">📝 Notatki</h1>
                <span className="np-count-pill">{memories.length}</span>
              </div>
              <p className="np-subtitle">Wspomnienia i myśli w jednym miejscu</p>
            </div>
            <button className="np-add-btn" onClick={openNew}>＋ Dodaj</button>
          </div>
        </div>

        <div className="np-filters">
          <button className={`np-filter-chip ${filterPersonId==="all"?"active":""}`} onClick={() => setFilterPersonId("all")}>Wszystkie</button>
          <button className={`np-filter-chip ${filterPersonId==="none"?"active":""}`} onClick={() => setFilterPersonId("none")}>📓 Moje</button>
          {people.map(p => (
            <button key={p.id} className={`np-filter-chip ${filterPersonId===p.id?"active":""}`} onClick={() => setFilterPersonId(p.id)}>
              {p.name}
            </button>
          ))}
        </div>

        <div className="np-list">
          {loading && <div style={{ textAlign:"center", padding:40, color:"#b0a8cc", fontSize:14 }}>Ładowanie...</div>}

          {!loading && filtered.length === 0 && (
            <div className="np-empty">
              <div className="np-empty-icon">📝</div>
              <div className="np-empty-title">Brak notatek</div>
              <div className="np-empty-sub">Dodaj pierwszą notatkę — tekstem, zdjęciem lub głosem ✨</div>
            </div>
          )}

          {filtered.map(memory => {
            const person = people.find(p => p.id === memory.person_id);
            const imgs   = (memory.images ?? []).slice(0, 3);
            const gc     = imgs.length === 1 ? "g1" : imgs.length === 2 ? "g2" : "g3";

            return (
              <div key={memory.id} className="np-card">
                <div className="np-card-body">
                  <div className="np-card-top">
                    {person ? (
                      <>
                        <div className="np-card-avatar">{getInitials(person.name)}</div>
                        <span className="np-card-person">{person.name}</span>
                      </>
                    ) : (
                      <>
                        <div className="np-card-avatar" style={{ fontSize:16 }}>📓</div>
                        <span className="np-card-person" style={{ color:"#7c6f9f" }}>Moja notatka</span>
                      </>
                    )}
                    <span className="np-card-date">{formatDate(memory.created_at)}</span>
                  </div>

                  {memory.content_text && (
                    <div className="np-card-text">{memory.content_text}</div>
                  )}

                  {imgs.length > 0 && (
                    <div className={`np-photo-grid ${gc}`}>
                      {imgs.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt="" loading="lazy" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="np-card-actions">
                  <button className="np-card-action-btn np-card-action-edit" onClick={() => openEdit(memory)}>✏️ Edytuj</button>
                  <button className="np-card-action-btn np-card-action-delete" onClick={() => deleteMemory(memory.id)}>🗑️ Usuń</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="np-overlay" onClick={e => { if (e.target===e.currentTarget) closeModal(); }}>
          <div className="np-modal">
            <button className="np-modal-close" onClick={closeModal}>✕</button>
            <div className="np-modal-title">
              {editingMemory ? "Edytuj notatkę ✏️" : "Nowa notatka ✨"}
            </div>

            <div className="np-field">
              <label className="np-label">Treść notatki</label>
              <textarea
                className="np-textarea"
                placeholder="Co chcesz zapamiętać?"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="np-voice-row">
              <button
                className={`np-voice-btn ${listening?"active":""}`}
                onClick={listening ? stopVoice : startVoice}
              >
                {listening
                  ? <><div className="np-voice-pulse"/> Zatrzymaj</>
                  : <>🎙️ Nagraj głosowo</>
                }
              </button>
              {listening && <span style={{ fontSize:12, color:"#be185d", fontWeight:600 }}>Mówisz...</span>}
            </div>

            <div className="np-field">
              <label className="np-label">Zdjęcia (opcjonalnie)</label>

              {existingImages.length > 0 && (
                <div className="np-preview-grid">
                  {existingImages.map((url, i) => (
                    <div key={i} className="np-preview-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" />
                      <button className="np-preview-remove" onClick={() => removeExistingPhoto(url)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {photoPreviews.length > 0 && (
                <div className="np-preview-grid">
                  {photoPreviews.map((src, i) => (
                    <div key={i} className="np-preview-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                      <button className="np-preview-remove" onClick={() => removePhoto(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <button className="np-photo-upload-btn" onClick={() => fileInputRef.current?.click()}>
                📷 Dodaj zdjęcie
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display:"none" }}
                onChange={handlePhotoChange}
              />
            </div>

            <div className="np-field">
              <label className="np-label">Dotyczy osoby (opcjonalnie)</label>
              <select className="np-select" value={selectedPerson} onChange={e => setSelectedPerson(e.target.value)}>
                <option value="">📓 Moja notatka (bez osoby)</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="np-modal-actions">
              <button className="np-btn-cancel" onClick={closeModal}>Anuluj</button>
              <button
                className="np-btn-save"
                onClick={saveMemory}
                disabled={!noteText.trim() || saving || uploadProgress}
              >
                {saving || uploadProgress ? "Zapisywanie..." : editingMemory ? "Zapisz zmiany →" : "Dodaj notatkę →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}