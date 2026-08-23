"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export interface HappyRecommendation {
  title: string;
  message: string;
  actionLabel: string;
  icon: string;
  href?: string;
  translation?: {
    type: "birthday";
    name: string;
    days: number;
  };
}

interface HappyRecommendationCardProps {
  recommendation: HappyRecommendation | null;
}

export function HappyRecommendationCard({
  recommendation,
}: HappyRecommendationCardProps) {
  const t = useTranslations("people");
  if (!recommendation) {
    return null;
  }

  const known = recommendation.translation?.type === "birthday"
    ? recommendation.translation
    : null;
  const title = known ? t("recommendation.knownTitle") : recommendation.title;
  const message = known
    ? t("recommendation.birthday", { name: known.name, days: known.days })
    : recommendation.message;
  const actionLabel = known ? t("recommendation.giftIdeas") : recommendation.actionLabel;

  return (
    <section className="people-recommendation relative flex min-h-32 items-center justify-between gap-4 overflow-hidden rounded-[1.4rem] bg-blue-50 p-4 sm:p-5">
      <div className="relative z-10 min-w-0">
        <p className="people-recommendation__eyebrow text-xs font-black">
          {title}
        </p>
        <p className="mt-1 max-w-[36rem] text-base font-black leading-6 text-slate-950 sm:text-lg">
          {message}
        </p>
        {recommendation.href ? (
          <Link
            href={recommendation.href}
            className="people-recommendation__action mt-3 inline-flex min-h-9 items-center rounded-full bg-white px-3.5 text-left text-xs font-extrabold leading-4 text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-500"
          >
            {actionLabel}
          </Link>
        ) : (
          <span className="text-left text-xs font-extrabold leading-4 text-blue-600">
            {actionLabel}
          </span>
        )}
      </div>

      <div className="people-recommendation__gift relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-[0_12px_28px_rgba(37,99,235,0.12)] sm:h-16 sm:w-16 sm:text-3xl">
        {recommendation.icon}
      </div>
      <span className="people-recommendation__glow" aria-hidden="true" />
    </section>
  );
}
