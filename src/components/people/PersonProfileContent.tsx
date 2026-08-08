"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Ban,
  BookHeart,
  Bot,
  CalendarDays,
  CheckCircle2,
  Heart,
  NotebookPen,
  Sparkles,
  Target,
} from "lucide-react";

import ChatAssistantModal from "@/components/ChatAssistantModal";
import Avatar from "@/components/people/Avatar";
import { PersonGiftManager } from "@/components/people/PersonGiftManager";
import type {
  PersonBrainInsightViewModel,
  PersonKnowledgeValueViewModel,
  PersonProfileViewModel,
  PersonTimelineItemViewModel,
} from "@/lib/people/peopleData.types";
import { MobileUI } from "@/lib/theme/mobile";

type Translator = ReturnType<typeof useTranslations<"person">>;

export function PersonProfileContent({
  loading,
  failed,
  viewModel,
}: {
  loading: boolean;
  failed: boolean;
  viewModel: PersonProfileViewModel | null;
}) {
  const t = useTranslations("person");
  const locale = useLocale();
  const [assistantOpen, setAssistantOpen] = useState(false);

  if (loading) return <PersonProfileSkeleton label={t("profile.loading")} />;

  if (failed || !viewModel?.found || !viewModel.hero) {
    return <PersonProfileMessage>{t(failed ? "profile.loadError" : "profile.notFound")}</PersonProfileMessage>;
  }

  const { hero } = viewModel;
  return (
    <>
      <main
        aria-label={t("accessibility.profile", { name: hero.name })}
        className={`${MobileUI.screen} ${MobileUI.contentBottom} pt-3 sm:pt-5`}
      >
        <div className="mx-auto grid w-full max-w-[1040px] gap-3 px-4 sm:px-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-4">
          <div className="flex min-w-0 flex-col gap-3">
            <ProfileHero
              model={viewModel}
              onAsk={() => setAssistantOpen(true)}
              t={t}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <KnowledgeSection icon={<Heart />} title={t("profileUi.likes")} tone="rose" items={viewModel.likes} empty={t("profileUi.empty.likes")} />
              <KnowledgeSection icon={<Ban />} title={t("profileUi.dislikes")} tone="slate" items={viewModel.dislikes} empty={t("profileUi.empty.dislikes")} />
            </div>

            <KnowledgeSection icon={<Target />} title={t("profileUi.interests")} tone="sky" items={viewModel.interests} empty={t("profileUi.empty.interests")} />
            <KnowledgeSection icon={<NotebookPen />} title={t("profileUi.importantFacts")} tone="amber" items={viewModel.importantFacts} empty={t("profileUi.empty.importantFacts")} />
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <PersonGiftManager personId={hero.id} personName={hero.name} />

            <TimelineSection items={viewModel.timeline} locale={locale} t={t} />
            <BrainSection items={viewModel.brainInsights} t={t} />
          </div>
        </div>
      </main>

      <ChatAssistantModal open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  );
}

function ProfileHero({
  model,
  onAsk,
  t,
}: {
  model: PersonProfileViewModel;
  onAsk: () => void;
  t: Translator;
}) {
  const hero = model.hero!;
  const peopleT = useTranslations("people");
  const healthLabel = model.health ? t(`profileUi.health.${model.health.level}`) : null;
  const relationVariant = hero.gender === "female" || hero.gender === "male"
    ? hero.gender
    : "neutral";
  const relationLabel = hero.relationKey && hero.relationKey !== "other"
    ? peopleT(`relationships.${hero.relationKey}.${relationVariant}`)
    : hero.relationLabel;
  return (
    <section className="relative overflow-hidden rounded-[1.4rem] border border-white/80 bg-white/85 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
      <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-sky-200/60 to-blue-100/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-center gap-3.5">
        <Avatar name={hero.name} className="!h-16 !w-16 !shrink-0 !text-xl !shadow-lg sm:!h-20 sm:!w-20 sm:!text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{hero.name}</h1>
          {relationLabel && <p className="mt-0.5 truncate text-sm font-bold text-slate-500">{relationLabel}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
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

      {model.health && model.health.missingAreas.length > 0 && (
        <div className="relative mt-3 rounded-2xl bg-slate-50/90 px-3 py-2.5">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-500">{t("profileUi.health.missing")}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
            {model.health.missingAreas.slice(0, 3).map((area) => t(`profileUi.health.areas.${area.id}`)).join(" • ")}
          </p>
        </div>
      )}

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

function KnowledgeSection({ icon, title, tone, items, empty }: { icon: ReactNode; title: string; tone: keyof typeof toneClasses; items: PersonKnowledgeValueViewModel[]; empty: string }) {
  return (
    <ProfileSection icon={icon} title={title} tone={tone}>
      {items.length ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => <li key={item.id} className="max-w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold leading-5 text-slate-700 ring-1 ring-slate-100">{item.value}</li>)}
        </ul>
      ) : <EmptyCopy>{empty}</EmptyCopy>}
    </ProfileSection>
  );
}

function TimelineSection({ items, locale, t }: { items: PersonTimelineItemViewModel[]; locale: string; t: Translator }) {
  return (
    <ProfileSection icon={<BookHeart />} title={t("profileUi.timeline")} tone="sky">
      {items.length ? (
        <ol className="space-y-0.5">
          {items.map((item, index) => (
            <li key={item.id} className="grid grid-cols-[1.7rem_minmax(0,1fr)] gap-2.5">
              <div className="flex flex-col items-center">
                <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${item.kind === "gift_given" ? "bg-emerald-400" : "bg-sky-400"}`} />
                {index < items.length - 1 && <span className="my-1 min-h-8 w-px flex-1 bg-slate-200" />}
              </div>
              <div className="pb-3">
                <p className="text-sm font-extrabold leading-5 text-slate-800">{item.title}</p>
                <p className="mt-0.5 text-[0.7rem] font-bold text-slate-400">{formatTimelineDate(item.date, locale)}</p>
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
    <ProfileSection icon={<Bot />} title={t("profileUi.brain")} tone="violet" accent>
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

function ProfileSection({ icon, title, tone, accent = false, children }: { icon: ReactNode; title: string; tone: keyof typeof toneClasses; accent?: boolean; children: ReactNode }) {
  return (
    <section className={`rounded-[1.2rem] border p-3.5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-4 ${accent ? "border-violet-100 bg-gradient-to-br from-violet-50/90 to-white/90" : "border-white/80 bg-white/85"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl [&>svg]:h-4 [&>svg]:w-4 ${toneClasses[tone]}`}>{icon}</span>
        <h2 className="text-sm font-black text-slate-900 sm:text-base">{title}</h2>
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
