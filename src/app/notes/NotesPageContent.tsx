"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import MemoryEditorSheet from "@/components/notes/MemoryEditorSheet";
import type { MemoryEditorSubmitInput } from "@/components/notes/MemoryEditorSheet";
import NoteMemoryCard from "@/components/notes/NoteMemoryCard";
import {
  createMemoryImageSignedUrls,
  createMemoryAudioSignedUrl,
  deleteMemoryImageObjects,
  deleteMemoryAudioObject,
  createNotesMemory,
  deleteMemory as deleteMemoryRecord,
  filterMemories,
  getCurrentMemoryUserId,
  getNotesMemoryPeople,
  getNotesMemoryEvents,
  listMemories,
  updateNotesMemory,
  uploadMemoryImages,
  uploadMemoryAudio,
} from "@/lib/repositories/memoryRepository";
import type { UploadMemoryImagesResult } from "@/lib/repositories/memoryRepository";
import type {
  NotesMemoryPerson,
  NotesMemoryEvent,
  NotesMemoryRow,
  NotesPrimaryFilter,
} from "@/lib/repositories/memory.types";
import {
  getNotesPrimaryFilterCounts,
  NOTES_PRIMARY_FILTER_OPTIONS,
} from "@/lib/repositories/memory.types";
import { NOTES_TYPE_OPTIONS } from "@/lib/memories/notesMemoryTypes";
import {
  buildMemoryEditorCreateFields,
  buildMemoryEditorUpdatePatch,
} from "@/lib/memories/notesMemoryTypes";
import type { NotesRawType } from "@/lib/memories/notesMemoryTypes";

// ─────────────────────────────────────────────
// TYPES — match real Supabase memories schema
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function NotesPageContent() {
  const t = useTranslations("notes");
  const [memories,       setMemories]       = useState<NotesMemoryRow[]>([]);
  const [people,         setPeople]         = useState<NotesMemoryPerson[]>([]);
  const [events,         setEvents]         = useState<NotesMemoryEvent[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [loadError,      setLoadError]      = useState(false);
  const [mutationError,  setMutationError]  = useState<string | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [isOnline,       setIsOnline]       = useState(true);
  const [primaryFilter,  setPrimaryFilter]  = useState<NotesPrimaryFilter>("all");
  const [filterPersonId, setFilterPersonId] = useState<string>("all");

  // 3-dot context menu
  const [menuOpenId,     setMenuOpenId]     = useState<string | null>(null);

  // Lightbox
  const [lightboxUrls,   setLightboxUrls]   = useState<string[]>([]);
  const [lightboxIdx,    setLightboxIdx]    = useState(0);

  // Modal (bottom sheet)
  const [showTypeSheet,  setShowTypeSheet]  = useState(false);
  const [showModal,      setShowModal]      = useState(false);
  const [editingMemory,  setEditingMemory]  = useState<NotesMemoryRow | null>(null);
  const [selectedNewType, setSelectedNewType] = useState<NotesRawType>("note");
  const [imageDisplayUrls, setImageDisplayUrls] = useState<Record<string, string>>({});
  const [audioDisplayUrls, setAudioDisplayUrls] = useState<Record<string, string>>({});
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const typeSheetFirstOptionRef = useRef<HTMLButtonElement>(null);

  // ── Search ──
  const [search, setSearch] = useState("");

  // ── Load ──
  const loadPeople = useCallback(async () => {
    setPeople(await getNotesMemoryPeople());
  }, []);

  const loadEvents = useCallback(async () => {
    const userId = await getCurrentMemoryUserId();
    if (!userId) return;
    setEvents(await getNotesMemoryEvents(userId));
  }, []);

  const loadMemories = useCallback(async () => {
    const userId = await getCurrentMemoryUserId();
    if (!userId) return;
    const rows = await listMemories({ userId });
    const storedImageValues = rows.flatMap((memory) => memory.images ?? []);
    const resolvedImages = await createMemoryImageSignedUrls(storedImageValues);
    const resolvedAudio = await Promise.all(rows.map(async (memory) => ({
      id: memory.id,
      signedUrl: await createMemoryAudioSignedUrl(memory.audio_url),
    })));
    const displayUrls: Record<string, string> = {};

    for (const image of resolvedImages) {
      if (image.signedUrl) {
        displayUrls[image.originalValue] = image.signedUrl;
      }
    }

    setImageDisplayUrls(displayUrls);
    setAudioDisplayUrls(Object.fromEntries(
      resolvedAudio.flatMap((audio) => audio.signedUrl ? [[audio.id, audio.signedUrl]] : []),
    ));
    setMemories(rows);
  }, []);

  const refreshNotes = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      await Promise.all([loadPeople(), loadEvents(), loadMemories()]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [loadEvents, loadPeople, loadMemories]);

  useEffect(() => { void refreshNotes(); }, [refreshNotes]);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    if (!showTypeSheet) return;
    typeSheetFirstOptionRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowTypeSheet(false);
      addButtonRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showTypeSheet]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft" && lightboxUrls.length > 1) lbPrev();
      if (event.key === "ArrowRight" && lightboxUrls.length > 1) lbNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // ── Filter + Search ──
  // Search matches: note text, person name, ai_tags
  const q = search.trim().toLowerCase();
  const filtered = filterMemories({
    memories,
    people,
    events,
    primaryFilter,
    personId: filterPersonId,
    search,
  });
  const primaryFilterCounts = getNotesPrimaryFilterCounts(memories);
  const emptyStateKeys = {
    all: "states.emptyAll", people: "states.emptyPeople", memory: "states.emptyMemory",
    gift: "states.emptyGift", journal: "states.emptyJournal", note: "states.emptyNote",
  } as const;

  // ── AI Insights — computed from real data, no hallucinations ──
  // Only show when not searching and not filtering by person
  const showAiSection =
    !q &&
    primaryFilter === "all" &&
    filterPersonId === "all" &&
    memories.length >= 2;

  // Top person by memory count
  const personMemCounts: Record<string, number> = {};
  for (const m of memories) {
    if (m.person_id) personMemCounts[m.person_id] = (personMemCounts[m.person_id] ?? 0) + 1;
  }
  const topPersonId = Object.entries(personMemCounts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? null;
  const topPerson   = people.find(p => p.id === topPersonId);

  // Most frequent tag across all memories
  const tagFreq: Record<string, number> = {};
  for (const m of memories) {
    for (const t of (m.ai_tags ?? [])) {
      tagFreq[t.toLowerCase()] = (tagFreq[t.toLowerCase()] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagFreq).sort((a,b) => b[1]-a[1]).slice(0, 3).map(([t]) => t);

  // Count gift-related tags
  const giftKeywords = ["prezent","gift","podarunek","upominek"];
  const giftCount = memories.filter(m =>
    (m.ai_tags ?? []).some(t => giftKeywords.includes(t.toLowerCase())) ||
    giftKeywords.some(k => m.content_text?.toLowerCase().includes(k))
  ).length;

  // ── Modal ──
  function openNew(type: NotesRawType) {
    setEditingMemory(null);
    setSelectedNewType(type);
    setShowModal(true);
  }

  function openEdit(m: NotesMemoryRow) {
    setEditingMemory(m);
    setMenuOpenId(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingMemory(null);
  }

  async function saveMemory({ state, newFiles, audioFile }: MemoryEditorSubmitInput) {
    if (!navigator.onLine) throw new Error("OFFLINE");
    const userId = await getCurrentMemoryUserId();
    if (!userId) throw new Error("AUTH_REQUIRED");

    const uploadResult: UploadMemoryImagesResult = newFiles.length
      ? await uploadMemoryImages(newFiles)
      : { objectPaths: [], errors: [] };
    const allImages = [
      ...state.existingImages,
      ...uploadResult.objectPaths,
    ];
    const stateWithImages = {
      ...state,
      existingImages: allImages,
    };
    const uploadedAudio = audioFile ? await uploadMemoryAudio(audioFile) : null;
    if (uploadedAudio?.error || (audioFile && !uploadedAudio?.objectPath)) {
      if (uploadResult.objectPaths.length) await deleteMemoryImageObjects(uploadResult.objectPaths);
      throw new Error("AUDIO_UPLOAD_FAILED");
    }
    const nextAudioUrl = (uploadedAudio?.objectPath ?? state.audioUrl) || null;
    const previousAudioUrl = editingMemory?.audio_url ?? null;

    try {
      if (editingMemory) {
        await updateNotesMemory(
          editingMemory.id,
          { ...buildMemoryEditorUpdatePatch(stateWithImages), audioUrl: nextAudioUrl }
        );
      } else {
        await createNotesMemory({
          userId,
          ...buildMemoryEditorCreateFields(stateWithImages),
          audioUrl: nextAudioUrl,
        });
      }
    } catch (error) {
      if (uploadedAudio?.objectPath) await deleteMemoryAudioObject(uploadedAudio.objectPath);
      if (uploadResult.objectPaths.length) await deleteMemoryImageObjects(uploadResult.objectPaths);
      throw error;
    }

    if (previousAudioUrl && previousAudioUrl !== nextAudioUrl) {
      await deleteMemoryAudioObject(previousAudioUrl);
    }

    await loadMemories();
    const uploadErrors = uploadResult.errors.map((item) => item.error);
    if (uploadErrors.length === 0) {
      closeModal();
    }

    return { uploadErrors };
  }

  // ── Delete ──
  async function deleteMemory(memory: NotesMemoryRow) {
    setMenuOpenId(null);
    if (!window.confirm(t("actions.deleteConfirm"))) return;
    if (!navigator.onLine) {
      setMutationError(t("states.offlineAction"));
      return;
    }
    setDeletingId(memory.id);
    setMutationError(null);
    try {
      await deleteMemoryRecord(memory.id);
      if (memory.images?.length) await deleteMemoryImageObjects(memory.images);
      if (memory.audio_url) await deleteMemoryAudioObject(memory.audio_url);
      await loadMemories();
    } catch {
      setMutationError(t("states.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Lightbox ──
  const lightboxOpen  = lightboxUrls.length > 0;
  function openLightbox(urls: string[], idx: number) { setLightboxUrls(urls); setLightboxIdx(idx); }
  function closeLightbox() { setLightboxUrls([]); }
  function lbPrev() { setLightboxIdx(i => (i - 1 + lightboxUrls.length) % lightboxUrls.length); }
  function lbNext() { setLightboxIdx(i => (i + 1) % lightboxUrls.length); }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <>
      <style>{`
        /* ══════════════════════════════════════
           HAPPYDATE NOTES — same design system as People page
        ══════════════════════════════════════ */

        .hd-page {
          font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif;
          min-height: 100svh;
          background: #f2f2f7;
          padding-top: env(safe-area-inset-top);
          padding-bottom: calc(var(--hd-nav-height) + 24px + env(safe-area-inset-bottom));
          color: #000;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        /* ── Header ── */
        .hd-header {
          width: 100%;
          max-width: var(--hd-screen-max);
          margin: 0 auto;
          padding: 14px 16px 8px;
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 12px;
        }
        .hd-header-left h1 {
          font-size: clamp(30px, 8.5vw, 36px); font-weight: 750; color: #000;
          letter-spacing: 0; line-height: 1; margin: 0 0 3px;
        }
        .hd-header-left p { font-size: 13px; color: #aeaeb2; font-weight: 400; margin: 0; }

        .hd-add-btn {
          width: 40px; height: 40px; border-radius: 50%;
          background: #007aff;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,122,255,.32);
          transition: transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s;
          flex-shrink: 0; margin-bottom: 1px;
        }
        .hd-add-btn:active { transform: scale(.88); box-shadow: 0 2px 6px rgba(0,122,255,.2); }
        .hd-add-btn svg { width: 15px; height: 15px; color: #fff; }

        /* ── Filters ── */
        .hd-tabs {
          width: 100%;
          max-width: var(--hd-screen-max);
          margin: 0 auto;
          display: flex; gap: 7px; padding: 2px 16px 12px;
          overflow-x: auto; scrollbar-width: none;
        }
        .hd-tabs::-webkit-scrollbar { display: none; }
        .hd-tab {
          flex-shrink: 0; background: rgba(118,118,128,.12);
          border-radius: 22px; padding: 8px 14px;
          font-size: 13px; font-weight: 500; color: #3c3c43;
          border: none; cursor: pointer;
          font-family: -apple-system, sans-serif;
          transition: background .12s, color .12s, box-shadow .12s;
          letter-spacing: -.1px; min-height: 44px; white-space: nowrap;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .hd-tab.on {
          background: #007aff; color: #fff;
          box-shadow: 0 2px 8px rgba(0,122,255,.28);
        }
        .hd-tab-count {
          min-width: 19px; height: 19px; border-radius: 10px;
          padding: 0 5px; box-sizing: border-box;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(60,60,67,.12); color: #636366;
          font-size: 11px; font-variant-numeric: tabular-nums;
        }
        .hd-tab.on .hd-tab-count {
          background: rgba(255,255,255,.22); color: #fff;
        }
        .hd-person-filter {
          width: 100%; max-width: var(--hd-screen-max);
          margin: -2px auto 12px; padding: 0 16px;
          display: flex; align-items: center; gap: 9px;
        }
        .hd-person-filter label {
          flex-shrink: 0; font-size: 13px; font-weight: 600; color: #636366;
        }
        .hd-person-filter select {
          min-width: 0; width: min(100%, 230px); min-height: 44px;
          border: .5px solid rgba(60,60,67,.14); border-radius: 12px;
          background: #fff; color: #000; padding: 0 34px 0 12px;
          font: 500 14px -apple-system, sans-serif;
        }
        .hd-person-filter select:focus-visible {
          outline: 3px solid rgba(0,122,255,.25); outline-offset: 1px;
        }
        .hd-person-filter select:disabled { opacity: .48; }

        /* ── Notes feed — clean, no interruptions ── */
        .hd-feed {
          width: 100%;
          max-width: var(--hd-screen-max);
          margin: 0 auto;
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ── Memory card ── */
        .hd-card {
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
          border-left: 3px solid transparent;
        }
        .hd-card-memory { border-left-color: rgba(201,52,44,.28); }
        .hd-card-gift { border-left-color: rgba(168,95,0,.28); }
        .hd-card-journal { border-left-color: rgba(81,79,192,.24); background: #fdfdff; }

        .hd-card-body { padding: 14px 16px 12px; }

        .hd-card-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 9px;
        }

        .hd-card-kind {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 999px; padding: 4px 9px;
          font-size: .75rem; font-weight: 600; letter-spacing: -.05px;
          line-height: 1.25; min-width: 0;
        }

        .hd-card-title-row {
          display: flex; align-items: center; gap: 9px;
          min-width: 0; margin-bottom: 5px;
        }
        .hd-card-avatar {
          width: 28px; height: 28px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; flex-shrink: 0; letter-spacing: .3px;
        }
        .hd-card-title {
          min-width: 0; margin: 0; color: #111;
          font-size: 17px; line-height: 1.25; font-weight: 650;
          letter-spacing: -.25px; overflow-wrap: anywhere;
        }
        .hd-card-meta {
          display: flex; align-items: center; flex-wrap: wrap;
          min-width: 0; margin-bottom: 8px;
          color: #8e8e93; font-size: 12px; line-height: 1.4;
          overflow-wrap: anywhere;
        }
        .hd-card-meta-separator { margin: 0 6px; color: #c7c7cc; }

        /* Memory text */
        .hd-card-text {
          font-size: 15px; color: #1c1c1e; line-height: 1.55;
          white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word;
          letter-spacing: -.1px; margin-bottom: 0;
          display: -webkit-box; -webkit-box-orient: vertical;
          -webkit-line-clamp: 3; overflow: hidden;
        }
        .hd-card-text.is-fallback { color: #aeaeb2; font-style: italic; }

        /* AI tags */
        .hd-card-tags {
          display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px;
        }
        .hd-tag {
          font-size: 11px; font-weight: 500; color: #8e8e93;
          background: rgba(118,118,128,.1);
          padding: 3px 9px; border-radius: 20px; letter-spacing: -.05px;
        }

        /* 3-dot menu */
        .hd-card-menu-wrap { position: relative; margin: -8px -8px -8px auto; flex-shrink: 0; }
        .hd-card-menu-btn {
          width: 44px; height: 44px; border-radius: 12px;
          background: transparent; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #8e8e93; font-size: 18px; line-height: 1;
          transition: background .1s; font-family: -apple-system, sans-serif;
        }
        .hd-card-menu-btn:active { background: rgba(118,118,128,.12); }
        .hd-card-menu-btn:focus-visible,
        .hd-card-menu-item:focus-visible,
        .hd-card-image-button:focus-visible {
          outline: 3px solid rgba(0,122,255,.3); outline-offset: 1px;
        }
        .hd-card-menu-popup {
          position: absolute; right: 0; top: 44px;
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 8px 28px rgba(0,0,0,.14);
          overflow: hidden; z-index: 50; min-width: 150px;
          animation: hdPopIn .15s cubic-bezier(.34,1.3,.64,1);
        }
        @keyframes hdPopIn { from { opacity:0; transform: scale(.92) translateY(-4px); } to { opacity:1; transform: scale(1) translateY(0); } }
        .hd-card-menu-item {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; font-size: 15px; font-weight: 400;
          color: #000; cursor: pointer; border: none; background: transparent;
          font-family: -apple-system, sans-serif; width: 100%; text-align: left;
          border-bottom: .5px solid rgba(60,60,67,.1); letter-spacing: -.1px;
        }
        .hd-card-menu-item:last-child { border-bottom: none; }
        .hd-card-menu-item:active { background: #f2f2f7; }
        .hd-card-menu-item.danger { color: #ff3b30; }

        /* ── Compact image previews ── */
        .hd-card-images {
          display: grid; grid-template-columns: 1fr;
          gap: 3px; margin: 0 12px 12px;
          border-radius: 14px; overflow: hidden;
          aspect-ratio: 16 / 7;
        }
        .hd-card-images.is-grid { grid-template-columns: 1fr 1fr; aspect-ratio: 16 / 6; }
        .hd-card-image-button {
          position: relative; display: block; width: 100%; min-width: 0;
          height: 100%; padding: 0; border: 0; background: #e5e5ea;
          cursor: pointer; overflow: hidden;
        }
        .hd-card-image-button[hidden] { display: none; }
        .hd-card-image-button img {
          width: 100%; height: 100%; display: block;
          object-fit: cover; transition: opacity .1s;
        }
        .hd-card-image-button:active img { opacity: .82; }
        .hd-card-image-more {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.38); color: #fff;
          font-size: 18px; font-weight: 650;
        }

        /* ── Loading / Empty ── */
        .hd-loading { text-align: center; padding: 52px 28px; color: #aeaeb2; font-size: 14px; }
        .hd-status-banner {
          width: calc(100% - 32px); max-width: calc(var(--hd-screen-max) - 32px);
          margin: 0 auto 12px; border-radius: 14px; padding: 12px 14px;
          font-size: 14px; line-height: 1.4; color: #6b4300; background: #fff4d6;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .hd-status-banner.is-error { color: #9b1c17; background: #fff0ef; }
        .hd-status-retry { border: 0; background: transparent; color: #007aff; font: inherit; font-weight: 650; padding: 8px; cursor: pointer; }
        .hd-empty { text-align: center; padding: 72px 28px; }
        .hd-empty-glyph { font-size: 38px; margin-bottom: 14px; opacity: .25; }
        .hd-empty-title { font-size: 17px; font-weight: 600; color: #000; margin-bottom: 6px; letter-spacing: -.2px; }
        .hd-empty-sub { font-size: 15px; color: #8e8e93; line-height: 1.5; }

        /* ══════════════════════════════════════
           LIGHTBOX
        ══════════════════════════════════════ */

        .hd-lightbox {
          position: fixed; inset: 0; z-index: 600;
          background: rgba(0,0,0,.92);
          display: flex; align-items: center; justify-content: center;
          animation: hdFadeIn .18s ease;
        }
        @keyframes hdFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes hdSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .hd-lightbox-img {
          max-width: 100%; max-height: 80svh; object-fit: contain;
          border-radius: 6px; user-select: none;
        }
        .hd-lightbox-close {
          position: absolute;
          top: calc(env(safe-area-inset-top) + 16px); right: 16px;
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,.2); border: none; cursor: pointer;
          color: #fff; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
        }
        .hd-lightbox-nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(255,255,255,.15); border: none; cursor: pointer;
          color: #fff; font-size: 22px;
          display: flex; align-items: center; justify-content: center;
        }
        .hd-lightbox-nav:active { background: rgba(255,255,255,.28); }
        .hd-lb-prev { left: 12px; }
        .hd-lb-next { right: 12px; }
        .hd-lightbox-counter {
          position: absolute;
          bottom: calc(env(safe-area-inset-bottom) + 20px);
          left: 50%; transform: translateX(-50%);
          color: rgba(255,255,255,.6); font-size: 13px; font-weight: 500;
          font-family: -apple-system, sans-serif;
        }

        /* ══════════════════════════════════════
           ADD / EDIT BOTTOM SHEET
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
          max-height: 92svh; overflow: hidden;
          display: flex; flex-direction: column;
        }
        .hd-type-sheet {
          background: #f2f2f7;
          border-radius: 20px 20px 0 0;
          width: 100%; max-width: 480px;
          padding: 0 16px calc(18px + env(safe-area-inset-bottom));
          animation: hdSlideUp .3s cubic-bezier(.32,.72,0,1);
          box-sizing: border-box;
        }
        .hd-type-sheet-title {
          font-size: 18px; font-weight: 650; color: #000;
          letter-spacing: -.2px; margin: 14px 0 12px;
        }
        .hd-type-options {
          background: #fff; border-radius: 14px; overflow: hidden;
        }
        .hd-type-option {
          width: 100%; min-height: 52px; border: none;
          border-bottom: .5px solid rgba(60,60,67,.12);
          background: #fff; padding: 0 15px;
          display: flex; align-items: center; gap: 12px;
          color: #000; font-size: 16px; font-weight: 500;
          font-family: -apple-system, sans-serif; cursor: pointer;
          text-align: left;
        }
        .hd-type-option:last-child { border-bottom: none; }
        .hd-type-option:active { background: #f2f2f7; }
        .hd-type-option-icon { width: 28px; text-align: center; font-size: 20px; }
        .hd-modal-handle {
          width: 36px; height: 5px; border-radius: 3px;
          background: rgba(60,60,67,.22); margin: 10px auto 0;
        }
        .hd-modal-hdr {
          padding: 14px 16px 12px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0; gap: 12px;
        }
        .hd-modal-heading { min-width: 0; }
        .hd-modal-title { font-size: 17px; font-weight: 650; color: #000; letter-spacing: -.2px; }
        .hd-modal-subtitle {
          margin-top: 3px; color: #8e8e93; font-size: 13px;
          line-height: 1.35; overflow-wrap: anywhere;
        }
        .hd-modal-close {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(118,118,128,.18); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #636366; font-size: 12px;
          font-family: -apple-system, sans-serif; flex-shrink: 0;
        }
        .hd-modal-body {
          padding: 0 16px; min-height: 0;
          overflow-y: auto; overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }

        .hd-field { margin-bottom: 12px; }
        .hd-label {
          font-size: 12px; font-weight: 600; color: #8e8e93;
          text-transform: uppercase; letter-spacing: .06em;
          margin-bottom: 6px; display: block; padding-left: 2px;
        }
        .hd-textarea {
          width: 100%; border: none; border-radius: 12px;
          padding: 13px 15px; font-size: 16px;
          font-family: -apple-system, sans-serif; color: #000;
          background: #fff; outline: none; resize: none;
          min-height: 110px; max-height: 220px; overflow-y: auto;
          box-sizing: border-box; letter-spacing: -.1px; line-height: 1.55;
          transition: box-shadow .15s;
        }
        .hd-textarea:focus { box-shadow: 0 0 0 3px rgba(0,122,255,.15); }

        .hd-input {
          width: 100%; min-height: 46px; border: none; border-radius: 12px;
          padding: 11px 15px; font-size: 16px;
          font-family: -apple-system, sans-serif; color: #000;
          background: #fff; outline: none; box-sizing: border-box;
          letter-spacing: -.1px; transition: box-shadow .15s;
        }
        .hd-input:focus { box-shadow: 0 0 0 3px rgba(0,122,255,.15); }
        .hd-input[aria-invalid='true'],
        .hd-select[aria-invalid='true'],
        .hd-textarea[aria-invalid='true'] {
          box-shadow: 0 0 0 2px rgba(255,59,48,.24);
        }

        .hd-select {
          width: 100%; border: none; border-radius: 12px;
          padding: 13px 15px; font-size: 16px;
          font-family: -apple-system, sans-serif; color: #000;
          background: #fff; outline: none;
          appearance: none; box-sizing: border-box; letter-spacing: -.1px;
          transition: box-shadow .15s; min-height: 46px;
        }
        .hd-select:focus { box-shadow: 0 0 0 3px rgba(0,122,255,.15); }

        /* Photo upload */
        .hd-photo-upload {
          width: 100%; border: none; border-radius: 12px;
          padding: 12px 15px; font-size: 15px;
          font-family: -apple-system, sans-serif; color: #007aff;
          background: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          box-sizing: border-box; font-weight: 500;
          transition: background .1s;
        }
        .hd-photo-upload:active { background: #f2f2f7; }
        .hd-photo-upload:disabled { opacity: .45; cursor: default; }
        .hd-photo-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 390px) {
          .hd-photo-actions { grid-template-columns: 1fr; }
        }

        .hd-audio-preview {
          position: relative; display: flex; align-items: center;
          padding: 10px 38px 10px 10px; border-radius: 12px; background: #fff;
        }
        .hd-audio-preview audio, .hd-card-audio { width: 100%; min-height: 42px; }
        .hd-card-audio { margin-top: 12px; }
        .hd-audio-transcript { margin: 6px 0 0; color: #636366; font-size: 13px; line-height: 1.4; }
        .hd-audio-hint { margin: 6px 2px 0; color: #8e8e93; font-size: 12px; line-height: 1.35; }
        .hd-audio-wave { height: 20px; display: inline-flex; align-items: center; gap: 2px; }
        .hd-audio-wave i {
          display: block; width: 3px; height: 6px; border-radius: 999px;
          background: #ff3b30; animation: hdAudioWave .7s ease-in-out infinite alternate;
        }
        @keyframes hdAudioWave { to { height: 20px; } }

        .hd-previews { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
        .hd-preview-item {
          position: relative; width: 72px; height: 72px;
          border-radius: 10px; overflow: hidden; flex-shrink: 0;
        }
        .hd-preview-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hd-preview-placeholder {
          width: 100%; height: 100%; display: flex;
          align-items: center; justify-content: center;
          background: #e5e5ea; font-size: 22px;
        }
        .hd-preview-remove {
          position: absolute; top: 3px; right: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(0,0,0,.55); color: #fff; border: none; cursor: pointer;
          font-size: 9px; display: flex; align-items: center; justify-content: center;
          font-family: -apple-system, sans-serif;
        }

        .hd-field-error, .hd-form-error {
          margin: 6px 2px 0; color: #c9342c;
          font-size: 13px; line-height: 1.35;
        }
        .hd-upload-errors {
          margin: 4px 0 12px; padding: 10px 12px;
          border-radius: 10px; background: rgba(255,149,0,.1);
          color: #7a4b00; font-size: 13px; line-height: 1.4;
        }

        .hd-modal-actions {
          display: flex; gap: 10px; margin: 0; padding: 14px 16px 0;
          flex-shrink: 0; background: #f2f2f7;
        }
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

        /* ── Search bar ── */
        .hd-search {
          width: calc(100% - 32px);
          max-width: calc(var(--hd-screen-max) - 32px);
          margin: 0 auto 10px;
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

        /* ── AI Insights section ── */
        .hd-ai-section {
          width: calc(100% - 32px);
          max-width: calc(var(--hd-screen-max) - 32px);
          margin: 0 auto 14px;
          background: rgba(0,122,255,.06);
          border-radius: 14px;
          padding: 12px 14px;
        }
        .hd-ai-section-label {
          font-size: 11px; font-weight: 600; color: #007aff;
          letter-spacing: .06em; text-transform: uppercase;
          margin-bottom: 8px;
          display: flex; align-items: center; gap: 5px;
        }
        .hd-ai-rows { display: flex; flex-direction: column; gap: 5px; }
        .hd-ai-row {
          font-size: 13px; color: #3c3c43; line-height: 1.4;
          display: flex; align-items: flex-start; gap: 6px;
        }
        .hd-ai-row::before {
          content: '·'; color: #007aff; font-weight: 700;
          flex-shrink: 0; margin-top: 0;
        }
        .hd-ai-row strong { color: #000; font-weight: 600; }

        /* ── Search result hint ── */
        .hd-search-hint {
          width: 100%;
          max-width: var(--hd-screen-max);
          margin: 0 auto;
          padding: 0 20px 10px;
          font-size: 13px; color: #8e8e93; font-weight: 400;
        }
        .hd-search-hint strong { color: #000; font-weight: 600; }
        @media (prefers-reduced-motion: reduce) {
          .hd-page *, .hd-page *::before, .hd-page *::after,
          .hd-modal-overlay *, .hd-lightbox * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
        }
      `}</style>

      {/* Close menu on outside tap */}
      {menuOpenId && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          onClick={() => setMenuOpenId(null)}
        />
      )}

      <div className="hd-page">

        {!isOnline && (
          <div className="hd-status-banner" role="status" aria-live="polite">
            <span>{t("states.offline")}</span>
          </div>
        )}
        {mutationError && (
          <div className="hd-status-banner is-error" role="alert">
            <span>{mutationError}</span>
            <button type="button" className="hd-status-retry" onClick={() => setMutationError(null)}>{t("actions.dismiss")}</button>
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="hd-header">
          <div className="hd-header-left">
            <h1>{t("page.title")}</h1>
            <p>{t("page.resultCount", { count: filtered.length })}</p>
          </div>
          <button ref={addButtonRef} className="hd-add-btn" onClick={() => setShowTypeSheet(true)} aria-label={t("accessibility.add")}>
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
            placeholder={t("search.placeholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="hd-search-clear" onClick={() => setSearch("")} aria-label={t("search.clear")}>✕</button>
          )}
        </div>

        {/* ── FILTER TABS ── */}
        <div className="hd-tabs">
          {NOTES_PRIMARY_FILTER_OPTIONS.map(option => (
            <button
              key={option.value}
              className={`hd-tab ${primaryFilter === option.value ? "on" : ""}`}
              onClick={() => setPrimaryFilter(option.value)}
              aria-pressed={primaryFilter === option.value}
            >
              <span>{t(`filters.${option.value}`)}</span>
              <span className="hd-tab-count" aria-label={t("page.resultCount", { count: primaryFilterCounts[option.value] })}>
                {primaryFilterCounts[option.value]}
              </span>
            </button>
          ))}
        </div>

        <div className="hd-person-filter">
          <label htmlFor="notes-person-filter">{t("filters.person")}</label>
          <select
            id="notes-person-filter"
            value={filterPersonId}
            onChange={event => setFilterPersonId(event.target.value)}
            disabled={primaryFilter === "journal"}
            aria-describedby={primaryFilter === "journal" ? "notes-person-filter-hint" : undefined}
          >
            <option value="all">{t("filters.allPeople")}</option>
            {people.map(person => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
            <option value="none">{t("filters.noPerson")}</option>
          </select>
          {primaryFilter === "journal" && (
            <span id="notes-person-filter-hint" className="sr-only">
              {t("filters.journalHint")}
            </span>
          )}
        </div>

        {/* ── AI INSIGHTS — only when not searching, based on real data ── */}
        {showAiSection && (topPerson || topTags.length > 0 || giftCount > 0) && (
          <div className="hd-ai-section">
            <div className="hd-ai-section-label">
              <span>✦</span> {t("insights.title")}
            </div>
            <div className="hd-ai-rows">
              {topPerson && personMemCounts[topPerson.id] >= 2 && (
                <div className="hd-ai-row">
                  <strong>{topPerson.name}</strong>{" "}
                  {t("insights.topPerson", { count: personMemCounts[topPerson.id] })}
                </div>
              )}
              {topTags.length > 0 && (
                <div className="hd-ai-row">
                  {t("insights.topics")}{" "}
                  <strong>{topTags.join(" · ")}</strong>
                </div>
              )}
              {giftCount > 0 && (
                <div className="hd-ai-row">
                  {t.rich("insights.gifts", { count: giftCount, strong: (chunks) => <strong>{chunks}</strong> })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SEARCH HINT ── */}
        {q && (
          <div className="hd-search-hint">
  {filtered.length === 0 ? (
    <>{t("search.noResults", { query: search })}</>
  ) : (
    <>
      {t("search.results", { count: filtered.length, query: search })}
    </>
  )}
</div>
        )}

        {/* ── NOTES FEED — clean, no AI chips inside ── */}
        <div className="hd-feed">
          {loading && <div className="hd-loading" role="status" aria-live="polite">{t("states.loading")}</div>}

          {!loading && loadError && (
            <div className="hd-empty" role="alert">
              <div className="hd-empty-glyph" aria-hidden="true">↻</div>
              <div className="hd-empty-title">{t("states.loadFailed")}</div>
              <div className="hd-empty-sub">{t("states.loadFailedHint")}</div>
              <button type="button" className="hd-status-retry" onClick={() => void refreshNotes()}>{t("actions.retry")}</button>
            </div>
          )}

          {!loading && !loadError && filtered.length === 0 && (
            <div className="hd-empty">
              <div className="hd-empty-glyph">🕊️</div>
              <div className="hd-empty-title">
                {q
                  ? t("states.noMatches")
                  : t(emptyStateKeys[primaryFilter])}
              </div>
              <div className="hd-empty-sub">
                {q
                  ? t("states.tryAgain", { query: search })
                  : filterPersonId !== "all" && primaryFilter !== "journal"
                    ? t("states.chooseOther")
                    : t("states.addOrFilter")}
              </div>
            </div>
          )}

          {!loadError && filtered.map(memory => {
            const person = people.find(p => p.id === memory.person_id) ?? null;
            const event = events.find(item => item.id === memory.event_id) ?? null;
            const imgs = (memory.images ?? []).flatMap((storedValue) => {
              const displayUrl = imageDisplayUrls[storedValue];
              return displayUrl ? [displayUrl] : [];
            });

            return (
              <NoteMemoryCard
                key={memory.id}
                memory={memory}
                person={person}
                event={event}
                audioDisplayUrl={audioDisplayUrls[memory.id] ?? null}
                displayImageUrls={imgs}
                menuOpen={menuOpenId === memory.id}
                onMenuToggle={() => setMenuOpenId(menuOpenId === memory.id ? null : memory.id)}
                onMenuClose={() => setMenuOpenId(null)}
                onEdit={openEdit}
                onDelete={deleteMemory}
                deleting={deletingId === memory.id}
                onOpenLightbox={openLightbox}
              />
            );
          })}
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightboxOpen && (
        <div className="hd-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true" aria-label={t("accessibility.imageViewer")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="hd-lightbox-img"
            src={lightboxUrls[lightboxIdx]}
            alt=""
            onClick={e => e.stopPropagation()}
          />
          <button className="hd-lightbox-close" onClick={closeLightbox} aria-label={t("accessibility.closeLightbox")}>✕</button>
          {lightboxUrls.length > 1 && (
            <>
              <button className="hd-lightbox-nav hd-lb-prev" aria-label={t("accessibility.previousImage")} onClick={e => { e.stopPropagation(); lbPrev(); }}>‹</button>
              <button className="hd-lightbox-nav hd-lb-next" aria-label={t("accessibility.nextImage")} onClick={e => { e.stopPropagation(); lbNext(); }}>›</button>
              <div className="hd-lightbox-counter">{lightboxIdx + 1} / {lightboxUrls.length}</div>
            </>
          )}
        </div>
      )}

      {/* ── NEW ENTRY TYPE BOTTOM SHEET ── */}
      {showTypeSheet && (
        <div
          className="hd-modal-overlay"
          onClick={event => {
            if (event.target === event.currentTarget) setShowTypeSheet(false);
          }}
        >
          <div className="hd-type-sheet" role="dialog" aria-modal="true" aria-labelledby="notes-type-sheet-title">
            <div className="hd-modal-handle" />
            <div className="hd-type-sheet-title" id="notes-type-sheet-title">{t("typeSelector.title")}</div>
            <div className="hd-type-options">
              {NOTES_TYPE_OPTIONS.map(option => (
                <button
                  ref={option === NOTES_TYPE_OPTIONS[0] ? typeSheetFirstOptionRef : undefined}
                  key={option.type}
                  type="button"
                  className="hd-type-option"
                  onClick={() => {
                    setShowTypeSheet(false);
                    openNew(option.type);
                  }}
                >
                  <span className="hd-type-option-icon" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span><strong>{t(`typeSelector.${option.type}Title`)}</strong><small>{t(`typeSelector.${option.type}Description`)}</small></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT BOTTOM SHEET ── */}
      {showModal && (
        <MemoryEditorSheet
          key={editingMemory ? `edit-${editingMemory.id}` : `create-${selectedNewType}`}
          mode={editingMemory ? "edit" : "create"}
          type={editingMemory ? editingMemory.type : selectedNewType}
          memory={editingMemory}
          people={people}
          events={events}
          imageDisplayUrls={imageDisplayUrls}
          audioDisplayUrl={editingMemory ? audioDisplayUrls[editingMemory.id] ?? null : null}
          onCancel={closeModal}
          onSubmit={saveMemory}
        />
      )}
    </>
  );
}
