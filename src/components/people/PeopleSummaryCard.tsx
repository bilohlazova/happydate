import { Cake, Clock3, Heart } from "lucide-react";
import type { ReactNode } from "react";

import { AddPersonMenuItems } from "@/components/people/AddPersonMenu";

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
    <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:p-8">
      <div className="grid gap-7 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-black text-slate-950 sm:text-3xl">
              {peopleCount} ważne osoby
            </p>
            <Heart className="h-8 w-8 fill-blue-600 text-blue-600" />
          </div>
          <p className="mt-4 max-w-xs text-lg font-medium leading-8 text-slate-500">
            Happy pamięta o tym, co najważniejsze
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <StatPill
              tone="pink"
              icon={<Cake className="h-6 w-6" />}
              value={birthdaysThisWeek}
              label="urodziny w tym tygodniu"
            />
            <StatPill
              tone="blue"
              icon={<Clock3 className="h-6 w-6" />}
              value={waitingForContact}
              label="osoby czekają na kontakt"
            />
          </div>

          <button
            type="button"
            className="mt-6 text-left text-base font-bold text-blue-600 transition hover:text-blue-500"
          >
            Zobacz nadchodzące wydarzenia →
          </button>
        </div>

        <div className="hidden border-l border-slate-200 pl-7 md:block">
          <AddPersonMenuItems />
        </div>
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
    <div className={`rounded-2xl ${palette} p-4`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-xl font-black text-slate-950">{value}</span>
      </div>
      <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
        {label}
      </p>
    </div>
  );
}
