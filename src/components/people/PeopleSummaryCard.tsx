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
    <section className="rounded-[1.25rem] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
      <div className="flex items-center gap-2">
        <p className="text-xl font-black text-slate-950">
          {peopleCount} ważne osoby
        </p>
        <Heart className="h-6 w-6 fill-blue-600 text-blue-600" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <StatPill
          tone="pink"
          icon={<Cake className="h-4 w-4" />}
          value={birthdaysThisWeek}
          label="urodziny"
        />
        <StatPill
          tone="blue"
          icon={<MessageCircleHeart className="h-4 w-4" />}
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
      ? "bg-pink-50 text-pink-600"
      : "bg-blue-50 text-blue-600";

  return (
    <div className={`rounded-[1rem] ${palette} px-3 py-2.5`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-lg font-black text-slate-950">{value}</span>
      </div>
      <p className="mt-0.5 text-xs font-bold leading-4 text-slate-600">
        {label}
      </p>
    </div>
  );
}
