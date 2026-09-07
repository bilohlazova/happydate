"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Ban,
  BookHeart,
  Bot,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  Copy,
  EyeOff,
  Heart,
  LoaderCircle,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";

import ChatAssistantModal from "@/components/ChatAssistantModal";
import Avatar from "@/components/people/Avatar";
import { PersonGiftManager } from "@/components/people/PersonGiftManager";
import { PersonActionsSheet } from "@/components/people/PeoplePageContent";
import { PetsSection } from "@/components/people/PetsSection";
import { PersonSymbolSection } from "@/components/people/PersonSymbolSection";
import { PersonNotesSection } from "@/components/people/PersonNotesSection";
import type {
  PersonBrainInsightViewModel,
  PersonKnowledgeValueViewModel,
  PersonProfileViewModel,
  PersonTimelineItemViewModel,
} from "@/lib/people/peopleData.types";
import { MobileUI } from "@/lib/theme/mobile";
import { changePersonGiftOutcomeLearning, confirmPersonGiftOutcome } from "@/lib/gifts/gift.loaders";
import { addPersonKnowledge, archivePersonKnowledge, changePersonKnowledgeValue, permanentlyDeleteArchivedPersonKnowledge, resolvePersonKnowledgeConflict, restorePersonKnowledge, reviewPersonKnowledge } from "@/lib/people/people.loaders";
import type { GiftOutcomeValue } from "@/lib/gifts/gift.types";
import type { ConfirmedGiftOutcomeViewModel } from "@/lib/people/peopleData.types";
import { GIFT_OUTCOME_AI_CONTEXT_LIMIT, formatGiftOutcomeAiContextExport, formatGiftOutcomeAiContextGeneratedAt, formatGiftOutcomeAiContextTime } from "@/lib/gift-intelligence/giftOutcomeAiContextPreview";
import { recordKnowledgeReviewInteraction } from "@/lib/repositories/knowledgeReviewInteractions.repository";
import { logOperationalError } from "@/lib/observability/safeLogger";

type Translator = ReturnType<typeof useTranslations<"person">>;
const CLIPBOARD_WRITE_TIMEOUT_MS = 10_000;

class ClipboardWriteTimeoutError extends Error {}

async function writeClipboardWithTimeout(text: string): Promise<void> {
  let timeoutId: number | undefined;
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new ClipboardWriteTimeoutError("Clipboard write timed out")),
          CLIPBOARD_WRITE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

function createPreviewGeneratedAt(): { iso: string; timeZone: string } {
  return {
    iso: new Date().toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

export function PersonProfileContent({
  loading,
  failed,
  viewModel,
  onProfileChanged,
}: {
  loading: boolean;
  failed: boolean;
  viewModel: PersonProfileViewModel | null;
  onProfileChanged?: () => void | Promise<void>;
}) {
  const t = useTranslations("person");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [personActionsMode, setPersonActionsMode] = useState<"edit" | "delete" | null>(null);
  const requestedView = searchParams.get("view");
  const views = ["profile", "about", "notes", "gifts", "history"] as const;
  type AlbumView = (typeof views)[number];
  const activeView: AlbumView = views.includes(requestedView as AlbumView) ? requestedView as AlbumView : "profile";
  const activeIndex = views.indexOf(activeView);
  const touchStart = useRef<number | null>(null);

  function navigateAlbum(next: AlbumView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === "ArrowRight" && activeIndex < views.length - 1) navigateAlbum(views[activeIndex + 1]);
      if (event.key === "ArrowLeft" && activeIndex > 0) navigateAlbum(views[activeIndex - 1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loading) return <PersonProfileSkeleton label={t("profile.loading")} />;

  if (failed || !viewModel?.found || !viewModel.hero) {
    return <PersonProfileMessage>{t(failed ? "profile.loadError" : "profile.notFound")}</PersonProfileMessage>;
  }

  const { hero } = viewModel;
  return (
    <>
      <main
        aria-label={t("accessibility.profile", { name: hero.name })}
        className={`person-profile-page ${MobileUI.screen} ${MobileUI.contentBottom}`}
      >
        <div className="person-profile-layout mx-auto w-full max-w-[1120px] px-4 sm:px-5">
          <Link href="/people" className="person-profile-back">
            <ArrowLeft aria-hidden="true" />
            {t("profile.back")}
          </Link>

          <AlbumNavigation active={activeView} personName={hero.name} onNavigate={navigateAlbum} />
          <div
            key={activeView}
            className="mt-4 min-w-0 animate-[album-enter_.24s_ease-out] motion-reduce:animate-none"
            onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
            onTouchEnd={(event) => { const start = touchStart.current; const end = event.changedTouches[0]?.clientX; touchStart.current = null; if (start == null || end == null || Math.abs(end - start) < 55) return; const next = end < start ? activeIndex + 1 : activeIndex - 1; if (next >= 0 && next < views.length) navigateAlbum(views[next]); }}
          >
            {activeView === "profile" && <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"><ProfileHero model={viewModel} onAsk={() => setAssistantOpen(true)} onEdit={() => setPersonActionsMode("edit")} onDelete={() => setPersonActionsMode("delete")} t={t} /><div className="flex flex-col gap-4"><PetsSection personId={hero.id} pets={viewModel.pets} onChanged={onProfileChanged} />{viewModel.symbol && <PersonSymbolSection personId={hero.id} personName={hero.name} symbol={viewModel.symbol} onChanged={onProfileChanged} />}</div></div>}
            {activeView === "about" && <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]"><AboutPersonSection personId={hero.id} personName={hero.name} likes={viewModel.likes} dislikes={viewModel.dislikes} interests={viewModel.interests} importantFacts={viewModel.importantFacts} onChanged={onProfileChanged} t={t} /><div className="flex flex-col gap-4"><BrainSection items={viewModel.brainInsights} t={t} /><KnowledgeReviewSection personId={hero.id} review={viewModel.knowledgeReview} onChanged={onProfileChanged} t={t} /></div></div>}
            {activeView === "notes" && <PersonNotesSection personId={hero.id} personName={hero.name} notes={viewModel.notes} onChanged={onProfileChanged} />}
            {activeView === "gifts" && <PersonGiftManager personId={hero.id} personName={hero.name} onChanged={onProfileChanged} />}
            {activeView === "history" && <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><div className="flex flex-col gap-4"><TimelineSection items={viewModel.timeline} locale={locale} t={t} />{viewModel.happyConversations.length > 0 && <section className="rounded-[2rem] bg-white/90 p-5 shadow-sm sm:p-7"><h2 className="text-xl font-extrabold text-slate-900">{locale === "uk" ? "Розмови з Happy" : "Conversations with Happy"}</h2><div className="mt-4 space-y-4">{viewModel.happyConversations.slice(0, 5).map((turn) => <article key={turn.id} className="rounded-2xl bg-slate-50 p-4"><time className="text-xs font-bold text-slate-400">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(turn.created_at))}</time><p className="mt-2 text-sm font-semibold text-slate-700">{turn.user_message}</p><p className="mt-2 text-sm leading-6 text-violet-700">{turn.happy_response}</p></article>)}</div></section>}</div><div className="flex flex-col gap-4"><PersonSymbolSection personId={hero.id} personName={hero.name} symbol={viewModel.symbol} onChanged={onProfileChanged} /><KnowledgeConflictSection personId={hero.id} conflicts={viewModel.knowledgeConflicts} onChanged={onProfileChanged} t={t} /><ArchivedKnowledgeSection personId={hero.id} items={viewModel.archivedKnowledge} onChanged={onProfileChanged} t={t} /></div></div>}
          </div>
        </div>
      </main>

      <ChatAssistantModal open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <PersonActionsSheet
        person={personActionsMode ? {
          id: hero.id,
          name: hero.name,
          relationship: hero.relationship,
          relation_label: hero.relationLabel,
          relation_key: hero.relationKey,
          relation_category: hero.relationCategory,
          birthday: hero.birthday,
          gender: hero.gender,
        } : null}
        initialMode={personActionsMode ?? "actions"}
        onClose={() => setPersonActionsMode(null)}
        onUpdated={async () => {
          setPersonActionsMode(null);
          await onProfileChanged?.();
        }}
        onDeleted={() => {
          setPersonActionsMode(null);
          router.replace("/people");
          router.refresh();
        }}
      />
    </>
  );
}

function AlbumNavigation({ active, personName, onNavigate }: { active: "profile" | "about" | "notes" | "gifts" | "history"; personName: string; onNavigate: (view: "profile" | "about" | "notes" | "gifts" | "history") => void }) {
  const locale = useLocale();
  const items = [
    ["profile", locale === "uk" ? "Профіль" : "Profile"],
    ["about", locale === "uk" ? `Про ${personName}` : `About ${personName}`],
    ["notes", locale === "uk" ? "Спогади" : "Memories"],
    ["gifts", locale === "uk" ? "Подарунки" : "Gifts"],
    ["history", locale === "uk" ? "Історія" : "History"],
  ] as const;
  const index = items.findIndex(([key]) => key === active);
  return <nav aria-label={locale === "uk" ? "Сторінки альбому" : "Album pages"} className="sticky top-2 z-20 rounded-2xl bg-white/90 p-2 shadow-sm backdrop-blur">
    <div className="flex items-center gap-2"><button disabled={index === 0} onClick={() => onNavigate(items[index - 1][0])} className="min-h-11 min-w-11 rounded-xl hover:bg-slate-100 disabled:opacity-30" aria-label={locale === "uk" ? "Попередня сторінка" : "Previous page"}><ChevronLeft className="mx-auto" /></button><div className="min-w-0 flex-1 overflow-x-auto"><div className="flex min-w-max justify-center gap-1">{items.map(([key, label]) => <button key={key} aria-current={active === key ? "page" : undefined} onClick={() => onNavigate(key)} className={`min-h-11 rounded-xl px-3 text-sm font-bold transition ${active === key ? "bg-sky-100 text-sky-800" : "text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}</div></div><span className="whitespace-nowrap text-sm font-bold text-slate-500">{index + 1} / {items.length}</span><button disabled={index === items.length - 1} onClick={() => onNavigate(items[index + 1][0])} className="min-h-11 min-w-11 rounded-xl hover:bg-slate-100 disabled:opacity-30" aria-label={locale === "uk" ? "Наступна сторінка" : "Next page"}><ChevronRight className="mx-auto" /></button></div>
    <div className="mt-1 flex justify-center gap-1.5 sm:hidden">{items.map(([key]) => <button key={key} aria-label={key} onClick={() => onNavigate(key)} className={`h-2 rounded-full ${active === key ? "w-5 bg-sky-500" : "w-2 bg-slate-200"}`} />)}</div>
  </nav>;
}

// Kept as a settings-ready control while intentionally hidden from the person profile.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function GiftLearningAuditSection({
  items,
  aiPreview,
  profileLearningEnabled,
  locale,
  onChanged,
  t,
}: {
  items: ConfirmedGiftOutcomeViewModel[];
  aiPreview: PersonProfileViewModel["giftOutcomeAiPreview"];
  profileLearningEnabled: boolean;
  locale: string;
  onChanged?: () => void | Promise<void>;
  t: Translator;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState<"learning" | "outcome" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOutcome, setEditingOutcome] = useState<GiftOutcomeValue>("unsure");
  const [editingNote, setEditingNote] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewGeneratedAt, setPreviewGeneratedAt] = useState<{ iso: string; timeZone: string } | null>(null);
  const [lastPreviewRefresh, setLastPreviewRefresh] = useState<{ iso: string; timeZone: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "copied" | "error" | "timeout">("idle");
  const [lastCopiedPreview, setLastCopiedPreview] = useState<{ iso: string; timeZone: string } | null>(null);
  const [lastExcluded, setLastExcluded] = useState<{ giftId: string; giftTitle: string } | null>(null);
  const [lastRestored, setLastRestored] = useState<{ giftTitle: string; returnedToAll: boolean } | null>(null);
  const [lastContextSaved, setLastContextSaved] = useState<{ giftTitle: string } | null>(null);
  const [undoFailed, setUndoFailed] = useState(false);
  const [auditFilter, setAuditFilter] = useState<"all" | "ai_used" | "history_only">("all");
  const noteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingNoteFocusIdRef = useRef<string | null>(null);
  const editorOriginIdRef = useRef<string | null>(null);
  const pendingReturnFocusIdRef = useRef<string | null>(null);
  const previewRegionRef = useRef<HTMLDivElement | null>(null);
  const primaryCopyRef = useRef<HTMLButtonElement | null>(null);
  const retryCopyRef = useRef<HTMLButtonElement | null>(null);
  const retryingCopyRef = useRef(false);
  const pendingRetryFocusRef = useRef(false);
  const pendingPrimaryCopyFocusRef = useRef(false);
  const pendingPreviewFocusRef = useRef(false);
  const previewOriginIdRef = useRef<string | null>(null);
  const pendingPreviewReturnFocusRef = useRef(false);
  const activeCount = items.filter((item) => item.aiEligible).length;
  const activeWithNoteCount = items.filter((item) => item.aiEligible && Boolean(item.note?.trim())).length;
  const activeReactionOnlyCount = activeCount - activeWithNoteCount;
  const olderEligibleCount = Math.max(0, activeCount - GIFT_OUTCOME_AI_CONTEXT_LIMIT);
  const historyOnlyCount = items.length - activeCount;
  const profileRestrictedCount = profileLearningEnabled ? 0 : items.length;
  const individualExcludedCount = items.filter((item) => !item.learningEnabled).length;
  const filteredItems = auditFilter === "history_only"
    ? items.filter((item) => !item.aiEligible)
    : auditFilter === "ai_used"
      ? items.filter((item) => item.aiEligible)
      : items;
  const previewSources = items.filter((item) => item.aiEligible).slice(0, aiPreview.length);

  useEffect(() => {
    if (!lastExcluded) return;
    const timer = window.setTimeout(() => setLastExcluded(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [lastExcluded]);

  useEffect(() => {
    if (!lastRestored) return;
    const timer = window.setTimeout(() => setLastRestored(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [lastRestored]);

  useEffect(() => {
    if (!lastContextSaved) return;
    const timer = window.setTimeout(() => setLastContextSaved(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [lastContextSaved]);

  useEffect(() => {
    if (!editingId || pendingNoteFocusIdRef.current !== editingId) return;
    noteInputRef.current?.focus();
    pendingNoteFocusIdRef.current = null;
  }, [editingId]);

  useEffect(() => {
    if (editingId || !pendingReturnFocusIdRef.current) return;
    document.getElementById(pendingReturnFocusIdRef.current)?.focus();
    pendingReturnFocusIdRef.current = null;
  }, [editingId]);

  useEffect(() => {
    if (!previewOpen || !pendingPreviewFocusRef.current) return;
    previewRegionRef.current?.focus();
    pendingPreviewFocusRef.current = false;
  }, [previewOpen]);

  useEffect(() => {
    if (previewOpen || !pendingPreviewReturnFocusRef.current) return;
    const origin = previewOriginIdRef.current
      ? document.getElementById(previewOriginIdRef.current)
      : null;
    (origin ?? document.getElementById("gift-outcome-ai-preview-toggle"))?.focus();
    previewOriginIdRef.current = null;
    pendingPreviewReturnFocusRef.current = false;
  }, [previewOpen]);

  useEffect(() => {
    if (copyStatus === "error" && pendingRetryFocusRef.current) {
      retryCopyRef.current?.focus();
      pendingRetryFocusRef.current = false;
      return;
    }
    if (copyStatus === "copied" && retryingCopyRef.current) {
      primaryCopyRef.current?.focus();
      retryingCopyRef.current = false;
      return;
    }
    if (copyStatus === "timeout" && pendingPrimaryCopyFocusRef.current) {
      primaryCopyRef.current?.focus();
      pendingPrimaryCopyFocusRef.current = false;
    }
  }, [copyStatus]);

  async function change(item: ConfirmedGiftOutcomeViewModel) {
    if (busyId) return;
    const enabling = !item.learningEnabled;
    const returnToAll = enabling && profileLearningEnabled && auditFilter === "history_only" && historyOnlyCount === 1;
    setBusyId(item.giftId);
    setFailed(null);
    try {
      await changePersonGiftOutcomeLearning(item.giftId, !item.learningEnabled);
      await onChanged?.();
      if (enabling && profileLearningEnabled) {
        setLastExcluded((current) => current?.giftId === item.giftId ? null : current);
        setLastRestored({ giftTitle: item.giftTitle, returnedToAll: returnToAll });
        if (returnToAll) setAuditFilter("all");
      }
    } catch {
      setFailed("learning");
    } finally {
      setBusyId(null);
    }
  }

  async function excludeFromPreview(item: ConfirmedGiftOutcomeViewModel) {
    if (busyId || copyStatus === "copying") return;
    setBusyId(item.giftId);
    setFailed(null);
    setUndoFailed(false);
    try {
      await changePersonGiftOutcomeLearning(item.giftId, false);
      await onChanged?.();
      setLastExcluded({ giftId: item.giftId, giftTitle: item.giftTitle });
    } catch {
      setFailed("learning");
    } finally {
      setBusyId(null);
    }
  }

  async function undoExclusion() {
    if (!lastExcluded || busyId) return;
    const excluded = lastExcluded;
    const returnToAll = profileLearningEnabled && auditFilter === "history_only" && historyOnlyCount === 1;
    setBusyId(excluded.giftId);
    setUndoFailed(false);
    try {
      await changePersonGiftOutcomeLearning(excluded.giftId, true);
      await onChanged?.();
      setLastExcluded(null);
      if (profileLearningEnabled) {
        setLastRestored({ giftTitle: excluded.giftTitle, returnedToAll: returnToAll });
        if (returnToAll) setAuditFilter("all");
      }
    } catch {
      setUndoFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  function beginEditing(item: ConfirmedGiftOutcomeViewModel, focusNote = false, originControlId = `gift-audit-edit-${item.giftId}`) {
    setFailed(null);
    editorOriginIdRef.current = originControlId;
    pendingNoteFocusIdRef.current = focusNote ? item.giftId : null;
    setEditingId(item.giftId);
    setEditingOutcome(item.outcome);
    setEditingNote(item.note ?? "");
  }

  function cancelEditing() {
    pendingReturnFocusIdRef.current = editorOriginIdRef.current;
    editorOriginIdRef.current = null;
    setEditingId(null);
  }

  async function saveEdit(item: ConfirmedGiftOutcomeViewModel) {
    if (busyId) return;
    const note = editingNote.trim();
    const savedFromContextAction = editorOriginIdRef.current === `gift-audit-context-${item.giftId}` && !item.note?.trim() && Boolean(note);
    setBusyId(item.giftId);
    setFailed(null);
    try {
      await confirmPersonGiftOutcome(item.giftId, editingOutcome, note || null);
      editorOriginIdRef.current = null;
      setEditingId(null);
      await onChanged?.();
      if (savedFromContextAction) setLastContextSaved({ giftTitle: item.giftTitle });
    } catch {
      setFailed("outcome");
    } finally {
      setBusyId(null);
    }
  }

  async function copyPreview() {
    if (copyStatus === "copying") return;
    setCopyStatus("copying");
    setLastCopiedPreview(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      const generated = previewGeneratedAt ?? createPreviewGeneratedAt();
      const exportText = formatGiftOutcomeAiContextExport(aiPreview, {
        heading: t("profileUi.learningAudit.exportHeading"),
        generatedAt: (dateTime, zone) => t("profileUi.learningAudit.exportGeneratedAt", { dateTime, zone }),
        reaction: t("profileUi.learningAudit.exportReaction"),
        category: t("profileUi.learningAudit.exportCategory"),
        signal: t("profileUi.learningAudit.exportSignal"),
        note: t("profileUi.learningAudit.exportNote"),
        outcomeValue: (value) => t(`profileUi.gifts.outcome.${value}`),
        signalValue: (value) => t(`profileUi.learningAudit.signal.${value}`),
        omittedOutcomes: (omitted, shown, limit) => t("profileUi.learningAudit.exportLimitFooter", { omitted, shown, limit }),
      }, {
        generatedAt: new Date(generated.iso),
        locale,
        timeZone: generated.timeZone,
        omittedCount: olderEligibleCount,
      });
      await writeClipboardWithTimeout(exportText);
      setLastCopiedPreview(generated);
      setCopyStatus("copied");
    } catch (error) {
      if (error instanceof ClipboardWriteTimeoutError) {
        pendingPrimaryCopyFocusRef.current = retryingCopyRef.current;
        retryingCopyRef.current = false;
        setCopyStatus("timeout");
      } else {
        pendingRetryFocusRef.current = true;
        setCopyStatus("error");
      }
    }
  }

  function retryCopy() {
    retryingCopyRef.current = true;
    void copyPreview();
  }

  function openSavedContextPreview() {
    previewOriginIdRef.current = "gift-outcome-ai-preview-from-confirmation";
    if (previewOpen) {
      previewRegionRef.current?.focus();
      return;
    }
    setPreviewGeneratedAt(createPreviewGeneratedAt());
    setLastPreviewRefresh(null);
    setLastCopiedPreview(null);
    setCopyStatus("idle");
    pendingPreviewFocusRef.current = true;
    setPreviewOpen(true);
  }

  function togglePreview() {
    if (copyStatus === "copying") return;
    if (!previewOpen) {
      previewOriginIdRef.current = "gift-outcome-ai-preview-toggle";
      setPreviewGeneratedAt(createPreviewGeneratedAt());
      setLastPreviewRefresh(null);
      setLastCopiedPreview(null);
      setCopyStatus("idle");
    }
    setPreviewOpen((value) => !value);
  }

  function refreshPreviewGeneratedAt() {
    if (copyStatus === "copying") return;
    const refreshed = createPreviewGeneratedAt();
    setPreviewGeneratedAt(refreshed);
    setLastPreviewRefresh(refreshed);
    setLastCopiedPreview(null);
    setCopyStatus("idle");
  }

  function closePreview() {
    if (copyStatus === "copying") return;
    pendingPreviewReturnFocusRef.current = true;
    setPreviewOpen(false);
  }

  function handlePreviewKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    if (copyStatus === "copying") return;
    closePreview();
  }

  return (
    <ProfileSection icon={<BrainCircuit />} title={t("profileUi.learningAudit.title")} tone="emerald">
      <p className="text-xs font-semibold leading-5 text-slate-500">
        {t("profileUi.learningAudit.summary", { active: activeCount, total: items.length })}
      </p>
      {!profileLearningEnabled && <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"><p className="text-xs font-bold leading-5 text-amber-900">{t("profileUi.learningAudit.profileDisabled")}</p><Link href="/profile" className="mt-1 inline-flex text-xs font-extrabold text-amber-700 underline">{t("profileUi.learningAudit.manageConsent")}</Link></div>}
      <div className="mt-2 rounded-xl border border-sky-100 bg-sky-50/70 p-2.5">
        <button id="gift-outcome-ai-preview-toggle" type="button" disabled={previewOpen && copyStatus === "copying"} aria-expanded={previewOpen} aria-controls="gift-outcome-ai-preview" onClick={togglePreview} className="flex min-h-9 w-full items-center justify-between gap-2 text-left text-xs font-extrabold text-sky-800 disabled:cursor-wait disabled:opacity-70"><span>{t("profileUi.learningAudit.previewTitle")}</span><span aria-hidden="true">{previewOpen ? "−" : "+"}</span></button>
        {previewOpen && <div ref={previewRegionRef} id="gift-outcome-ai-preview" role="region" aria-labelledby="gift-outcome-ai-preview-heading" aria-describedby="gift-outcome-ai-preview-help gift-outcome-ai-preview-scope gift-outcome-ai-preview-generated-at" tabIndex={-1} onKeyDown={handlePreviewKeyDown} className="mt-2 rounded-lg border-t border-sky-100 pt-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"><h3 id="gift-outcome-ai-preview-heading" className="text-xs font-extrabold text-sky-900">{t("profileUi.learningAudit.previewTitle")}</h3><p id="gift-outcome-ai-preview-help" className="mt-1 text-[0.65rem] font-semibold leading-4 text-sky-700">{t("profileUi.learningAudit.previewEscapeHelp")}</p><p id="gift-outcome-ai-preview-scope" className="mt-1 text-[0.68rem] font-semibold leading-5 text-sky-900">{t("profileUi.learningAudit.previewDescription", { count: aiPreview.length })}</p>{previewGeneratedAt && <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-white px-2 py-1.5 ring-1 ring-sky-100"><p id="gift-outcome-ai-preview-generated-at" className="min-w-0 flex-1 text-[0.65rem] font-bold leading-4 text-sky-800">{t("profileUi.learningAudit.exportGeneratedAt", { dateTime: formatGiftOutcomeAiContextGeneratedAt(new Date(previewGeneratedAt.iso), locale, previewGeneratedAt.timeZone), zone: previewGeneratedAt.timeZone })}</p><button type="button" disabled={copyStatus === "copying"} onClick={refreshPreviewGeneratedAt} aria-label={t("profileUi.learningAudit.refreshExportTimeLabel", { dateTime: formatGiftOutcomeAiContextGeneratedAt(new Date(previewGeneratedAt.iso), locale, previewGeneratedAt.timeZone), zone: previewGeneratedAt.timeZone })} className="flex min-h-8 shrink-0 items-center gap-1 rounded-lg bg-sky-50 px-2 text-[0.65rem] font-extrabold text-sky-800 disabled:cursor-wait disabled:opacity-70"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{t("profileUi.learningAudit.refreshExportTime")}</button></div>}{copyStatus === "copying" && <p role="status" aria-live="polite" className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[0.65rem] font-bold leading-4 text-amber-900 ring-1 ring-amber-100">{t("profileUi.learningAudit.copyLockHelp")}</p>}{lastPreviewRefresh && <p role="status" aria-live="polite" className="sr-only">{t("profileUi.learningAudit.refreshExportTimeDone", { dateTime: formatGiftOutcomeAiContextGeneratedAt(new Date(lastPreviewRefresh.iso), locale, lastPreviewRefresh.timeZone), zone: lastPreviewRefresh.timeZone })}</p>}{aiPreview.length === 0 ? <p className="mt-2 text-xs font-bold text-slate-500">{t("profileUi.learningAudit.previewEmpty")}</p> : <><ol className="mt-2 space-y-2">{aiPreview.map((item, index) => {
          const source = previewSources[index];
          return <li key={source?.giftId ?? `${item.giftTitle}-${index}`} className="rounded-xl bg-white p-2.5 ring-1 ring-sky-100"><p className="text-xs font-extrabold text-slate-800">{item.giftTitle}</p><p className="mt-1 text-[0.68rem] font-bold text-slate-600">{t(`profileUi.gifts.outcome.${item.outcome}`)}</p><p className="mt-1 text-[0.68rem] font-semibold text-slate-500">{t("profileUi.learningAudit.previewCategory", { category: item.category })}</p><p className="mt-1 text-[0.68rem] font-semibold text-slate-500">{t("profileUi.learningAudit.previewSignal", { signal: t(`profileUi.learningAudit.signal.${item.categorySignal}`) })}</p>{item.note && <p className="mt-1 text-xs font-semibold italic leading-5 text-slate-600">“{item.note}”</p>}{source && <button type="button" disabled={busyId !== null || copyStatus === "copying"} onClick={() => void excludeFromPreview(source)} aria-label={t("profileUi.learningAudit.excludePreviewLabel", { gift: item.giftTitle })} className="mt-2 flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-[0.68rem] font-extrabold text-slate-700 disabled:cursor-wait disabled:opacity-50">{busyId === source.giftId ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}{t("profileUi.learningAudit.excludePreview")}</button>}</li>;
        })}</ol><p className="mt-2 text-[0.68rem] font-semibold leading-5 text-sky-900">{t("profileUi.learningAudit.excludePreviewHelp")}</p><button ref={primaryCopyRef} type="button" disabled={copyStatus === "copying"} aria-busy={copyStatus === "copying"} aria-describedby={copyStatus === "timeout" ? "gift-outcome-copy-timeout" : undefined} onClick={() => void copyPreview()} aria-label={copyStatus === "copying" ? t("profileUi.learningAudit.copyingPreview") : previewGeneratedAt ? t("profileUi.learningAudit.copyPreviewLabel", { dateTime: formatGiftOutcomeAiContextGeneratedAt(new Date(previewGeneratedAt.iso), locale, previewGeneratedAt.timeZone), zone: previewGeneratedAt.timeZone }) : t("profileUi.learningAudit.copyPreview")} className="mt-2 flex min-h-9 items-center gap-1.5 rounded-xl bg-sky-700 px-3 text-xs font-extrabold text-white disabled:cursor-wait disabled:opacity-70">{copyStatus === "copying" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}{copyStatus === "copying" ? t("profileUi.learningAudit.copyingPreview") : copyStatus === "copied" && lastCopiedPreview ? t("profileUi.learningAudit.copyDoneAt", { time: formatGiftOutcomeAiContextTime(new Date(lastCopiedPreview.iso), locale, lastCopiedPreview.timeZone) }) : t("profileUi.learningAudit.copyPreview")}</button>{copyStatus === "copied" && lastCopiedPreview && <p role="status" className="mt-1.5 text-[0.68rem] font-bold text-emerald-700">{t("profileUi.learningAudit.copyLocalOnlyAt", { dateTime: formatGiftOutcomeAiContextGeneratedAt(new Date(lastCopiedPreview.iso), locale, lastCopiedPreview.timeZone), zone: lastCopiedPreview.timeZone })}</p>}{copyStatus === "timeout" && <p id="gift-outcome-copy-timeout" role="alert" className="mt-1.5 text-[0.68rem] font-bold leading-5 text-amber-800">{t("profileUi.learningAudit.copyTimeout")}</p>}{copyStatus === "error" && <div role="alert" className="mt-1.5 rounded-lg bg-rose-50 px-2.5 py-2"><p className="text-[0.68rem] font-bold leading-5 text-rose-700">{t("profileUi.learningAudit.copyError")}</p><button ref={retryCopyRef} type="button" onClick={retryCopy} aria-label={previewGeneratedAt ? t("profileUi.learningAudit.retryCopyLabel", { dateTime: formatGiftOutcomeAiContextGeneratedAt(new Date(previewGeneratedAt.iso), locale, previewGeneratedAt.timeZone), zone: previewGeneratedAt.timeZone }) : t("profileUi.learningAudit.retryCopy")} className="mt-1.5 min-h-8 rounded-lg bg-white px-2.5 text-[0.68rem] font-extrabold text-rose-700 ring-1 ring-rose-200">{t("profileUi.learningAudit.retryCopy")}</button></div>}</>}<p className="mt-2 text-[0.65rem] font-bold leading-4 text-sky-800">{t("profileUi.learningAudit.previewPrivacy")}</p>{olderEligibleCount > 0 && <div className="mt-1.5 rounded-lg bg-sky-100 px-2 py-1.5 text-[0.65rem] font-bold leading-4 text-sky-900"><p>{t("profileUi.learningAudit.previewLimitNotice", { shown: GIFT_OUTCOME_AI_CONTEXT_LIMIT, total: activeCount })}</p><p className="mt-1 font-semibold">{t("profileUi.learningAudit.previewLimitHistory", { count: olderEligibleCount })}</p></div>}<button type="button" disabled={copyStatus === "copying"} onClick={closePreview} className="mt-2 min-h-9 rounded-xl bg-white px-3 text-xs font-extrabold text-sky-800 ring-1 ring-sky-200 disabled:cursor-wait disabled:opacity-70">{t("profileUi.learningAudit.closeAiContext")}</button></div>}
      </div>
      {lastExcluded && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2" role="status" aria-live="polite"><p className="min-w-0 flex-1 text-xs font-bold leading-5 text-emerald-900">{t("profileUi.learningAudit.excludedConfirmation", { gift: lastExcluded.giftTitle })}</p><button type="button" disabled={busyId !== null} onClick={() => void undoExclusion()} className="flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-extrabold text-emerald-800 shadow-sm disabled:opacity-50">{busyId === lastExcluded.giftId ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}{t("profileUi.learningAudit.undoExclusion")}</button></div>}
      {lastRestored && <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2" role="status" aria-live="polite"><p className="text-xs font-bold leading-5 text-emerald-900">{t("profileUi.learningAudit.restoredConfirmation", { gift: lastRestored.giftTitle })}</p>{lastRestored.returnedToAll && <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-emerald-800">{t("profileUi.learningAudit.returnedToAll")}</p>}</div>}
      {lastContextSaved && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2" role="status" aria-live="polite"><p className="min-w-0 flex-1 text-xs font-bold leading-5 text-emerald-900">{t("profileUi.learningAudit.contextSavedConfirmation", { gift: lastContextSaved.giftTitle })}</p><button id="gift-outcome-ai-preview-from-confirmation" type="button" aria-controls="gift-outcome-ai-preview" aria-expanded={previewOpen} onClick={openSavedContextPreview} className="min-h-9 rounded-lg bg-white px-3 text-xs font-extrabold text-emerald-800 shadow-sm">{t("profileUi.learningAudit.viewAiContext")}</button></div>}
      {undoFailed && <p role="alert" className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{t("profileUi.learningAudit.undoExclusionError")}</p>}
      {failed && <p role="alert" className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{t(failed === "learning" ? "profileUi.learningAudit.error" : "profileUi.learningAudit.editError")}</p>}
      {items.length === 0 ? <div className="mt-2"><EmptyCopy>{t("profileUi.learningAudit.empty")}</EmptyCopy></div> : (
        <>
          <div className="mt-3 grid grid-cols-3 rounded-xl bg-slate-100 p-1" role="group" aria-label={t("profileUi.learningAudit.filterLabel")}>
            <button type="button" aria-pressed={auditFilter === "all"} onClick={() => setAuditFilter("all")} className={`min-h-10 rounded-lg px-1.5 text-[0.68rem] font-extrabold leading-4 transition ${auditFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{t("profileUi.learningAudit.filterAll", { count: items.length })}</button>
            <button type="button" aria-pressed={auditFilter === "ai_used"} onClick={() => setAuditFilter("ai_used")} className={`min-h-10 rounded-lg px-1.5 text-[0.68rem] font-extrabold leading-4 transition ${auditFilter === "ai_used" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500"}`}>{t("profileUi.learningAudit.filterAiUsed", { count: activeCount })}</button>
            <button type="button" aria-pressed={auditFilter === "history_only"} onClick={() => setAuditFilter("history_only")} className={`min-h-10 rounded-lg px-1.5 text-[0.68rem] font-extrabold leading-4 transition ${auditFilter === "history_only" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{t("profileUi.learningAudit.filterHistoryOnly", { count: historyOnlyCount })}</button>
          </div>
          {auditFilter === "ai_used" && activeCount > 0 && <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-2.5 py-2" aria-label={t("profileUi.learningAudit.aiEvidenceSummaryLabel")}><div className="flex flex-wrap gap-1.5"><span className="rounded-full bg-emerald-100 px-2 py-1 text-[0.65rem] font-extrabold text-emerald-800">{t("profileUi.learningAudit.aiEvidenceWithNotes", { count: activeWithNoteCount })}</span><span className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-extrabold text-slate-600 ring-1 ring-emerald-100">{t("profileUi.learningAudit.aiEvidenceReactionOnly", { count: activeReactionOnlyCount })}</span></div><p className="mt-1.5 text-[0.62rem] font-semibold leading-4 text-emerald-900">{t("profileUi.learningAudit.aiEvidenceSummaryHelp")}</p></div>}
          {auditFilter === "history_only" && historyOnlyCount > 0 && <div className="mt-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2" aria-label={t("profileUi.learningAudit.breakdownLabel")}><div className="flex flex-wrap gap-1.5">{profileRestrictedCount > 0 && <span className="rounded-full bg-amber-100 px-2 py-1 text-[0.65rem] font-extrabold text-amber-900">{t("profileUi.learningAudit.breakdownProfile", { count: profileRestrictedCount })}</span>}{individualExcludedCount > 0 && <span className="rounded-full bg-slate-200 px-2 py-1 text-[0.65rem] font-extrabold text-slate-700">{t("profileUi.learningAudit.breakdownGift", { count: individualExcludedCount })}</span>}</div>{profileRestrictedCount > 0 && individualExcludedCount > 0 && <p className="mt-1.5 text-[0.62rem] font-semibold leading-4 text-slate-500">{t("profileUi.learningAudit.breakdownOverlap")}</p>}</div>}
          {filteredItems.length === 0 ? <div className="mt-2"><EmptyCopy>{t(auditFilter === "ai_used" ? "profileUi.learningAudit.filterAiEmpty" : "profileUi.learningAudit.filterEmpty")}</EmptyCopy></div> : <ul className="mt-3 space-y-2">
          {filteredItems.map((item) => (
            <li key={item.giftId} className={`rounded-2xl border p-3 ${item.learningEnabled ? "border-emerald-100 bg-emerald-50/70" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-800">{item.giftTitle}</p>
                  <p className="mt-0.5 text-[0.7rem] font-bold text-slate-500">
                    {t(`profileUi.gifts.outcome.${item.outcome}`)} · {formatAuditDate(item.confirmedAt, locale)}
                  </p>
                  {item.note && <p className="mt-1 text-xs font-semibold italic leading-5 text-slate-600">“{item.note}”</p>}
                  {item.note && <p className={`mt-1.5 text-[0.68rem] font-bold leading-4 ${item.aiEligible ? "text-emerald-700" : "text-slate-500"}`}>{t(item.aiEligible ? "profileUi.learningAudit.noteUsedByAi" : !profileLearningEnabled ? "profileUi.learningAudit.noteHistoryOnlyProfile" : "profileUi.learningAudit.noteHistoryOnlyGift")}</p>}
                  <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[0.65rem] font-extrabold ${learningSignalTone(item.learningSignal)}`}>
                    {t(`profileUi.learningAudit.signal.${item.learningSignal}`)}
                  </span>
                  {auditFilter === "ai_used" && item.aiEligible && !item.note?.trim() && editingId !== item.giftId && <button id={`gift-audit-context-${item.giftId}`} type="button" disabled={busyId !== null} onClick={() => beginEditing(item, true, `gift-audit-context-${item.giftId}`)} aria-label={t("profileUi.learningAudit.addContextLabel", { gift: item.giftTitle })} className="mt-2 flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.68rem] font-extrabold text-emerald-800 shadow-sm ring-1 ring-emerald-100 disabled:opacity-50"><NotebookPen className="h-3.5 w-3.5" />{t("profileUi.learningAudit.addContext")}</button>}
                </div>
                <button id={`gift-audit-edit-${item.giftId}`} type="button" disabled={busyId !== null} onClick={() => beginEditing(item)} aria-label={t("profileUi.learningAudit.edit", { gift: item.giftTitle })} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /></button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.learningEnabled}
                  aria-label={t("profileUi.learningAudit.toggle", { gift: item.giftTitle })}
                  disabled={busyId !== null}
                  onClick={() => void change(item)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${item.learningEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  {busyId === item.giftId ? <LoaderCircle className="absolute left-4 top-1.5 h-4 w-4 animate-spin text-white" /> : <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${item.learningEnabled ? "left-6" : "left-1"}`} />}
                </button>
              </div>
              {editingId === item.giftId && (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-2.5">
                  <p className="text-xs font-extrabold text-slate-700">{t("profileUi.learningAudit.editTitle")}</p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">{(["liked", "not_liked", "unsure"] as const).map((value) => <button key={value} type="button" disabled={busyId !== null} onClick={() => setEditingOutcome(value)} className={`min-h-9 rounded-lg px-1 text-[0.68rem] font-extrabold ${editingOutcome === value ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800"}`}>{t(`profileUi.gifts.outcome.${value}`)}</button>)}</div>
                  <label htmlFor={`gift-audit-note-${item.giftId}`} className="mt-2 block text-[0.68rem] font-extrabold text-slate-600">{t("profileUi.learningAudit.noteLabel")}</label>
                  <textarea ref={noteInputRef} id={`gift-audit-note-${item.giftId}`} value={editingNote} onChange={(event) => setEditingNote(event.target.value)} maxLength={500} rows={3} placeholder={t("profileUi.learningAudit.notePlaceholder")} className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400" />
                  <div className="mt-2 flex gap-2"><button type="button" disabled={busyId !== null} onClick={() => void saveEdit(item)} className="min-h-9 rounded-lg bg-emerald-600 px-3 text-xs font-extrabold text-white disabled:opacity-50">{busyId === item.giftId ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : t("profileUi.learningAudit.saveEdit")}</button><button type="button" disabled={busyId !== null} onClick={cancelEditing} className="min-h-9 rounded-lg bg-slate-100 px-3 text-xs font-extrabold text-slate-600 disabled:opacity-50">{t("profileUi.learningAudit.cancelEdit")}</button></div>
                </div>
              )}
              {item.aiEligible ? <p className="mt-2 text-[0.68rem] font-extrabold text-emerald-700">{t("profileUi.learningAudit.used")}</p> : <div className={`mt-2 rounded-xl border px-2.5 py-2 ${!profileLearningEnabled ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}><p className={`text-[0.68rem] font-extrabold ${!profileLearningEnabled ? "text-amber-900" : "text-slate-700"}`}>{t(!profileLearningEnabled ? "profileUi.learningAudit.historyReasonProfile" : "profileUi.learningAudit.historyReasonGift")}</p><p className={`mt-1 text-[0.65rem] font-semibold leading-4 ${!profileLearningEnabled ? "text-amber-800" : "text-slate-500"}`}>{t(!profileLearningEnabled ? "profileUi.learningAudit.historyReasonProfileHelp" : "profileUi.learningAudit.historyReasonGiftHelp")}</p>{!profileLearningEnabled && <Link href="/profile" className="mt-1.5 inline-flex text-[0.68rem] font-extrabold text-amber-800 underline">{t("profileUi.learningAudit.manageConsent")}</Link>}{profileLearningEnabled && !item.learningEnabled && <button type="button" disabled={busyId !== null} onClick={() => void change(item)} aria-label={t("profileUi.learningAudit.allowAiLabel", { gift: item.giftTitle })} className="mt-2 flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-extrabold text-white disabled:opacity-50">{busyId === item.giftId ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{t("profileUi.learningAudit.allowAi")}</button>}</div>}
            </li>
          ))}
        </ul>}
        </>
      )}
    </ProfileSection>
  );
}

function learningSignalTone(signal: ConfirmedGiftOutcomeViewModel["learningSignal"]): string {
  if (signal === "stable_like") return "bg-emerald-100 text-emerald-800";
  if (signal === "stable_avoid") return "bg-rose-100 text-rose-800";
  if (signal === "conflicted") return "bg-amber-100 text-amber-800";
  if (signal === "history_only") return "bg-slate-200 text-slate-600";
  return "bg-sky-100 text-sky-800";
}

function ProfileHero({
  model,
  onAsk,
  onEdit,
  onDelete,
  t,
}: {
  model: PersonProfileViewModel;
  onAsk: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: Translator;
}) {
  const hero = model.hero!;
  const peopleT = useTranslations("people");
  const formT = useTranslations("personForm");
  const locale = useLocale();
  const healthLabel = model.health ? t(`profileUi.health.${model.health.level}`) : null;
  const relationVariant = hero.gender === "female" || hero.gender === "male"
    ? hero.gender
    : "neutral";
  const relationLabel = hero.relationKey && hero.relationKey !== "other"
    ? peopleT(`relationships.${hero.relationKey}.${relationVariant}`)
    : hero.relationLabel;
  return (
    <section className="person-profile-hero relative overflow-hidden rounded-[1.4rem] border border-white/80 bg-white/85 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
      <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-sky-200/60 to-blue-100/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-start gap-3.5">
        <Avatar name={hero.name} className="!h-16 !w-16 !shrink-0 !text-xl !shadow-lg sm:!h-20 sm:!w-20 sm:!text-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="min-w-0 flex-1 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{hero.name}</h1>
            <button type="button" onClick={onEdit} aria-label={formT("title.edit")} title={formT("title.edit")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 transition hover:bg-sky-100 active:scale-95">
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={onDelete} aria-label={formT("delete.action")} title={formT("delete.action")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 active:scale-95">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {relationLabel && <p className="mt-0.5 truncate text-sm font-bold text-slate-500">{relationLabel}</p>}
          {hero.note && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{hero.note}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hero.birthday && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[0.7rem] font-extrabold text-rose-600">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatBirthdayDate(hero.birthday, locale)}
              </span>
            )}
            {hero.daysUntilBirthday !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[0.7rem] font-extrabold text-rose-600">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("profileUi.birthdayCountdown", { days: hero.daysUntilBirthday })}
              </span>
            )}
            {healthLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[0.7rem] font-extrabold text-sky-700">
                <Sparkles className="h-3.5 w-3.5" /> {healthLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onAsk} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-3 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(14,165,233,0.2)] transition active:scale-[0.98]">
          <Bot className="h-4.5 w-4.5" /> {t("profileUi.askHappy")}
        </button>
        {model.actions.addMemoryUrl ? (
          <Link href={model.actions.addMemoryUrl} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 text-sm font-extrabold text-sky-700 shadow-sm transition active:scale-[0.98]">
            <NotebookPen className="h-4.5 w-4.5" /> {t("profileUi.addNote")}
          </Link>
        ) : (
          <span className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-50 px-3 text-sm font-extrabold text-slate-400">
            <NotebookPen className="h-4.5 w-4.5" /> {t("profileUi.addNote")}
          </span>
        )}
      </div>
    </section>
  );
}

const toneClasses = {
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
} as const;

type AboutFactKind = "like" | "dislike" | "interest" | "important_fact";
type AboutFact = PersonKnowledgeValueViewModel & { kind: AboutFactKind };

function AboutPersonSection({ personId, personName, likes, dislikes, interests, importantFacts, onChanged, t }: { personId: string; personName: string; likes: PersonKnowledgeValueViewModel[]; dislikes: PersonKnowledgeValueViewModel[]; interests: PersonKnowledgeValueViewModel[]; importantFacts: PersonKnowledgeValueViewModel[]; onChanged?: () => void | Promise<void>; t: Translator }) {
  const facts: AboutFact[] = [
    ...likes.map((item) => ({ ...item, kind: "like" as const })),
    ...dislikes.map((item) => ({ ...item, kind: "dislike" as const })),
    ...interests.map((item) => ({ ...item, kind: "interest" as const })),
    ...importantFacts.map((item) => ({ ...item, kind: "important_fact" as const })),
  ];
  const [showAll, setShowAll] = useState(false);
  const [editor, setEditor] = useState<"new" | AboutFact | null>(null);
  const [actionFact, setActionFact] = useState<AboutFact | null>(null);
  const [deleteFact, setDeleteFact] = useState<AboutFact | null>(null);
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<AboutFactKind>("important_fact");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const visibleFacts = showAll ? facts : facts.slice(0, 5);

  function openNew() {
    setValue("");
    setKind("important_fact");
    setFailed(false);
    setEditor("new");
  }

  function openEdit(fact: AboutFact) {
    setValue(fact.value);
    setKind(fact.kind);
    setFailed(false);
    setEditor(fact);
  }

  async function save() {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      if (editor === "new") await addPersonKnowledge(personId, kind, normalized);
      else if (editor) await changePersonKnowledgeValue(personId, editor.id, normalized);
      setEditor(null);
      await onChanged?.();
    } catch (error) {
      logOperationalError("about-person", "save-failed", error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteFact || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await archivePersonKnowledge(personId, deleteFact.id);
      await permanentlyDeleteArchivedPersonKnowledge(personId, deleteFact.id);
      setDeleteFact(null);
      await onChanged?.();
    } catch (error) {
      logOperationalError("about-person", "delete-failed", error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <ProfileSection icon={<BookHeart />} title={t("profileUi.aboutPerson.title", { name: personName })} tone="violet" action={<button type="button" onClick={openNew} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-extrabold text-violet-700"><Plus className="h-4 w-4" />{t("profileUi.aboutPerson.add")}</button>}>
      {facts.length === 0 ? <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold leading-5 text-slate-500">{t("profileUi.aboutPerson.empty", { name: personName })}</p><button type="button" onClick={openNew} className="mt-2 min-h-11 rounded-xl bg-violet-600 px-3 text-xs font-extrabold text-white">{t("profileUi.aboutPerson.addFirst")}</button></div> : <>
        <ul className="space-y-1" aria-label={t("profileUi.aboutPerson.listLabel", { name: personName })}>
          {visibleFacts.map((fact) => <li key={fact.id} className="group flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">{fact.kind === "like" ? <Heart className="h-4 w-4 text-rose-500" /> : fact.kind === "dislike" ? <Ban className="h-4 w-4" /> : fact.kind === "interest" ? <Target className="h-4 w-4 text-sky-600" /> : <NotebookPen className="h-4 w-4 text-amber-600" />}</span>
            <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-700">{factDisplay(fact, t)}</span>
            <button type="button" onClick={() => { setFailed(false); setActionFact(fact); }} aria-label={t("profileUi.aboutPerson.factActions", { fact: fact.value })} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 opacity-100 hover:bg-white hover:text-violet-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"><MoreHorizontal className="h-5 w-5" /></button>
          </li>)}
        </ul>
        {facts.length > 5 && <button type="button" onClick={() => setShowAll((current) => !current)} className="mt-2 min-h-11 rounded-xl px-2 text-sm font-extrabold text-violet-700">{t(showAll ? "profileUi.aboutPerson.showLess" : "profileUi.aboutPerson.showAll", { count: facts.length })}</button>}
      </>}
    </ProfileSection>

    {(actionFact || editor || deleteFact) && <div className="fixed inset-0 z-50">
      <button type="button" aria-label={t("profileUi.aboutPerson.close")} onClick={() => { setActionFact(null); setEditor(null); setDeleteFact(null); }} className="absolute inset-0 bg-slate-950/25" />
      <section className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[520px] rounded-t-[1.35rem] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-18px_60px_rgba(15,23,42,0.22)]" aria-label={deleteFact ? t("profileUi.aboutPerson.deleteTitle") : t("profileUi.aboutPerson.editorTitle", { name: personName })}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black text-slate-950">{deleteFact ? t("profileUi.aboutPerson.deleteTitle") : actionFact ? factDisplay(actionFact, t) : t("profileUi.aboutPerson.editorTitle", { name: personName })}</h2><button type="button" onClick={() => { setActionFact(null); setEditor(null); setDeleteFact(null); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-500"><X className="h-5 w-5" /></button></div>
        {actionFact ? <div className="grid gap-2"><button type="button" onClick={() => { const fact = actionFact; setActionFact(null); openEdit(fact); }} className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-50 px-3 text-sm font-extrabold text-violet-700"><Pencil className="h-4 w-4" />{t("profileUi.aboutPerson.edit")}</button><button type="button" onClick={() => { setDeleteFact(actionFact); setActionFact(null); }} className="flex min-h-11 items-center gap-2 rounded-xl bg-rose-50 px-3 text-sm font-extrabold text-rose-600"><Trash2 className="h-4 w-4" />{t("profileUi.aboutPerson.delete")}</button></div> : deleteFact ? <><p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{t("profileUi.aboutPerson.deleteConfirm", { fact: deleteFact.value })}</p>{failed && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{t("profileUi.aboutPerson.error")}</p>}<div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={() => setDeleteFact(null)} className="min-h-11 rounded-xl bg-slate-50 text-sm font-extrabold text-slate-600">{t("profileUi.aboutPerson.cancel")}</button><button type="button" disabled={busy} onClick={() => void remove()} className="min-h-11 rounded-xl bg-rose-600 text-sm font-extrabold text-white">{busy ? t("profileUi.aboutPerson.deleting") : t("profileUi.aboutPerson.delete")}</button></div></> : <>
          <label htmlFor="about-person-value" className="text-sm font-extrabold text-slate-700">{t("profileUi.aboutPerson.question", { name: personName })}</label><textarea id="about-person-value" autoFocus rows={3} maxLength={500} value={value} onChange={(event) => setValue(event.target.value)} placeholder={t("profileUi.aboutPerson.placeholder", { name: personName })} className="mt-2 w-full resize-none rounded-xl border border-violet-200 p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200" />
          {editor === "new" && <label className="mt-3 block text-xs font-extrabold text-slate-600">{t("profileUi.aboutPerson.categoryOptional")}<select value={kind} onChange={(event) => setKind(event.target.value as AboutFactKind)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="important_fact">{t("profileUi.aboutPerson.categories.important")}</option><option value="like">{t("profileUi.aboutPerson.categories.like")}</option><option value="dislike">{t("profileUi.aboutPerson.categories.dislike")}</option><option value="interest">{t("profileUi.aboutPerson.categories.interest")}</option></select></label>}
          {failed && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{t("profileUi.aboutPerson.error")}</p>}<div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={() => setEditor(null)} className="min-h-11 rounded-xl bg-slate-50 text-sm font-extrabold text-slate-600">{t("profileUi.aboutPerson.cancel")}</button><button type="button" disabled={busy || !value.trim()} onClick={() => void save()} className="min-h-11 rounded-xl bg-violet-600 text-sm font-extrabold text-white disabled:opacity-50">{busy ? t("profileUi.aboutPerson.saving") : t("profileUi.aboutPerson.save")}</button></div>
          {editor !== "new" && <button type="button" disabled={busy} onClick={() => { setDeleteFact(editor); setEditor(null); setFailed(false); }} className="mt-3 min-h-11 w-full rounded-xl text-sm font-extrabold text-rose-600">{t("profileUi.aboutPerson.delete")}</button>}
        </>}
      </section>
    </div>}
  </>;
}

function factDisplay(fact: AboutFact, t: Translator): string {
  if (fact.kind === "like") return t("profileUi.aboutPerson.fact.like", { value: fact.value });
  if (fact.kind === "dislike") return t("profileUi.aboutPerson.fact.dislike", { value: fact.value });
  if (fact.kind === "interest") return t("profileUi.aboutPerson.fact.interest", { value: fact.value });
  return fact.value;
}

// Retained temporarily for the archived knowledge-detail pattern while the new aggregated presentation settles.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function KnowledgeSection({ personId, kind, collapsible = false, icon, title, tone, items, empty, onChanged, t }: { personId: string; kind: "like" | "dislike" | "interest" | "important_fact"; collapsible?: boolean; icon: ReactNode; title: string; tone: keyof typeof toneClasses; items: PersonKnowledgeValueViewModel[]; empty: string; onChanged?: () => void | Promise<void>; t: Translator }) {
  const locale = useLocale();
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(!collapsible);
  const [newValue, setNewValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function add() {
    const value = newValue.replace(/\s+/g, " ").trim();
    if (!value || value.length > 500 || busyId) return;
    setBusyId("new");
    setErrorId(null);
    try {
      await addPersonKnowledge(personId, kind, value);
      setNewValue("");
      setAdding(false);
      await onChanged?.();
    } catch (addError) {
      logOperationalError("person-knowledge", "create-failed", addError);
      setErrorId("new");
    } finally {
      setBusyId(null);
    }
  }

  async function save(item: PersonKnowledgeValueViewModel) {
    const value = draft.replace(/\s+/g, " ").trim();
    if (!value || value.length > 500 || busyId) return;
    setBusyId(item.id);
    setErrorId(null);
    try {
      await changePersonKnowledgeValue(personId, item.id, value);
      setEditingId(null);
      await onChanged?.();
    } catch {
      setErrorId(item.id);
    } finally {
      setBusyId(null);
    }
  }

  async function archive(item: PersonKnowledgeValueViewModel) {
    if (busyId) return;
    setBusyId(item.id);
    setErrorId(null);
    try {
      await archivePersonKnowledge(personId, item.id);
      setArchiveId(null);
      setDetailsId(null);
      await onChanged?.();
    } catch {
      setErrorId(item.id);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: PersonKnowledgeValueViewModel) {
    if (busyId) return;
    setBusyId(item.id);
    setErrorId(null);
    try {
      await archivePersonKnowledge(personId, item.id);
      await permanentlyDeleteArchivedPersonKnowledge(personId, item.id);
      setArchiveId(null);
      setDetailsId(null);
      await onChanged?.();
    } catch {
      setErrorId(item.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProfileSection icon={icon} title={title} tone={tone} action={
      <div className="flex items-center gap-1">
        {collapsible && items.length > 0 && <button type="button" aria-expanded={expanded} aria-controls={`knowledge-list-${kind}`} onClick={() => setExpanded((value) => !value)} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-extrabold text-slate-600">
          {t("profileUi.knowledgeAudit.itemCount", { count: items.length })}
          {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          <span className="sr-only">{t(expanded ? "profileUi.knowledgeAudit.hideList" : "profileUi.knowledgeAudit.showList")}</span>
        </button>}
        <button type="button" onClick={() => { setExpanded(true); setAdding(true); }} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-extrabold text-sky-700">
          <Plus className="h-4 w-4" aria-hidden="true" /> <span className="hidden min-[380px]:inline">{t("profileUi.knowledgeAudit.add")}</span>
        </button>
      </div>
    }>
      {collapsible && items.length > 0 && !expanded ? null : <div id={`knowledge-list-${kind}`}>
      {adding && (
        <div className="mb-3 rounded-xl bg-slate-50 p-2.5">
          <label htmlFor={`knowledge-new-${kind}`} className="sr-only">{t("profileUi.knowledgeAudit.addPlaceholder")}</label>
          <input id={`knowledge-new-${kind}`} autoFocus value={newValue} maxLength={500} onChange={(event) => setNewValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void add(); }} placeholder={t("profileUi.knowledgeAudit.addPlaceholder")} className="min-h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-300" />
          {errorId === "new" && <p className="mt-2 text-xs font-bold text-rose-600" role="alert">{t("profileUi.knowledgeAudit.error")}</p>}
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={!newValue.trim() || busyId === "new"} onClick={() => void add()} className="min-h-11 rounded-xl bg-sky-600 px-3 text-xs font-extrabold text-white disabled:opacity-50">{busyId === "new" ? t("profileUi.knowledgeAudit.saving") : t("profileUi.knowledgeAudit.save")}</button>
            <button type="button" disabled={busyId === "new"} onClick={() => { setAdding(false); setNewValue(""); }} className="min-h-11 rounded-xl px-3 text-xs font-extrabold text-slate-600">{t("profileUi.knowledgeAudit.cancel")}</button>
          </div>
        </div>
      )}
      {items.length ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id} className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold leading-5 text-slate-700 ring-1 ring-slate-100 sm:w-auto">
              {editingId === item.id ? (
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-slate-600" htmlFor={`knowledge-edit-${item.id}`}>{t("profileUi.knowledgeAudit.valueLabel")}</label>
                  <input id={`knowledge-edit-${item.id}`} value={draft} maxLength={500} autoFocus onChange={(event) => setDraft(event.target.value)} className="min-h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-300" />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={!draft.trim() || busyId === item.id} onClick={() => void save(item)} className="min-h-10 rounded-xl bg-sky-600 px-3 text-xs font-extrabold text-white disabled:opacity-50">{busyId === item.id ? t("profileUi.knowledgeAudit.saving") : t("profileUi.knowledgeAudit.save")}</button>
                    <button type="button" disabled={busyId === item.id} onClick={() => setEditingId(null)} className="min-h-10 rounded-xl px-3 text-xs font-extrabold text-slate-600">{t("profileUi.knowledgeAudit.cancel")}</button>
                  </div>
                </div>
              ) : <div className="flex items-center gap-1.5"><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{item.value}</span><button type="button" onClick={() => { setDraft(item.value); setEditingId(item.id); setArchiveId(null); }} aria-label={t("profileUi.knowledgeAudit.edit")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sky-700 hover:bg-white"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => { setArchiveId(item.id); setEditingId(null); }} aria-label={t("profileUi.knowledgeAudit.delete")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-rose-600 hover:bg-white"><Trash2 className="h-4 w-4" /></button></div>}
              {archiveId === item.id && <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 p-2"><span className="mr-auto text-xs font-semibold text-rose-700">{t("profileUi.knowledgeAudit.confirmDelete")}</span><button type="button" disabled={Boolean(busyId)} onClick={() => void remove(item)} className="min-h-11 rounded-xl bg-rose-600 px-3 text-xs font-extrabold text-white">{busyId === item.id ? t("profileUi.knowledgeAudit.archiving") : t("profileUi.knowledgeAudit.delete")}</button><button type="button" disabled={Boolean(busyId)} onClick={() => setArchiveId(null)} className="min-h-11 rounded-xl px-3 text-xs font-extrabold text-slate-600">{t("profileUi.knowledgeAudit.cancel")}</button></div>}
              {item.userConfirmed && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 text-[0.62rem] font-extrabold uppercase tracking-wide text-emerald-700"><CheckCircle2 className="size-3" aria-hidden="true" /> {t("profileUi.knowledgeSource.confirmedByYou")}</span>
                  <button type="button" aria-expanded={detailsId === item.id} onClick={() => setDetailsId((current) => current === item.id ? null : item.id)} className="ml-2 min-h-8 text-[0.68rem] font-extrabold text-sky-700 underline-offset-2 hover:underline">{t(detailsId === item.id ? "profileUi.knowledgeAudit.hideDetails" : "profileUi.knowledgeAudit.showDetails")}</button>
                </div>
              )}
              {detailsId === item.id && item.userConfirmed && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600">
                  <p><span className="font-extrabold text-slate-800">{t("profileUi.knowledgeAudit.source")}:</span> {t(`profileUi.knowledgeAudit.sources.${item.sourceKind === "gift_discovery" ? "gift_discovery" : "chat_message"}`)}</p>
                  {item.sourceExcerpt && <p className="mt-1"><span className="font-extrabold text-slate-800">{t("profileUi.knowledgeAudit.excerpt")}:</span> “{item.sourceExcerpt}”</p>}
                  {item.capturedAt && <p className="mt-1"><span className="font-extrabold text-slate-800">{t("profileUi.knowledgeAudit.confirmedAt")}:</span> {formatAuditDate(item.capturedAt, locale)}</p>}
                  <KnowledgeChangeHistory item={item} locale={locale} t={t} />
                  {errorId === item.id && <p className="mt-2 font-bold text-rose-600" role="alert">{t("profileUi.knowledgeAudit.error")}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={Boolean(busyId)} onClick={() => { setDraft(item.value); setEditingId(item.id); setArchiveId(null); }} className="min-h-10 rounded-xl border border-sky-200 px-3 text-xs font-extrabold text-sky-700">{t("profileUi.knowledgeAudit.edit")}</button>
                    {archiveId === item.id ? (
                      <>
                        <button type="button" disabled={Boolean(busyId)} onClick={() => void archive(item)} className="min-h-10 rounded-xl bg-rose-600 px-3 text-xs font-extrabold text-white">{busyId === item.id ? t("profileUi.knowledgeAudit.archiving") : t("profileUi.knowledgeAudit.confirmArchive")}</button>
                        <button type="button" disabled={Boolean(busyId)} onClick={() => setArchiveId(null)} className="min-h-10 rounded-xl px-3 text-xs font-extrabold text-slate-600">{t("profileUi.knowledgeAudit.cancel")}</button>
                      </>
                    ) : <button type="button" disabled={Boolean(busyId)} onClick={() => { setArchiveId(item.id); setEditingId(null); }} className="min-h-10 rounded-xl px-3 text-xs font-extrabold text-rose-700">{t("profileUi.knowledgeAudit.archive")}</button>}
                  </div>
                  {archiveId === item.id && <p className="mt-2 text-[0.7rem] font-semibold text-rose-700">{t("profileUi.knowledgeAudit.archiveExplanation")}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : <EmptyCopy>{empty}</EmptyCopy>}
      </div>}
    </ProfileSection>
  );
}

function ArchivedKnowledgeSection({ personId, items, onChanged, t }: { personId: string; items: PersonKnowledgeValueViewModel[]; onChanged?: () => void | Promise<void>; t: Translator }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function restore(item: PersonKnowledgeValueViewModel) {
    if (busyId) return;
    setBusyId(item.id);
    setErrorId(null);
    try {
      await restorePersonKnowledge(personId, item.id);
      await onChanged?.();
    } catch {
      setErrorId(item.id);
    } finally {
      setBusyId(null);
    }
  }

  async function permanentlyDelete(item: PersonKnowledgeValueViewModel) {
    if (busyId || deleteId !== item.id) return;
    setBusyId(item.id);
    setErrorId(null);
    try {
      await permanentlyDeleteArchivedPersonKnowledge(personId, item.id);
      setDeleteId(null);
      await onChanged?.();
    } catch {
      setErrorId(item.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProfileSection icon={<EyeOff />} title={t("profileUi.knowledgeArchive.title")} tone="slate">
      <button type="button" aria-expanded={open} onClick={() => { setOpen((value) => !value); setDeleteId(null); }} className="flex min-h-11 w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-left text-sm font-extrabold text-slate-700">
        <span>{items.length ? t("profileUi.knowledgeArchive.count", { count: items.length }) : t("profileUi.knowledgeArchive.empty")}</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-3">
          <p className="mb-3 text-xs font-semibold leading-5 text-slate-500">{t("profileUi.knowledgeArchive.description")}</p>
          {items.length ? (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-extrabold leading-5 text-slate-800 [overflow-wrap:anywhere]">{item.value}</p>
                  {item.sourceExcerpt && <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">“{item.sourceExcerpt}”</p>}
                  <KnowledgeChangeHistory item={item} locale={locale} t={t} />
                  {errorId === item.id && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{t("profileUi.knowledgeArchive.error")}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={Boolean(busyId)} onClick={() => void restore(item)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-emerald-200 px-3 text-xs font-extrabold text-emerald-700 disabled:opacity-50"><RotateCcw className="size-3.5" aria-hidden="true" /> {busyId === item.id ? t("profileUi.knowledgeArchive.restoring") : t("profileUi.knowledgeArchive.restore")}</button>
                    {deleteId === item.id ? (
                      <>
                        <button type="button" disabled={Boolean(busyId)} onClick={() => void permanentlyDelete(item)} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-rose-600 px-3 text-xs font-extrabold text-white disabled:opacity-50"><Trash2 className="size-3.5" aria-hidden="true" /> {busyId === item.id ? t("profileUi.knowledgeArchive.deleting") : t("profileUi.knowledgeArchive.confirmDelete")}</button>
                        <button type="button" disabled={Boolean(busyId)} onClick={() => setDeleteId(null)} className="min-h-10 rounded-xl px-3 text-xs font-extrabold text-slate-600">{t("profileUi.knowledgeArchive.cancel")}</button>
                      </>
                    ) : <button type="button" disabled={Boolean(busyId)} onClick={() => setDeleteId(item.id)} className="min-h-10 rounded-xl px-3 text-xs font-extrabold text-rose-700">{t("profileUi.knowledgeArchive.delete")}</button>}
                  </div>
                  {deleteId === item.id && <p className="mt-2 text-[0.7rem] font-bold leading-5 text-rose-700">{t("profileUi.knowledgeArchive.deleteWarning")}</p>}
                </li>
              ))}
            </ul>
          ) : <EmptyCopy>{t("profileUi.knowledgeArchive.emptyDescription")}</EmptyCopy>}
        </div>
      )}
    </ProfileSection>
  );
}

function KnowledgeConflictSection({ personId, conflicts, onChanged, t }: { personId: string; conflicts: PersonProfileViewModel["knowledgeConflicts"]; onChanged?: () => void | Promise<void>; t: Translator }) {
  const locale = useLocale();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  if (!conflicts.length) return null;

  async function keep(conflictId: string, winnerId: string, allIds: string[]) {
    if (busyId) return;
    setBusyId(winnerId);
    setErrorId(null);
    try {
      await resolvePersonKnowledgeConflict(personId, winnerId, allIds.filter((id) => id !== winnerId));
      await onChanged?.();
    } catch {
      setErrorId(conflictId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProfileSection icon={<BrainCircuit />} title={t("profileUi.knowledgeConflicts.title")} tone="amber" accent>
      <p className="mb-3 text-xs font-semibold leading-5 text-slate-600">{t("profileUi.knowledgeConflicts.description")}</p>
      <ul className="space-y-3">
        {conflicts.map((conflict) => {
          const ids = conflict.items.map((item) => item.id);
          return (
            <li key={conflict.id} className="rounded-2xl border border-amber-200 bg-white p-3">
              <p className="text-sm font-black text-slate-900">{t("profileUi.knowledgeConflicts.topic", { value: conflict.topic })}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {conflict.items.map((item) => (
                  <div key={item.id} className={`rounded-xl border p-3 ${item.polarity === "positive" ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"}`}>
                    <span className={`inline-flex rounded-full px-2 py-1 text-[0.64rem] font-black uppercase tracking-wide ${item.polarity === "positive" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{t(`profileUi.knowledgeConflicts.${item.polarity}`)}</span>
                    <p className="mt-2 text-sm font-extrabold text-slate-800">{item.value}</p>
                    {item.sourceExcerpt && <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">“{item.sourceExcerpt}”</p>}
                    {item.capturedAt && <p className="mt-1 text-[0.65rem] font-semibold text-slate-400">{formatAuditDateTime(item.capturedAt, locale)}</p>}
                    <button type="button" disabled={Boolean(busyId)} onClick={() => void keep(conflict.id, item.id, ids)} className="mt-2 min-h-10 w-full rounded-xl bg-slate-900 px-3 text-xs font-extrabold text-white disabled:opacity-50">{busyId === item.id ? t("profileUi.knowledgeConflicts.resolving") : t("profileUi.knowledgeConflicts.keepThis")}</button>
                  </div>
                ))}
              </div>
              {errorId === conflict.id && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{t("profileUi.knowledgeConflicts.error")}</p>}
              <p className="mt-2 text-[0.7rem] font-semibold leading-5 text-slate-500">{t("profileUi.knowledgeConflicts.archiveNote")}</p>
            </li>
          );
        })}
      </ul>
    </ProfileSection>
  );
}

function KnowledgeReviewSection({ personId, review, onChanged, t }: { personId: string; review: PersonProfileViewModel["knowledgeReview"]; onChanged?: () => void | Promise<void>; t: Translator }) {
  const locale = useLocale();
  const [busy, setBusy] = useState<"confirm" | "snooze" | "archive" | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (review) void recordKnowledgeReviewInteraction("profile", "shown");
  }, [review]);
  if (!review) return null;

  async function act(action: "confirm" | "snooze" | "archive") {
    if (busy) return;
    setBusy(action);
    setFailed(false);
    try {
      if (action === "archive") await archivePersonKnowledge(personId, review!.knowledgeId);
      else await reviewPersonKnowledge(personId, review!.knowledgeId, action);
      void recordKnowledgeReviewInteraction(
        "profile",
        action === "confirm" ? "confirmed" : action === "snooze" ? "snoozed" : "archived",
      );
      await onChanged?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div id="knowledge-review" className="scroll-mt-24">
    <ProfileSection icon={<Sparkles />} title={t("profileUi.knowledgeReview.title")} tone="sky" accent>
      <p className="text-sm font-extrabold leading-5 text-slate-900">{t("profileUi.knowledgeReview.question", { value: review.value })}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{t("profileUi.knowledgeReview.lastConfirmed", { date: formatAuditDate(review.lastConfirmedAt, locale) })}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{t("profileUi.knowledgeReview.explanation")}</p>
      {failed && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{t("profileUi.knowledgeReview.error")}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(busy)} onClick={() => void act("confirm")} className="min-h-10 rounded-xl bg-emerald-600 px-3 text-xs font-extrabold text-white disabled:opacity-50">{busy === "confirm" ? t("profileUi.knowledgeReview.saving") : t("profileUi.knowledgeReview.accurate")}</button>
        <button type="button" disabled={Boolean(busy)} onClick={() => void act("snooze")} className="min-h-10 rounded-xl border border-sky-200 bg-white px-3 text-xs font-extrabold text-sky-700 disabled:opacity-50">{busy === "snooze" ? t("profileUi.knowledgeReview.saving") : t("profileUi.knowledgeReview.later")}</button>
        <button type="button" disabled={Boolean(busy)} onClick={() => void act("archive")} className="min-h-10 rounded-xl px-3 text-xs font-extrabold text-rose-700 disabled:opacity-50">{busy === "archive" ? t("profileUi.knowledgeReview.saving") : t("profileUi.knowledgeReview.noLongerAccurate")}</button>
      </div>
    </ProfileSection>
    </div>
  );
}

function KnowledgeChangeHistory({ item, locale, t }: { item: PersonKnowledgeValueViewModel; locale: string; t: Translator }) {
  if (!item.changeHistory.length) return null;
  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-500">{t("profileUi.knowledgeHistory.title")}</p>
      <ol className="mt-2 space-y-2">
        {item.changeHistory.map((change) => (
          <li key={change.id} className="rounded-lg bg-slate-50 px-2.5 py-2 text-[0.72rem] font-semibold leading-5 text-slate-600">
            <p><span className="font-extrabold text-slate-700">{t("profileUi.knowledgeHistory.before")}:</span> <span className="line-through">{change.previousValue}</span></p>
            <p><span className="font-extrabold text-slate-700">{t("profileUi.knowledgeHistory.after")}:</span> {change.newValue}</p>
            <p className="mt-0.5 text-[0.65rem] text-slate-400">{formatAuditDateTime(change.changedAt, locale)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TimelineSection({ items, locale, t }: { items: PersonTimelineItemViewModel[]; locale: string; t: Translator }) {
  return (
    <ProfileSection icon={<BookHeart />} title={t("profileUi.timeline")} tone="sky" className="person-timeline-card">
      {items.length ? (
        <ol className="person-timeline space-y-1">
          {items.map((item, index) => (
            <li key={item.id} className="person-timeline__item grid grid-cols-[1.9rem_minmax(0,1fr)] gap-2.5">
              <div className="person-timeline__rail flex flex-col items-center">
                <span className={`person-timeline__dot mt-1.5 h-3 w-3 rounded-full ${item.kind === "gift_given" ? "bg-emerald-400" : item.kind.startsWith("gift_") ? "bg-violet-400" : "bg-sky-400"}`} />
                {index < items.length - 1 && <span className="my-1 min-h-8 w-px flex-1 bg-slate-200" />}
              </div>
              <div className="person-timeline__content pb-3">
                <p className="text-sm font-extrabold leading-5 text-slate-800">{item.title}</p>
                <p className="mt-0.5 text-[0.7rem] font-bold text-slate-400">{formatTimelineDate(item.date, locale)}</p>
                {item.giftOutcome && <span className="mt-1.5 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[0.65rem] font-extrabold text-emerald-700">{t(`profileUi.gifts.outcome.${item.giftOutcome}`)}</span>}
                {item.giftOutcomeNote && <p className="mt-1 text-xs font-semibold italic leading-5 text-slate-600">“{item.giftOutcomeNote}”</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : <EmptyCopy>{t("profileUi.empty.timeline")}</EmptyCopy>}
    </ProfileSection>
  );
}

function BrainSection({ items, t }: { items: PersonBrainInsightViewModel[]; t: Translator }) {
  return (
    <ProfileSection icon={<Bot />} title={t("profileUi.brain")} tone="violet" accent className="person-brain-card">
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-violet-100/80 bg-white/80 px-3 py-2.5">
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold leading-5 text-slate-800">{item.title}</p>
                  {item.description && <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{item.description}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyCopy>{t("profileUi.empty.brain")}</EmptyCopy>}
    </ProfileSection>
  );
}

function ProfileSection({ icon, title, tone, accent = false, className = "", action, children }: { icon: ReactNode; title: string; tone: keyof typeof toneClasses; accent?: boolean; className?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${className} rounded-[1.2rem] border p-3.5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-4 ${accent ? "border-violet-100 bg-gradient-to-br from-violet-50/90 to-white/90" : "border-white/80 bg-white/85"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl [&>svg]:h-4 [&>svg]:w-4 ${toneClasses[tone]}`}>{icon}</span>
        <h2 className="text-sm font-black text-slate-900 sm:text-base">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold leading-5 text-slate-500">{children}</p>;
}

function PersonProfileSkeleton({ label }: { label: string }) {
  return (
    <main className={`${MobileUI.screen} ${MobileUI.contentBottom} pt-3`} aria-label={label}>
      <div className="mx-auto grid w-full max-w-[1040px] animate-pulse gap-3 px-4 sm:px-5 lg:grid-cols-2">
        <div className="h-56 rounded-[1.4rem] bg-white shadow-sm" />
        <div className="h-56 rounded-[1.4rem] bg-white shadow-sm" />
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-[1.2rem] bg-white shadow-sm" />)}
      </div>
    </main>
  );
}

function PersonProfileMessage({ children }: { children: ReactNode }) {
  return (
    <main className={`${MobileUI.screen} ${MobileUI.contentBottom} pt-4`}>
      <div className="mx-auto w-full max-w-[520px] px-4 sm:px-5">
        <p className={`${MobileUI.card} p-5 text-sm font-semibold text-slate-600`}>{children}</p>
      </div>
    </main>
  );
}

function formatTimelineDate(value: string, locale: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

function formatBirthdayDate(value: string, locale: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date);
}

function formatAuditDate(value: string, locale: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatAuditDateTime(value: string, locale: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
