"use client";

import type { GiftWorkspaceViewModel } from "@/lib/gifts/gift.types";
import { MobileUI } from "@/lib/theme/mobile";
import { useTranslations } from "next-intl";

interface GiftWorkspacePanelProps {
  workspace: GiftWorkspaceViewModel | null;
  hasError: boolean;
}

export function GiftWorkspacePanel({
  workspace,
  hasError,
}: GiftWorkspacePanelProps) {
  const t = useTranslations("gift");
  if (hasError) {
    return (
      <section className={`${MobileUI.card} mb-4 border-white/60 bg-white/80 p-4 backdrop-blur`}>
        <p className="text-sm text-slate-600">
          {t("workspace.loadError")}
        </p>
      </section>
    );
  }
  if (!workspace) {
    return (
      <section
        aria-label={t("workspace.loading")}
        className={`${MobileUI.card} mb-4 h-20 animate-pulse border-white/60 bg-white/60`}
      />
    );
  }

  return (
    <section className={`${MobileUI.card} mb-4 border-white/60 bg-white/80 p-4 backdrop-blur`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">{t("workspace.title")}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {workspace.activeIdeas.length
              ? t("workspace.activeCount", { count: workspace.activeIdeas.length })
              : t("workspace.empty")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-amber-50 px-2.5 py-1">
            {t("workspace.lifecycle.idea")}: {workspace.counts.idea}
          </span>
          <span className="rounded-full bg-sky-50 px-2.5 py-1">
            {t("workspace.lifecycle.selected")}: {workspace.counts.selected}
          </span>
          <span className="rounded-full bg-violet-50 px-2.5 py-1">
            {t("workspace.lifecycle.purchased")}: {workspace.counts.purchased}
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1">
            {t("workspace.lifecycle.given")}: {workspace.counts.given}
          </span>
        </div>
      </div>

      {(workspace.activeIdeas.length > 0 || workspace.history.length > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <GiftList title={t("workspace.activeIdeas")} items={workspace.activeIdeas} />
          <GiftList title={t("workspace.history")} items={workspace.history} />
        </div>
      )}

      {(workspace.personIds.length > 0 || workspace.eventIds.length > 0) && (
        <p className="mt-3 text-xs text-slate-500">
          {t("workspace.relations", { people: workspace.personIds.length, events: workspace.eventIds.length })}
        </p>
      )}
    </section>
  );
}

function GiftList({
  title,
  items,
}: {
  title: string;
  items: GiftWorkspaceViewModel["activeIdeas"];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <ul className="mt-1 space-y-1 text-sm text-slate-700">
        {items.slice(0, 3).map((gift) => (
          <li key={gift.id} className="truncate">• {gift.title}</li>
        ))}
      </ul>
    </div>
  );
}
