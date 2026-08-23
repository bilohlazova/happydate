import { Cake, Heart, MessageCircleHeart } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface PeopleSummaryCardProps {
  peopleCount: number;
  birthdaysThisWeek: number;
  waitingForContact: number;
}

export function PeopleSummaryCard({
  peopleCount,
  birthdaysThisWeek,
  waitingForContact,
}: PeopleSummaryCardProps) {
  const t = useTranslations("people");
  return (
    <section className="people-summary-card rounded-[1.4rem] bg-white p-4 ring-1 ring-slate-100 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="people-summary-card__eyebrow">{t("summary.overview")}</p>
          <p className="mt-1 text-lg font-black leading-6 text-slate-950">
          {t("summary.importantPeople", { count: peopleCount })}
          </p>
        </div>
        <span className="people-summary-card__heart"><Heart className="h-5 w-5 fill-current" /></span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatPill
          tone="pink"
          icon={<Cake className="h-3.5 w-3.5" />}
          value={birthdaysThisWeek}
          label={t("summary.birthdays")}
        />
        <StatPill
          tone="blue"
          icon={<MessageCircleHeart className="h-3.5 w-3.5" />}
          value={waitingForContact}
          label={t("summary.waitingForContact")}
        />
      </div>
    </section>
  );
}

function StatPill({
  tone,
  icon,
  value,
  label,
}: {
  tone: "pink" | "blue";
  icon: ReactNode;
  value: number;
  label: string;
}) {
  const palette =
    tone === "pink"
      ? "text-pink-600"
      : "text-blue-600";

  return (
    <div className={`people-summary-stat flex min-w-0 items-center gap-2.5 ${palette}`}>
      <span className="people-summary-stat__icon shrink-0">
        {icon}
      </span>
      <span className="min-w-0"><strong className="block text-base font-black leading-5 text-slate-950">{value}</strong><span className="block truncate text-[0.68rem] font-bold leading-4 text-slate-500">{label}</span></span>
    </div>
  );
}
