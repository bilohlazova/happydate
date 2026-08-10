"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, ExternalLink, Gift, Link2, LoaderCircle, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  changePersonGiftLifecycle,
  changePersonGiftOutcomeLearning,
  confirmPersonGiftOutcome,
  choosePersonGiftLink,
  createPersonGiftIdea,
  loadPersonGiftManagement,
  movePersonGiftLink,
  removePersonGiftIdea,
  removePersonGiftLink,
  renamePersonGiftIdea,
  savePersonGiftLink,
} from "@/lib/gifts/gift.loaders";
import type {
  GiftItemViewModel,
  GiftLifecycle,
  GiftOutcome,
  GiftOutcomeValue,
  PersonGiftManagementViewModel,
  SavedGiftLink,
} from "@/lib/gifts/gift.types";

type NextGiftLifecycle = Exclude<GiftLifecycle, "idea">;

const NEXT_LIFECYCLE: Partial<Record<GiftLifecycle, NextGiftLifecycle>> = {
  idea: "selected",
  selected: "purchased",
  purchased: "given",
};

export function PersonGiftManager({ personId, personName, onChanged }: { personId: string; personName: string; onChanged?: () => void | Promise<void> }) {
  const t = useTranslations("person.profileUi.gifts");
  const [model, setModel] = useState<PersonGiftManagementViewModel | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkGiftId, setLinkGiftId] = useState("");
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const reload = useCallback(async () => {
    setFailed(false);
    try {
      setModel(await loadPersonGiftManagement(personId));
    } catch {
      setFailed(true);
    }
  }, [personId]);

  useEffect(() => { void reload(); }, [reload]);

  async function run(key: string, operation: () => Promise<void>) {
    setBusy(key);
    setFailed(false);
    try {
      await operation();
      await reload();
      await onChanged?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  async function addIdea(event: FormEvent) {
    event.preventDefault();
    const title = ideaTitle.trim();
    if (!title) return;
    await run("idea", async () => {
      await createPersonGiftIdea(personId, title);
      setIdeaTitle("");
    });
  }

  async function addLink(event: FormEvent) {
    event.preventDefault();
    const url = linkUrl.trim();
    if (!url) return;
    await run("link", async () => {
      await savePersonGiftLink({ personId, giftId: linkGiftId || null, url, title: linkTitle.trim() || null });
      setLinkUrl("");
      setLinkTitle("");
      setLinkGiftId("");
    });
  }

  async function advance(gift: GiftItemViewModel) {
    const next = NEXT_LIFECYCLE[gift.lifecycle];
    if (!next || !gift.canChangeLifecycle) return;
    if (next === "given" && !window.confirm(t("confirmGiven", { gift: gift.title, name: personName }))) return;
    await run(gift.id, () => changePersonGiftLifecycle(gift.id, next));
  }

  function beginEditing(gift: GiftItemViewModel) {
    setEditingGiftId(gift.id);
    setEditingTitle(gift.title);
  }

  async function saveEditing(event: FormEvent, gift: GiftItemViewModel) {
    event.preventDefault();
    const title = editingTitle.trim();
    if (!title) return;
    await run(`edit-${gift.id}`, async () => {
      await renamePersonGiftIdea(gift.id, title);
      setEditingGiftId(null);
      setEditingTitle("");
    });
  }

  async function removeGift(gift: GiftItemViewModel) {
    const linkedCount = model?.savedLinks.filter((link) => link.giftId === gift.id).length ?? 0;
    const prompt = linkedCount > 0
      ? t("confirmDeleteGiftWithLinks", { gift: gift.title, count: linkedCount })
      : t("confirmDeleteGift", { gift: gift.title });
    if (!window.confirm(prompt)) return;
    await run(`delete-${gift.id}`, () => removePersonGiftIdea(gift.id));
  }

  const gifts = model ? [...model.activeIdeas, ...model.history] : [];
  const linkableGifts = model?.activeIdeas.filter((gift) => gift.canChangeLifecycle) ?? [];
  const assignableGifts = gifts.filter((gift) => gift.canChangeLifecycle);
  const unassignedLinks = model?.savedLinks.filter((link) => link.giftId === null) ?? [];

  return (
    <section id="gift-workspace" className="scroll-mt-24 rounded-[1.35rem] border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/60 p-3.5 shadow-[0_12px_34px_rgba(76,29,149,0.07)] sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Gift className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="text-base font-black text-slate-900">{t("title")}</h2>
          <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{t("subtitle", { name: personName })}</p>
        </div>
      </div>

      {failed && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{t("error")}</p>}

      <form onSubmit={addIdea} className="mt-4 flex gap-2">
        <input value={ideaTitle} onChange={(event) => setIdeaTitle(event.target.value)} maxLength={280} placeholder={t("ideaPlaceholder")} aria-label={t("ideaPlaceholder")} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        <button disabled={busy !== null || !ideaTitle.trim()} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-sm font-extrabold text-white disabled:opacity-45"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t("addIdea")}</span></button>
      </form>

      <div className="mt-3 space-y-2">
        {!model ? <Loading label={t("loading")} /> : gifts.length === 0 ? <Empty text={t("emptyIdeas")} /> : gifts.map((gift) => {
          const next = NEXT_LIFECYCLE[gift.lifecycle];
          const giftLinks = model.savedLinks.filter((link) => link.giftId === gift.id);
          return (
            <article key={gift.id} className="rounded-2xl border border-slate-100 bg-white/90 p-3">
              {editingGiftId === gift.id ? (
                <form onSubmit={(event) => void saveEditing(event, gift)} className="flex items-center gap-2">
                  <input autoFocus value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} maxLength={280} aria-label={t("editGiftLabel")} className="min-h-10 min-w-0 flex-1 rounded-xl border border-violet-300 px-3 text-sm font-semibold text-slate-800 outline-none ring-2 ring-violet-100" />
                  <button type="submit" disabled={busy !== null || !editingTitle.trim()} aria-label={t("saveGiftEdit")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white disabled:opacity-45">{busy === `edit-${gift.id}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</button>
                  <button type="button" disabled={busy !== null} onClick={() => setEditingGiftId(null)} aria-label={t("cancelGiftEdit")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-45"><X className="h-4 w-4" /></button>
                </form>
              ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="break-words text-sm font-extrabold text-slate-800">{gift.title}</p><span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-violet-700">{t(`lifecycle.${gift.lifecycle}`)}</span></div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {next && gift.canChangeLifecycle && <button type="button" disabled={busy !== null} onClick={() => void advance(gift)} className="rounded-xl bg-slate-900 px-2.5 py-2 text-xs font-extrabold text-white disabled:opacity-45">{busy === gift.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : t(`actions.${next}`)}</button>}
                  {gift.canChangeLifecycle && gift.lifecycle !== "given" && <><button type="button" disabled={busy !== null} onClick={() => beginEditing(gift)} aria-label={t("editGift")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700 disabled:opacity-45"><Pencil className="h-4 w-4" /></button><button type="button" disabled={busy !== null} onClick={() => void removeGift(gift)} aria-label={t("deleteGift")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 disabled:opacity-45">{busy === `delete-${gift.id}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></>}
                </div>
                {gift.lifecycle === "given" && <Check className="h-5 w-5 shrink-0 text-emerald-500" aria-label={t("lifecycle.given")} />}
              </div>
              )}
              {!gift.canChangeLifecycle && <p className="mt-2 text-[0.68rem] font-semibold text-slate-400">{t("legacyReadOnly")}</p>}
              {gift.finalSelection && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5"><p className="text-[0.68rem] font-black uppercase tracking-wide text-emerald-700">{t("finalSelection")}</p>{gift.finalSelection.url ? <a href={gift.finalSelection.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1.5 break-all text-xs font-extrabold text-emerald-900">{gift.finalSelection.title || host(gift.finalSelection.url)}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a> : <p className="mt-1 text-xs font-semibold text-emerald-800">{t("finalSelectionWithoutLink")}</p>}{gift.finalSelection.priceAmount !== null && <p className="mt-1 text-xs font-bold text-emerald-800">{t("finalPrice")}: {gift.finalSelection.priceAmount} {gift.finalSelection.currency ?? ""}</p>}{gift.finalSelection.decisionNote && <p className="mt-1 text-xs font-semibold italic text-emerald-800">{gift.finalSelection.decisionNote}</p>}</div>}
              {gift.lifecycle === "given" && gift.canChangeLifecycle && <GiftOutcomeFeedback current={gift.finalOutcome} busy={busy === `outcome-${gift.id}` || busy === `outcome-learning-${gift.id}`} question={t("outcomeQuestion", { gift: gift.title })} noteLabel={t("outcomeNoteLabel")} notePlaceholder={t("outcomeNotePlaceholder")} saveLabel={t("saveOutcome")} confirmedLabel={t("outcomeConfirmed")} learningLabel={t("outcomeLearningLabel")} learningDescription={t("outcomeLearningDescription")} options={{ liked: t("outcome.liked"), not_liked: t("outcome.not_liked"), unsure: t("outcome.unsure") }} onSave={(outcome, note) => void run(`outcome-${gift.id}`, () => confirmPersonGiftOutcome(gift.id, outcome, note))} onLearningChange={(enabled) => void run(`outcome-learning-${gift.id}`, () => changePersonGiftOutcomeLearning(gift.id, enabled))} />}
              {giftLinks.length > 0 && <div className="mt-3 border-t border-sky-100 pt-2.5"><p className="mb-2 text-[0.68rem] font-black uppercase tracking-wide text-sky-700">{t("giftLinks", { count: giftLinks.length })}</p><div className="space-y-2">{giftLinks.map((link) => <SavedLinkRow key={link.id} link={link} gifts={assignableGifts} busy={busy} deleteLabel={t("deleteLink")} moveLabel={t("moveLinkLabel")} withoutGiftLabel={t("linkWithoutGift")} preferredLabel={t("preferredOption")} reasonLabel={t("decisionReason")} reasonPlaceholder={t("decisionReasonPlaceholder")} chooseLabel={t("chooseOption")} updateChoiceLabel={t("updateChoice")} removeChoiceLabel={t("removeChoice")} onPreference={(preferred, note) => void run(`prefer-${link.id}`, () => choosePersonGiftLink(link.id, preferred, note))} onMove={(giftId) => void run(`move-${link.id}`, () => movePersonGiftLink(link.id, giftId))} onDelete={() => { if (window.confirm(t("confirmDeleteLink"))) void run(link.id, () => removePersonGiftLink(link.id)); }} />)}</div></div>}
            </article>
          );
        })}
      </div>

      <div className="my-4 h-px bg-violet-100" />
      <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-sky-600" /><h3 className="text-sm font-black text-slate-900">{t("linksTitle")}</h3></div>
      <form onSubmit={addLink} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input type="url" inputMode="url" required pattern="https://.*" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder={t("urlPlaceholder")} aria-label={t("urlPlaceholder")} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
        <input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} maxLength={280} placeholder={t("linkTitlePlaceholder")} aria-label={t("linkTitlePlaceholder")} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
        <select value={linkGiftId} onChange={(event) => setLinkGiftId(event.target.value)} aria-label={t("linkGiftLabel")} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:col-span-2"><option value="">{t("linkWithoutGift")}</option>{linkableGifts.map((gift) => <option key={gift.id} value={gift.id}>{gift.title}</option>)}</select>
        <button disabled={busy !== null || !linkUrl.trim()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 text-sm font-extrabold text-white disabled:opacity-45 sm:col-span-2">{busy === "link" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{t("saveLink")}</button>
      </form>
      <div className="mt-3 space-y-2">
        {model && model.savedLinks.length === 0 && <Empty text={t("emptyLinks")} />}
        {model && model.savedLinks.length > 0 && <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-500">{t("unassignedLinks")}</p>}
        {model && model.savedLinks.length > 0 && unassignedLinks.length === 0 && <Empty text={t("emptyUnassignedLinks")} />}
        {unassignedLinks.map((link) => <SavedLinkRow key={link.id} link={link} gifts={assignableGifts} busy={busy} deleteLabel={t("deleteLink")} moveLabel={t("moveLinkLabel")} withoutGiftLabel={t("linkWithoutGift")} preferredLabel={t("preferredOption")} reasonLabel={t("decisionReason")} reasonPlaceholder={t("decisionReasonPlaceholder")} chooseLabel={t("chooseOption")} updateChoiceLabel={t("updateChoice")} removeChoiceLabel={t("removeChoice")} onPreference={(preferred, note) => void run(`prefer-${link.id}`, () => choosePersonGiftLink(link.id, preferred, note))} onMove={(giftId) => void run(`move-${link.id}`, () => movePersonGiftLink(link.id, giftId))} onDelete={() => { if (window.confirm(t("confirmDeleteLink"))) void run(link.id, () => removePersonGiftLink(link.id)); }} />)}
      </div>
      <p className="mt-3 text-[0.68rem] font-semibold leading-5 text-slate-400">{t("linkDisclaimer")}</p>
    </section>
  );
}

function host(url: string): string { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } }
function GiftOutcomeFeedback({ current, busy, question, noteLabel, notePlaceholder, saveLabel, confirmedLabel, learningLabel, learningDescription, options, onSave, onLearningChange }: { current: GiftOutcome | null; busy: boolean; question: string; noteLabel: string; notePlaceholder: string; saveLabel: string; confirmedLabel: string; learningLabel: string; learningDescription: string; options: Record<GiftOutcomeValue, string>; onSave: (outcome: GiftOutcomeValue, note: string | null) => void; onLearningChange: (enabled: boolean) => void }) {
  const [outcome, setOutcome] = useState<GiftOutcomeValue | null>(current?.value ?? null);
  const [note, setNote] = useState(current?.note ?? "");
  useEffect(() => { setOutcome(current?.value ?? null); setNote(current?.note ?? ""); }, [current]);
  return <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 p-2.5">
    <div className="flex items-start justify-between gap-2"><p className="text-xs font-extrabold text-amber-950">{question}</p>{current && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[0.62rem] font-black uppercase text-emerald-700">{confirmedLabel}</span>}</div>
    <div className="mt-2 grid grid-cols-3 gap-1.5">{(["liked", "not_liked", "unsure"] as const).map((value) => <button key={value} type="button" disabled={busy} onClick={() => setOutcome(value)} className={`min-h-9 rounded-lg px-1.5 text-xs font-extrabold transition disabled:opacity-45 ${outcome === value ? "bg-amber-500 text-white" : "bg-white text-amber-900"}`}>{options[value]}</button>)}</div>
    <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} aria-label={noteLabel} placeholder={notePlaceholder} className="mt-2 min-h-9 w-full rounded-lg border border-amber-100 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-amber-400" />
    <button type="button" disabled={busy || outcome === null} onClick={() => outcome && onSave(outcome, note.trim() || null)} className="mt-2 flex min-h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-extrabold text-white disabled:opacity-45">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : saveLabel}</button>
    {current && <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg bg-white/80 p-2">
      <input type="checkbox" checked={current.learningEnabled} disabled={busy} onChange={(event) => onLearningChange(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
      <span><span className="block text-xs font-extrabold text-slate-800">{learningLabel}</span><span className="block text-[0.68rem] font-semibold text-slate-500">{learningDescription}</span></span>
    </label>}
  </div>;
}
function SavedLinkRow({ link, gifts, busy, deleteLabel, moveLabel, withoutGiftLabel, preferredLabel, reasonLabel, reasonPlaceholder, chooseLabel, updateChoiceLabel, removeChoiceLabel, onPreference, onMove, onDelete }: { link: SavedGiftLink; gifts: GiftItemViewModel[]; busy: string | null; deleteLabel: string; moveLabel: string; withoutGiftLabel: string; preferredLabel: string; reasonLabel: string; reasonPlaceholder: string; chooseLabel: string; updateChoiceLabel: string; removeChoiceLabel: string; onPreference: (preferred: boolean, note: string | null) => void; onMove: (giftId: string | null) => void; onDelete: () => void }) { const [note, setNote] = useState(link.decisionNote ?? ""); useEffect(() => setNote(link.decisionNote ?? ""), [link.decisionNote]); const moving = busy === `move-${link.id}`; const choosing = busy === `prefer-${link.id}`; return <div className={`rounded-xl p-2.5 ${link.isPreferred ? "bg-amber-50 ring-1 ring-amber-200" : "bg-sky-50/80"}`}><div className="flex items-center gap-2"><a href={link.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1"><span className="flex items-center gap-1.5 truncate text-sm font-extrabold text-sky-800">{link.title || host(link.url)}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></span><span className="block truncate text-[0.68rem] font-semibold text-sky-600/70">{host(link.url)}</span></a>{link.isPreferred && <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-200/70 px-2 py-1 text-[0.62rem] font-black uppercase text-amber-800"><Star className="h-3 w-3 fill-current" />{preferredLabel}</span>}<button type="button" disabled={busy !== null} onClick={onDelete} aria-label={deleteLabel} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-500 shadow-sm disabled:opacity-45">{busy === link.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div><div className="mt-2 flex items-center gap-2"><select value={link.giftId ?? ""} disabled={busy !== null} onChange={(event) => onMove(event.target.value || null)} aria-label={moveLabel} className="min-h-9 min-w-0 flex-1 rounded-lg border border-sky-100 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-sky-400 disabled:opacity-45"><option value="">{withoutGiftLabel}</option>{gifts.map((gift) => <option key={gift.id} value={gift.id}>{gift.title}</option>)}</select>{moving && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-sky-600" />}</div>{link.giftId && <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]"><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} aria-label={reasonLabel} placeholder={reasonPlaceholder} className="min-h-9 min-w-0 rounded-lg border border-amber-100 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-amber-400" /><button type="button" disabled={busy !== null} onClick={() => onPreference(true, note.trim() || null)} className="min-h-9 rounded-lg bg-amber-500 px-3 text-xs font-extrabold text-white disabled:opacity-45">{choosing ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : link.isPreferred ? updateChoiceLabel : chooseLabel}</button>{link.isPreferred && <button type="button" disabled={busy !== null} onClick={() => onPreference(false, null)} className="text-left text-[0.68rem] font-bold text-rose-600 sm:col-span-2">{removeChoiceLabel}</button>}</div>}</div>; }
function Loading({ label }: { label: string }) { return <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />{label}</p>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-500">{text}</p>; }
