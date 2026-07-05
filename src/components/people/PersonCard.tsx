import Avatar from "@/components/people/Avatar";

import Card from "@/components/ui/Card";
import InfoBadge from "@/components/ui/InfoBadge";
import Panel from "@/components/ui/Panel";

import type { PersonRow } from "@/lib/repositories/person.types";
import { getRelationshipInfo } from "@/lib/people/relationship";
import { BookOpen, Cake, ChevronRight, Heart } from "lucide-react";

type PersonCardData = PersonRow & {
  color_token?: string | null;
  favorite?: boolean | null;
  is_favorite?: boolean | null;
};

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
    const personData = person as PersonCardData;
    const displayTags = tags.slice(0, 2);
    const nextDate = nextDateLabel ?? birthday;
    const hasCountdown = typeof daysUntilNextDate === "number";
    const hasBirthday = Boolean(nextDate);
    const isFavorite = Boolean(
      personData.favorite ?? personData.is_favorite ?? false
    );
    const accent = getAccent(person.id);

    return (
      <article className="group relative grid min-h-[6.1rem] grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[1.2rem] bg-white px-3 py-3 shadow-[0_10px_26px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(37,99,235,0.1)] sm:min-h-[6.4rem] sm:gap-4 sm:px-4">
        {isFavorite && (
          <span
            className="absolute right-2.5 top-2 text-xs leading-none"
            aria-label="Ulubiona osoba"
          >
            ⭐
          </span>
        )}

        <div className="relative">
          <Avatar
            name={person.name}
            colorToken={personData.color_token}
            className="h-14 w-14 text-lg shadow-lg sm:h-16 sm:w-16 sm:text-xl"
          />
          <span
            className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full ${accent.badge} text-white ring-[3px] ring-white sm:h-8 sm:w-8`}
          >
            {relationship?.icon ? (
              <span className="text-xs leading-none sm:text-sm">
                {relationship.icon}
              </span>
            ) : (
              <Heart className="h-3.5 w-3.5 fill-white" />
            )}
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-[1.38rem] font-black leading-6 text-slate-950 sm:text-2xl sm:leading-7">
            {person.name}
          </h2>
          <p className="mt-0.5 truncate text-[0.82rem] font-semibold text-slate-500 sm:text-sm">
            {relationship
              ? `${relationship.icon} ${relationship.label}`
              : "👤 Bliska osoba"}
          </p>

          {displayTags.length > 0 && (
            <p className={`mt-1 truncate text-[0.74rem] font-bold ${accent.text}`}>
              {displayTags.map(formatTagPreview).join(" • ")}
            </p>
          )}

          <p
            className={`mt-1.5 flex items-center gap-1 text-[0.72rem] font-semibold sm:text-xs ${
              memoriesCount > 0 ? "text-slate-500" : "text-blue-600"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {memoriesCount > 0
              ? `${memoriesCount} ${getMemoryLabel(memoriesCount)}`
              : "Dodaj pierwsze wspomnienie"}
          </p>
        </div>

        <div className="flex min-w-[4.75rem] items-center justify-end gap-2 border-l border-slate-100 pl-2 sm:min-w-[8.75rem] sm:gap-3 sm:pl-5">
          {hasBirthday && (
            <span
              className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-full ${accent.soft} ${accent.text} sm:flex`}
            >
              <Cake className="h-5 w-5" strokeWidth={2.3} />
            </span>
          )}
          <div className="text-right">
            {hasBirthday ? (
              <>
                <p
                  className={`text-sm font-black leading-5 ${accent.text} sm:text-lg`}
                >
                  {hasCountdown ? `Za ${daysUntilNextDate} dni` : "Urodziny"}
                </p>
                <p className="mt-0.5 max-w-[5.2rem] truncate text-[0.7rem] font-medium text-slate-500 sm:max-w-none sm:text-xs">
                  {nextDate}
                </p>
              </>
            ) : (
              <p className="max-w-[4.6rem] text-[0.68rem] font-bold leading-4 text-slate-400 sm:max-w-[7rem] sm:text-xs">
                Brak daty urodzin
              </p>
            )}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600 sm:h-6 sm:w-6" />
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

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return "wspomnienia";
  }

  return "wspomnień";
}

function formatTagPreview(tag: string): string {
  const normalized = tag.toLowerCase();

  if (normalized.includes("kaw") || normalized.includes("latte")) {
    return `☕ ${tag}`;
  }

  if (normalized.includes("kwiat") || normalized.includes("tulipan")) {
    return `🌷 ${tag}`;
  }

  if (normalized.includes("prezent") || normalized.includes("gift")) {
    return `🎁 ${tag}`;
  }

  if (normalized.includes("jedz") || normalized.includes("restaurant")) {
    return `🍽️ ${tag}`;
  }

  if (normalized.includes("sport") || normalized.includes("gry")) {
    return `⚽ ${tag}`;
  }

  return `✨ ${tag}`;
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
