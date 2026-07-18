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
    <section className="flex min-h-14 items-center justify-between gap-3 rounded-[0.95rem] bg-blue-50 px-3.5 py-2 shadow-[0_6px_16px_rgba(37,99,235,0.05)]">
      <div className="min-w-0">
        <p className="truncate text-xs font-black text-slate-950">
          {title}
        </p>
        <p className="truncate text-sm font-bold leading-5 text-slate-950">
          {message}
        </p>
        {recommendation.href ? (
          <Link
            href={recommendation.href}
            className="text-left text-xs font-extrabold leading-4 text-blue-600 transition hover:text-blue-500"
          >
            {actionLabel}
          </Link>
        ) : (
          <span className="text-left text-xs font-extrabold leading-4 text-blue-600">
            {actionLabel}
          </span>
        )}
      </div>

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-[0_6px_14px_rgba(37,99,235,0.07)]">
        {recommendation.icon}
      </div>
    </section>
  );
}
