import Avatar from "@/components/people/Avatar";
import { getPersonRelationLabel } from "@/components/people/peopleRelations";

import Card from "@/components/ui/Card";
import InfoBadge from "@/components/ui/InfoBadge";
import Panel from "@/components/ui/Panel";

import type { PersonRow } from "@/lib/repositories/person.types";
import { getRelationshipInfo } from "@/lib/people/relationship";
import { BookOpen, ChevronRight, Gift, MessageCircle } from "lucide-react";

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
  const relationLabel = getPersonRelationLabel(person);
  const displayedRelationship = getRelationshipInfo(relationLabel);
  const birthday = formatBirthday(person.birthday);

  if (variant === "list") {
    const personData = person as PersonCardData;
    const displayTags = tags.slice(0, 1);
    const nextDate = nextDateLabel ?? birthday;
    const hasCountdown = typeof daysUntilNextDate === "number";
    const hasBirthday = Boolean(nextDate);
    const isFavorite = Boolean(
      personData.favorite ?? personData.is_favorite ?? false
    );
    const accent = getBirthdayAccent(daysUntilNextDate);
    const memoryText =
      memoriesCount > 0
        ? `📖 ${memoriesCount}`
        : "📖 Brak wspomnień";

    return (
      <article className="group relative overflow-hidden rounded-[0.9rem] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.035)] ring-1 ring-slate-100">
        <div className="absolute inset-y-0 right-0 flex w-32 items-stretch justify-end bg-slate-50">
          <span
            className="flex w-10 items-center justify-center bg-sky-500 text-white"
            aria-label="Dodaj wspomnienie"
          >
            <BookOpen className="h-4 w-4" />
          </span>
          <span
            className="flex w-10 items-center justify-center bg-cyan-500 text-white"
            aria-label="Pomysł na prezent"
          >
            <Gift className="h-4 w-4" />
          </span>
          <span
            className="flex w-10 items-center justify-center bg-slate-700 text-white"
            aria-label="Skontaktuj się"
          >
            <MessageCircle className="h-4 w-4" />
          </span>
        </div>

        <div className="relative grid min-h-14 grid-cols-[2.25rem_minmax(0,1fr)_3.35rem_1rem] items-center gap-2 bg-white px-2.5 py-1.5 transition-transform duration-200 group-hover:-translate-x-10 group-active:-translate-x-10 group-focus-within:-translate-x-10">
          {isFavorite && (
            <span
              className="absolute right-1.5 top-1 text-[0.55rem] leading-none"
              aria-label="Ulubiona osoba"
            >
              ⭐
            </span>
          )}

          <div>
            <Avatar
              name={person.name}
              colorToken={personData.color_token}
              className="!h-9 !w-9 !text-[0.7rem] !shadow-none !ring-0"
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-[0.95rem] font-bold leading-5 text-slate-950">
              {person.name}
            </h2>

            <p className="truncate text-[0.72rem] font-semibold leading-4 text-slate-500">
            {buildRelationLine(displayedRelationship, displayTags)}
            </p>

            <p className="truncate text-[0.68rem] font-semibold leading-3 text-slate-500">
              {memoryText}
            </p>
          </div>

          <div className="flex min-w-0 items-center justify-end border-l border-slate-100 pl-1.5">
            <div className="text-right">
              {hasBirthday ? (
                <>
                  <p className={`text-[0.65rem] font-black leading-3.5 ${accent.text}`}>
                    {hasCountdown ? `Za ${daysUntilNextDate} dni` : "🎂"}
                  </p>
                  <p className="truncate text-[0.6rem] font-semibold leading-3.5 text-slate-500">
                    {nextDate}
                  </p>
                </>
              ) : (
                <p className="text-[0.6rem] font-bold leading-3.5 text-slate-400">
                  Brak daty
                </p>
              )}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-sky-600" />
        </div>
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
          {displayedRelationship && (
            <InfoBadge icon={displayedRelationship.icon}>
              {displayedRelationship.label}
            </InfoBadge>
          )}

          {birthday && <InfoBadge icon="🎂">{birthday}</InfoBadge>}
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

function buildRelationLine(
  relationship: ReturnType<typeof getRelationshipInfo>,
  tags: string[]
): string {
  const relationText = relationship
    ? `${relationship.icon} ${relationship.label}`
    : "👤 Bliska osoba";
  const tagText = tags.map(formatTagPreview);

  return [relationText, ...tagText].join(" • ");
}

function getBirthdayAccent(daysUntil: number | null) {
  if (daysUntil === null) {
    return { text: "text-slate-400" };
  }

  if (daysUntil === 0) {
    return { text: "text-pink-600" };
  }

  if (daysUntil <= 7) {
    return { text: "text-sky-600" };
  }

  if (daysUntil <= 30) {
    return { text: "text-emerald-600" };
  }

  return { text: "text-slate-500" };
}
