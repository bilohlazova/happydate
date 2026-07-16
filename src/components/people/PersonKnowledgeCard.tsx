import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/config";

import Card from "@/components/ui/Card";
import type { PersonKnowledge } from "@/lib/brain/types";
import {
  getPersonKnowledgeCardModel,
} from "@/lib/people/personKnowledgePresentation";

interface PersonKnowledgeCardProps {
  knowledge: PersonKnowledge;
}

const STATISTICS = [
  { key: "facts", icon: "📌" }, { key: "gifts", icon: "🎁" }, { key: "memories", icon: "❤️" }, { key: "profile", icon: "⭐" },
] as const;

export default function PersonKnowledgeCard({
  knowledge,
}: PersonKnowledgeCardProps) {
  const t = useTranslations("person");
  const locale = useLocale() as AppLocale;
  const model = getPersonKnowledgeCardModel(knowledge, locale);
  const statisticValues = {
    facts: String(model.knownFactsCount),
    gifts: String(model.giftIdeasCount),
    memories: String(model.memoriesCount),
    profile: `${model.completenessScore}%`,
  };

  return (
    <Card className="overflow-hidden p-4 sm:p-5">
      <section aria-labelledby="person-knowledge-title" aria-label={t("accessibility.knowledge")}>
        <div>
          <h2
            id="person-knowledge-title"
            className="text-lg font-black text-slate-950"
          >
            {t("knowledge.title")}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {t("knowledge.subtitle")}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2" aria-label={t("knowledge.summary")}>
          {STATISTICS.map((statistic) => (
            <div
              key={statistic.key}
              className="min-w-0 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100"
            >
              <dt className="flex items-center gap-1.5 text-[0.68rem] font-bold leading-4 text-slate-500">
                <span aria-hidden="true">{statistic.icon}</span>
                <span>{t(`knowledge.${statistic.key}`)}</span>
              </dt>
              <dd className="mt-1 text-lg font-black leading-5 text-slate-950">
                {statisticValues[statistic.key]}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 rounded-2xl bg-sky-50 px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              {t("knowledge.completeness")}
            </h3>
            <p className="shrink-0 text-lg font-black text-sky-700">
              {model.completenessScore}%
            </p>
          </div>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
            {t("knowledge.completenessHint")}
          </p>
        </div>

        {model.hasKnowledge ? (
          <div className="mt-4 space-y-3">
            {model.chips.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label={t("knowledge.remembered")}>
                {model.chips.map((chip) => (
                  <span
                    key={`${chip.icon}-${chip.value}`}
                    className="max-w-full rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                  >
                    <span aria-hidden="true">{chip.icon} </span>
                    {chip.value}
                  </span>
                ))}
                {model.remainingChipCount > 0 && (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                    {t("knowledge.more", { count: model.remainingChipCount })}
                  </span>
                )}
              </div>
            )}

            {model.showGiftSummary && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                <span aria-hidden="true">🎁 </span>
                {t("knowledge.giftSaved")}
              </p>
            )}

            {model.latestMemoryDateLabel && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("knowledge.lastMemory")}
                </h3>
                <p className="mt-1 text-sm font-extrabold text-slate-900">
                  {model.latestMemoryDateLabel}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3.5">
            <p className="text-sm font-extrabold text-slate-900">
              {t("knowledge.emptyTitle")}
            </p>
            <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
              {t("knowledge.emptyDescription")}
            </p>
          </div>
        )}

        <Link
          href="/notes"
          aria-label={t("accessibility.addInformation")}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          {t("knowledge.addInformation")}
        </Link>
      </section>
    </Card>
  );
}
