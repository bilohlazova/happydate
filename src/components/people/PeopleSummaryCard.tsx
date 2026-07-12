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
    <section className="rounded-[1rem] bg-white px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-black leading-6 text-slate-950">
          {peopleCount} ważne osoby
        </p>
        <Heart className="h-5 w-5 shrink-0 fill-blue-600 text-blue-600" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
