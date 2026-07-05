import Avatar from "@/components/people/Avatar";

import Card from "@/components/ui/Card";
import InfoBadge from "@/components/ui/InfoBadge";
import Panel from "@/components/ui/Panel";

import type { PersonRow } from "@/lib/repositories/person.types";
import { getRelationshipInfo } from "@/lib/people/relationship";
import { Cake, ChevronRight, Heart, Sparkles } from "lucide-react";

interface PersonCardProps {
  person: PersonRow;
  variant?: "detail" | "list";
  tags?: string[];
  memoriesCount?: number;
  nextDateLabel?: string | null;
  daysUntilNextDate?: number | null;
}

function formatBirthday(date: string | null): string | null {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

export default function PersonCard({
  person,
  variant = "detail",
  tags = [],
  memoriesCount = 0,
  nextDateLabel = null,
  daysUntilNextDate = null,
}: PersonCardProps) {
  const relationship = getRelationshipInfo(
    person.relationship
  );

  const birthday = formatBirthday(
    person.birthday
  );

  if (variant === "list") {
    const displayTags = tags.slice(0, 3);
    const nextDate = nextDateLabel ?? birthday;
    const hasCountdown = typeof daysUntilNextDate === "number";
    const accent = getAccent(person.id);

    return (
      <article className="group grid min-h-[8.4rem] grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[1.5rem] bg-white p-4 shadow-[0_13px_34px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(37,99,235,0.12)] sm:grid-cols-[auto_1fr_minmax(9.5rem,auto)_auto] sm:gap-5">
        <div className="relative">
          <Avatar
            name={person.name}
            className="h-20 w-20 text-2xl sm:h-24 sm:w-24"
          />
          <span
            className={`absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full ${accent.badge} text-white ring-4 ring-white`}
          >
            {relationship?.icon ? (
              <span className="text-base leading-none">{relationship.icon}</span>
            ) : (
              <Heart className="h-4 w-4 fill-white" />
            )}
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-2xl font-black leading-7 text-slate-950">
            {person.name}
          </h2>
          <p className="mt-1 truncate text-sm font-medium text-slate-500">
            {relationship ? `${relationship.icon} ${relationship.label}` : "👤 Bliska osoba"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {displayTags.length > 0 ? (
              displayTags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full ${accent.soft} px-3 py-1 text-xs font-bold ${accent.text}`}
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                ✨ Dodaj tag
              </span>
            )}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Sparkles className="h-4 w-4" />
            {memoriesCount} {getMemoryLabel(memoriesCount)}
          </p>
        </div>

        <div className="hidden items-center gap-4 border-l border-slate-200 pl-6 sm:flex">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full ${accent.soft} ${accent.text}`}
          >
            <Cake className="h-7 w-7" strokeWidth={2.3} />
          </span>
          <div>
            <p className={`text-xl font-black ${accent.text}`}>
              {hasCountdown ? `Za ${daysUntilNextDate} dni` : "Brak daty"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {nextDate ?? "Dodaj ważną datę"}
            </p>
          </div>
        </div>

        <ChevronRight className="h-7 w-7 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </article>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center">
        <Avatar name={person.name} />

        <h1 className="mt-5 text-3xl font-bold text-gray-900">
          {person.name}
        </h1>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {relationship && (
            <InfoBadge icon={relationship.icon}>
              {relationship.label}
            </InfoBadge>
          )}

          {birthday && (
            <InfoBadge icon="🎂">
              {birthday}
            </InfoBadge>
          )}
        </div>
      </div>

      {person.notes && (
        <Panel className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Notatki
          </h2>

          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {person.notes}
          </p>
        </Panel>
      )}
    </Card>
  );
}

function getMemoryLabel(count: number): string {
  if (count === 1) {
    return "wspomnienie";
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return "wspomnienia";
  }

  return "wspomnień";
}

function getAccent(seed: string) {
  const palettes = [
    {
      badge: "bg-pink-500",
      soft: "bg-pink-50",
      text: "text-pink-600",
    },
    {
      badge: "bg-blue-600",
      soft: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      badge: "bg-emerald-600",
      soft: "bg-emerald-50",
      text: "text-emerald-600",
    },
    {
      badge: "bg-amber-500",
      soft: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      badge: "bg-violet-600",
      soft: "bg-violet-50",
      text: "text-violet-600",
    },
  ];

  const index = seed
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0) % palettes.length;

  return palettes[index];
}
