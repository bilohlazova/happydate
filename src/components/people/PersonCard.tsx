import Avatar from "@/components/people/Avatar";

import Card from "@/components/ui/Card";
import InfoBadge from "@/components/ui/InfoBadge";
import Panel from "@/components/ui/Panel";

import type { PersonRow } from "@/lib/repositories/person.types";
import { getRelationshipInfo } from "@/lib/people/relationship";
import { MobileUI } from "@/lib/theme/mobile";
import { ChevronRight } from "lucide-react";

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
  const relationship = getRelationshipInfo(person.relationship);
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
    const accent = getAccent(person.id);
    const memoryText =
      memoriesCount > 0
        ? `📖 ${memoriesCount}`
        : "📖 Brak wspomnień";

    return (
      <article
        className={`group relative grid min-h-[4.25rem] grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(37,99,235,0.09)] sm:min-h-[4.5rem] ${MobileUI.card}`}
      >
        {isFavorite && (
          <span
            className="absolute right-2 top-1.5 text-[0.6rem] leading-none"
            aria-label="Ulubiona osoba"
          >
            ⭐
          </span>
        )}

        <div>
          <Avatar
            name={person.name}
            colorToken={personData.color_token}
            className="h-10 w-10 text-xs shadow-md sm:h-11 sm:w-11 sm:text-sm"
          />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-base font-bold leading-5 text-slate-950">
            {person.name}
          </h2>

          <p className="mt-0.5 truncate text-xs font-semibold leading-4 text-slate-500">
            {buildRelationLine(relationship, displayTags)}
          </p>

          <p className="truncate text-[0.7rem] font-semibold leading-4 text-slate-500">
            {memoryText}
          </p>
        </div>

        <div className="flex min-w-[3.35rem] items-center justify-end border-l border-slate-100 pl-2">
          <div className="text-right">
            {hasBirthday ? (
              <>
                <p className={`text-[0.7rem] font-black leading-4 ${accent.text}`}>
                  {hasCountdown ? `Za ${daysUntilNextDate} dni` : "🎂"}
                </p>
                <p className="max-w-[3.5rem] truncate text-[0.65rem] font-semibold leading-4 text-slate-500">
                  {nextDate}
                </p>
              </>
            ) : (
              <p className="max-w-[3.5rem] text-[0.65rem] font-bold leading-4 text-slate-400">
                Brak daty
              </p>
            )}
          </div>
        </div>

        <ChevronRight className="h-[18px] w-[18px] text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
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

function getAccent(seed: string) {
  const palettes = [
    { text: "text-pink-600" },
    { text: "text-blue-600" },
    { text: "text-emerald-600" },
    { text: "text-amber-600" },
    { text: "text-violet-600" },
  ];

  const index =
    seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    palettes.length;

  return palettes[index];
}
