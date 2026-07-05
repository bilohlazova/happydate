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
import type { MemoryRow } from "@/lib/repositories/memory.types";
import type { PersonRow } from "@/lib/repositories/person.types";

interface PeoplePageContentProps {
  loading: boolean;
  people: PersonRow[];
  memories: MemoryRow[];
  recommendation: HappyRecommendation | null;
}

export function PeoplePageContent({
  loading,
  people,
  memories,
  recommendation,
}: PeoplePageContentProps) {
  const [query, setQuery] = useState("");

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
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <PeopleHeader />

        <PeopleSummaryCard
          peopleCount={people.length || 24}
          birthdaysThisWeek={birthdaysThisWeek}
          waitingForContact={waitingForContact}
        />

        <HappyRecommendationCard recommendation={recommendation} />

        <PeopleSearch value={query} onChange={setQuery} />

        <PeopleList
          loading={loading}
          peopleCount={people.length}
          filteredPeople={filteredPeople}
        />
      </div>
    </main>
  );
}

function PeopleList({
  loading,
  peopleCount,
  filteredPeople,
}: {
  loading: boolean;
  peopleCount: number;
  filteredPeople: Array<{
    person: PersonRow;
    tags: string[];
    memoriesCount: number;
    nextDateLabel: string | null;
    daysUntilNextDate: number | null;
  }>;
}) {
  if (loading) {
    return <PeopleMessage>Ładowanie...</PeopleMessage>;
  }

  if (peopleCount === 0) {
    return (
      <PeopleMessage>
        Brak osób. Menu importu jest gotowe, a dane można dodać później.
      </PeopleMessage>
    );
  }

  if (filteredPeople.length === 0) {
    return <PeopleMessage>Brak wyników dla tego wyszukiwania.</PeopleMessage>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {filteredPeople.map((item) => (
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
  );
}

function PeopleMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-6 text-sm font-semibold text-slate-500 shadow-[0_13px_34px_rgba(15,23,42,0.06)]">
      {children}
    </div>
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
