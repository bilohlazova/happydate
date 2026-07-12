import { Cake, Heart, MessageCircleHeart } from "lucide-react";
import type { ReactNode } from "react";

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
  return (
    <section className="rounded-[0.95rem] bg-white px-3.5 py-2.5 shadow-[0_6px_16px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-black leading-5 text-slate-950">
          {peopleCount} ważne osoby
        </p>
        <Heart className="h-[18px] w-[18px] shrink-0 fill-blue-600 text-blue-600" />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <StatPill
          tone="pink"
          icon={<Cake className="h-3.5 w-3.5" />}
          value={birthdaysThisWeek}
          label="urodziny"
        />
        <StatPill
          tone="blue"
          icon={<MessageCircleHeart className="h-3.5 w-3.5" />}
          value={waitingForContact}
          label="czekają na kontakt"
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
    <div className={`flex min-w-0 items-center gap-1.5 ${palette}`}>
      <span className="shrink-0">
        {icon}
      </span>
      <span className="text-sm font-black leading-5 text-slate-950">{value}</span>
      <span className="truncate text-xs font-bold leading-5 text-slate-600">
        {label}
      </span>
    </div>
  );
}
