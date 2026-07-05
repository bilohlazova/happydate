"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import PersonCard from "@/components/people/PersonCard";
import {
  HappyRecommendationCard,
  type HappyRecommendation,
} from "@/components/people/HappyRecommendationCard";
import { PeopleHeader } from "@/components/people/PeopleHeader";
import { PeopleSearch } from "@/components/people/PeopleSearch";
import { PeopleSummaryCard } from "@/components/people/PeopleSummaryCard";
import { AddPersonMenu } from "@/components/people/AddPersonMenu";
import type { MemoryRow } from "@/lib/repositories/memory.types";
import type { PersonRow } from "@/lib/repositories/person.types";

const COLLAPSE_THRESHOLD = 20;
const COLLAPSED_VISIBLE_COUNT = 10;

interface PeoplePageContentProps {
  loading: boolean;
  people: PersonRow[];
  memories: MemoryRow[];
  recommendation: HappyRecommendation | null;
}

type PersonWithFavorite = PersonRow & {
  favorite?: boolean | null;
  is_favorite?: boolean | null;
};

interface PersonListItem {
  person: PersonRow;
  tags: string[];
  memoriesCount: number;
  nextDateLabel: string | null;
  daysUntilNextDate: number | null;
  isFavorite: boolean;
  searchText: string;
}

export function PeoplePageContent({
  loading,
  people,
  memories,
  recommendation,
}: PeoplePageContentProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const peopleViewModels = useMemo(
    () =>
      people.map((person) => {
        const personMemories = memories.filter(
          (memory) => memory.person_id === person.id
        );
        const tags = getTagsForPerson(person, personMemories);
        const birthday = getBirthdayInfo(person.birthday);

        return {
          person,
          tags,
          memoriesCount: personMemories.length,
          nextDateLabel: birthday?.label ?? null,
          daysUntilNextDate: birthday?.daysUntil ?? null,
          isFavorite: isFavoritePerson(person),
          searchText: buildSearchText(person, tags, personMemories),
        };
      }),
    [memories, people]
  );

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return peopleViewModels;
    }

    return peopleViewModels.filter((item) =>
      item.searchText.includes(normalizedQuery)
    );
  }, [peopleViewModels, query]);

  const birthdaysThisWeek = peopleViewModels.filter(
    (item) =>
      typeof item.daysUntilNextDate === "number" &&
      item.daysUntilNextDate <= 7
  ).length;

  const waitingForContact = Math.max(
    0,
    people.length -
      peopleViewModels.filter((item) => item.memoriesCount > 0).length
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-6 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PeopleHeader />

        <PeopleSummaryCard
          peopleCount={people.length}
          birthdaysThisWeek={birthdaysThisWeek}
          waitingForContact={waitingForContact}
        />

        <HappyRecommendationCard recommendation={recommendation} />

        <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 bg-slate-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <PeopleSearch value={query} onChange={setQuery} />
        </div>

        <PeopleList
          loading={loading}
          peopleCount={people.length}
          filteredPeople={filteredPeople}
          query={query}
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </div>
    </main>
  );
}

function PeopleList({
  loading,
  peopleCount,
  filteredPeople,
  query,
  expanded,
  onExpandedChange,
}: {
  loading: boolean;
  peopleCount: number;
  filteredPeople: PersonListItem[];
  query: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  if (loading) {
    return <PeopleMessage>Ładowanie...</PeopleMessage>;
  }

  if (peopleCount === 0) {
    return <PeopleEmptyState />;
  }

  if (filteredPeople.length === 0) {
    return <PeopleMessage>Brak wyników dla tego wyszukiwania.</PeopleMessage>;
  }

  const favoritePeople = filteredPeople.filter((item) => item.isFavorite);
  const otherPeople = filteredPeople.filter((item) => !item.isFavorite);
  const shouldCollapse = peopleCount > COLLAPSE_THRESHOLD && !query.trim();
  const visibleOtherPeople =
    shouldCollapse && !expanded
      ? otherPeople.slice(0, COLLAPSED_VISIBLE_COUNT)
      : otherPeople;
  const hiddenCount = otherPeople.length - visibleOtherPeople.length;
  const otherPeopleTitle =
    favoritePeople.length > 0
      ? `👥 Wszystkie pozostałe (${otherPeople.length})`
      : `👥 Osoby (${filteredPeople.length})`;

  return (
    <div className="flex flex-col gap-4">
      {favoritePeople.length > 0 && (
        <PeopleSection title="⭐ Ulubione" items={favoritePeople} />
      )}

      <PeopleSection
        title={otherPeopleTitle}
        caption={
          shouldCollapse
            ? `Pokazano ${visibleOtherPeople.length} z ${otherPeople.length}`
            : undefined
        }
        items={visibleOtherPeople}
      />

      {shouldCollapse && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => onExpandedChange(true)}
          className="h-12 rounded-[1.1rem] bg-white text-sm font-extrabold text-blue-600 shadow-[0_10px_26px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 transition active:scale-[0.99]"
        >
          Pokaż pozostałe {hiddenCount}
        </button>
      )}

      {shouldCollapse && expanded && (
        <button
          type="button"
          onClick={() => onExpandedChange(false)}
          className="h-12 rounded-[1.1rem] bg-blue-50 text-sm font-extrabold text-blue-600 transition active:scale-[0.99]"
        >
          Zwiń listę
        </button>
      )}
    </div>
  );
}

function PeopleSection({
  title,
  caption,
  items,
}: {
  title: string;
  caption?: string;
  items: PersonListItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <h2 className="text-sm font-black text-slate-950">{title}</h2>
        {caption && (
          <p className="text-xs font-bold text-slate-400">▼ {caption}</p>
        )}
      </div>

      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.person.id}>
            <Link href={`/people/${item.person.id}`} className="block">
              <PersonCard
                person={item.person}
                variant="list"
                tags={item.tags}
                memoriesCount={item.memoriesCount}
                nextDateLabel={item.nextDateLabel}
                daysUntilNextDate={item.daysUntilNextDate}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PeopleMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-6 text-sm font-semibold text-slate-500 shadow-[0_13px_34px_rgba(15,23,42,0.06)]">
      {children}
    </div>
  );
}

function PeopleEmptyState() {
  return (
    <section className="rounded-[1.5rem] bg-white px-5 py-8 text-center shadow-[0_13px_34px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
        💙
      </div>
      <h2 className="mt-4 text-xl font-black text-slate-950">
        Twoja lista jest jeszcze pusta
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-slate-500">
        Dodaj pierwszą ważną osobę.
      </p>
      <div className="mt-5 flex justify-center">
        <AddPersonMenu />
      </div>
    </section>
  );
}

function buildSearchText(
  person: PersonRow,
  tags: string[],
  memories: MemoryRow[]
) {
  return [
    person.name,
    person.relationship,
    person.notes,
    ...tags,
    ...memories.flatMap((memory) => [
      memory.title,
      memory.value_text,
      memory.content_text,
      ...(memory.ai_tags ?? []),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getTagsForPerson(person: PersonRow, memories: MemoryRow[]): string[] {
  const tags = new Set<string>();

  memories.forEach((memory) => {
    memory.ai_tags?.forEach((tag) => {
      if (tag.trim()) {
        tags.add(formatTag(tag));
      }
    });

    if (memory.type) {
      tags.add(formatTag(memory.type));
    }
  });

  if (tags.size === 0 && person.relationship) {
    tags.add(formatTag(person.relationship));
  }

  return Array.from(tags).slice(0, 4);
}

function isFavoritePerson(person: PersonRow): boolean {
  const personWithFavorite = person as PersonWithFavorite;

  return Boolean(
    personWithFavorite.favorite ?? personWithFavorite.is_favorite ?? false
  );
}

function formatTag(tag: string): string {
  return tag
    .replaceAll("_", " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function getBirthdayInfo(date: string | null) {
  if (!date) {
    return null;
  }

  const birthday = parseLocalDate(date);

  return {
    daysUntil: getDaysUntilBirthday(birthday),
    label: new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(birthday),
  };
}

function getDaysUntilBirthday(birthday: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextBirthday = new Date(
    today.getFullYear(),
    birthday.getMonth(),
    birthday.getDate()
  );

  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  return Math.round(
    (nextBirthday.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(value);
  }

  return new Date(year, month - 1, day);
}
