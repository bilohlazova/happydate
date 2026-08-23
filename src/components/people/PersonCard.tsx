import Avatar from "@/components/people/Avatar";
import { getPersonRelationKey, getPersonRelationLabel } from "@/components/people/peopleRelations";

import Card from "@/components/ui/Card";
import InfoBadge from "@/components/ui/InfoBadge";
import Panel from "@/components/ui/Panel";

import type { PersonRow } from "@/lib/repositories/person.types";
import { getRelationshipInfo } from "@/lib/people/relationship";
import { BookHeart, Cake, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/dateLocales";
import type { AppLocale } from "@/i18n/config";

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

function formatBirthday(date: string | null, locale: AppLocale): string | null {
  if (!date) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  return format(new Date(year, month - 1, day), "d MMMM", { locale: getDateFnsLocale(locale) });
}

export default function PersonCard({
  person,
  variant = "detail",
  tags = [],
  memoriesCount = 0,
  nextDateLabel = null,
  daysUntilNextDate = null,
}: PersonCardProps) {
  const t = useTranslations("people");
  const personT = useTranslations("person");
  const locale = useLocale() as AppLocale;
  const relationLabel = getPersonRelationLabel(person);
  const displayedRelationship = getRelationshipInfo(relationLabel);
  const birthday = formatBirthday(person.birthday, locale);
  const relationKey = getPersonRelationKey(person);
  const relationGender = person.gender === "female" || person.gender === "male" ? person.gender : "neutral";
  const localizedRelation = relationKey && relationKey !== "other" ? t(`relationships.${relationKey}.${relationGender}`) : relationLabel;

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
    const memoryText = memoriesCount > 0 ? t("card.memories", { count: memoriesCount }) : t("card.noMemories");

    return (
      <article className={`people-person-card people-person-card--${accent.tone} group relative overflow-hidden rounded-[0.9rem] bg-white ring-1 ring-slate-100`}>
        <span className="people-person-card__accent" aria-hidden="true" />
        <div className="people-person-card__content relative grid min-h-[5.5rem] grid-cols-[3rem_minmax(0,1fr)_auto_1.15rem] items-center gap-3 bg-white px-3.5 py-3">
          {isFavorite && (
            <span
              className="absolute right-1.5 top-1 text-[0.55rem] leading-none"
              aria-label={t("card.favorite")}
            >
              ⭐
            </span>
          )}

          <div>
            <Avatar
              name={person.name}
              colorToken={personData.color_token}
              className="!h-11 !w-11 !rounded-[0.9rem] !text-[0.72rem] !shadow-[0_8px_18px_rgba(14,165,233,0.16)] !ring-2 !ring-white"
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-black leading-5 text-slate-950">
              {person.name}
            </h2>

            <p className="mt-0.5 truncate text-[0.72rem] font-bold leading-4 text-slate-500">
            {buildRelationLine(displayedRelationship, localizedRelation || t("relationships.closePerson"), displayTags)}
            </p>

            <p className="mt-1 flex items-center gap-1 truncate text-[0.66rem] font-semibold leading-3 text-slate-400">
              <BookHeart className="h-3 w-3 shrink-0" />{memoryText.replace(/^📖\s*/, "")}
            </p>
          </div>

          <div className="flex min-w-0 items-center justify-end">
            <div className={`people-person-card__date text-right ${hasBirthday ? `people-person-card__date--${accent.tone}` : ""}`}>
              {hasBirthday ? (
                <>
                  <p className={`flex items-center justify-end gap-1 text-[0.65rem] font-black leading-3.5 ${accent.text}`}>
                    <Cake className="h-3 w-3" />
                    {hasCountdown ? t("birthday.countdown", { days: daysUntilNextDate }) : "🎂"}
                  </p>
                  <p className="truncate text-[0.6rem] font-semibold leading-3.5 text-slate-500">
                    {nextDate}
                  </p>
                </>
              ) : (
                <p className="text-[0.6rem] font-bold leading-3.5 text-slate-400">
                  {t("birthday.missing")}
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
              {localizedRelation}
            </InfoBadge>
          )}

          {birthday && <InfoBadge icon="🎂">{birthday}</InfoBadge>}
        </div>
      </div>

      {person.notes && (
        <Panel className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {personT("details.notes")}
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
  relationLabel: string,
  tags: string[]
): string {
  const relationText = relationship ? `${relationship.icon} ${relationLabel}` : `👤 ${relationLabel}`;
  const tagText = tags.map(formatTagPreview);

  return [relationText, ...tagText].join(" • ");
}

function getBirthdayAccent(daysUntil: number | null) {
  if (daysUntil === null) {
    return { text: "text-slate-400", tone: "none" };
  }

  if (daysUntil === 0) {
    return { text: "text-pink-600", tone: "today" };
  }

  if (daysUntil <= 7) {
    return { text: "text-sky-600", tone: "soon" };
  }

  if (daysUntil <= 30) {
    return { text: "text-emerald-600", tone: "later" };
  }

  return { text: "text-slate-500", tone: "none" };
}
