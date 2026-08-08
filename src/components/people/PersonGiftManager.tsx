"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, ExternalLink, Gift, Link2, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  changePersonGiftLifecycle,
  createPersonGiftIdea,
  loadPersonGiftManagement,
  removePersonGiftLink,
  savePersonGiftLink,
} from "@/lib/gifts/gift.loaders";
import type {
  GiftItemViewModel,
  GiftLifecycle,
  PersonGiftManagementViewModel,
} from "@/lib/gifts/gift.types";

type NextGiftLifecycle = Exclude<GiftLifecycle, "idea">;

const NEXT_LIFECYCLE: Partial<Record<GiftLifecycle, NextGiftLifecycle>> = {
  idea: "selected",
  selected: "purchased",
  purchased: "given",
};

export function PersonGiftManager({ personId, personName }: { personId: string; personName: string }) {
  const t = useTranslations("person.profileUi.gifts");
  const [model, setModel] = useState<PersonGiftManagementViewModel | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");

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
      await savePersonGiftLink({ personId, url, title: linkTitle.trim() || null });
      setLinkUrl("");
      setLinkTitle("");
    });
  }

  async function advance(gift: GiftItemViewModel) {
    const next = NEXT_LIFECYCLE[gift.lifecycle];
    if (!next || !gift.canChangeLifecycle) return;
    if (next === "given" && !window.confirm(t("confirmGiven", { gift: gift.title, name: personName }))) return;
    await run(gift.id, () => changePersonGiftLifecycle(gift.id, next));
  }

  const gifts = model ? [...model.activeIdeas, ...model.history] : [];

  return (
    <section className="rounded-[1.35rem] border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/60 p-3.5 shadow-[0_12px_34px_rgba(76,29,149,0.07)] sm:p-4">
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
          return (
            <article key={gift.id} className="rounded-2xl border border-slate-100 bg-white/90 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="break-words text-sm font-extrabold text-slate-800">{gift.title}</p><span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-violet-700">{t(`lifecycle.${gift.lifecycle}`)}</span></div>
                {next && gift.canChangeLifecycle && <button type="button" disabled={busy !== null} onClick={() => void advance(gift)} className="shrink-0 rounded-xl bg-slate-900 px-2.5 py-2 text-xs font-extrabold text-white disabled:opacity-45">{busy === gift.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : t(`actions.${next}`)}</button>}
                {gift.lifecycle === "given" && <Check className="h-5 w-5 shrink-0 text-emerald-500" aria-label={t("lifecycle.given")} />}
              </div>
              {!gift.canChangeLifecycle && <p className="mt-2 text-[0.68rem] font-semibold text-slate-400">{t("legacyReadOnly")}</p>}
            </article>
          );
        })}
      </div>

      <div className="my-4 h-px bg-violet-100" />
      <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-sky-600" /><h3 className="text-sm font-black text-slate-900">{t("linksTitle")}</h3></div>
      <form onSubmit={addLink} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input type="url" inputMode="url" required pattern="https://.*" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder={t("urlPlaceholder")} aria-label={t("urlPlaceholder")} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
        <input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} maxLength={280} placeholder={t("linkTitlePlaceholder")} aria-label={t("linkTitlePlaceholder")} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
        <button disabled={busy !== null || !linkUrl.trim()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 text-sm font-extrabold text-white disabled:opacity-45 sm:col-span-2">{busy === "link" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{t("saveLink")}</button>
      </form>
      <div className="mt-3 space-y-2">
        {model && model.savedLinks.length === 0 && <Empty text={t("emptyLinks")} />}
        {model?.savedLinks.map((link) => <div key={link.id} className="flex items-center gap-2 rounded-xl bg-sky-50/80 p-2.5"><a href={link.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1"><span className="flex items-center gap-1.5 truncate text-sm font-extrabold text-sky-800">{link.title || host(link.url)}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></span><span className="block truncate text-[0.68rem] font-semibold text-sky-600/70">{host(link.url)}</span></a><button type="button" disabled={busy !== null} onClick={() => { if (window.confirm(t("confirmDeleteLink"))) void run(link.id, () => removePersonGiftLink(link.id)); }} aria-label={t("deleteLink")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-500 shadow-sm disabled:opacity-45"><Trash2 className="h-4 w-4" /></button></div>)}
      </div>
      <p className="mt-3 text-[0.68rem] font-semibold leading-5 text-slate-400">{t("linkDisclaimer")}</p>
    </section>
  );
}

function host(url: string): string { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } }
function Loading({ label }: { label: string }) { return <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />{label}</p>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-500">{text}</p>; }
