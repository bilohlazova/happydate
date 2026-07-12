"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import PersonCard from "@/components/people/PersonCard";
import { ActivePeopleFilters } from "@/components/people/ActivePeopleFilters";
import {
  HappyRecommendationCard,
  type HappyRecommendation,
} from "@/components/people/HappyRecommendationCard";
import { PeopleFilterSheet } from "@/components/people/PeopleFilterSheet";
import { PeopleHeader } from "@/components/people/PeopleHeader";
import { PeopleSearch } from "@/components/people/PeopleSearch";
import { PeopleSummaryCard } from "@/components/people/PeopleSummaryCard";
import { AddPersonMenu } from "@/components/people/AddPersonMenu";
import { getPersonRelationLabel } from "@/components/people/peopleRelations";
import {
  DEFAULT_PEOPLE_FILTERS,
  filterPeople,
  getActiveFilterCount,
  getDaysUntilBirthday,
  pluralizePeoplePl,
  sortPeople,
  type PeopleFilters,
} from "@/components/people/peopleFilters";
import type { MemoryRow } from "@/lib/repositories/memory.types";
import type { PersonRow } from "@/lib/repositories/person.types";
import { MobileUI } from "@/lib/theme/mobile";

const COLLAPSE_THRESHOLD = 10;
const COLLAPSED_VISIBLE_COUNT = 10;

interface PeoplePageContentProps {
  loading: boolean;
  people: PersonRow[];
  memories: MemoryRow[];
  recommendation: HappyRecommendation | null;
}

interface PersonListItem {
  person: PersonRow;
  tags: string[];
  memoriesCount: number;
  nextDateLabel: string | null;
  daysUntilNextDate: number | null;
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
  const [compactChrome, setCompactChrome] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<PeopleFilters>(
    DEFAULT_PEOPLE_FILTERS
  );
  const [draftFilters, setDraftFilters] = useState<PeopleFilters>(
    DEFAULT_PEOPLE_FILTERS
  );

  useEffect(() => {
    function updateCompactChrome() {
      setCompactChrome(window.scrollY > 72);
    }

    updateCompactChrome();
    window.addEventListener("scroll", updateCompactChrome, { passive: true });

    return () => window.removeEventListener("scroll", updateCompactChrome);
  }, []);

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
    const filtered = filterPeople(peopleViewModels, query, appliedFilters);

    return sortPeople(filtered, appliedFilters.sort);
  }, [appliedFilters, peopleViewModels, query]);

  const draftResultCount = useMemo(
    () => filterPeople(peopleViewModels, query, draftFilters).length,
    [draftFilters, peopleViewModels, query]
  );

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
  const alphabetItems = useMemo(
    () => getAlphabetItems(filteredPeople),
    [filteredPeople]
  );
  const activeFilterCount = getActiveFilterCount(appliedFilters);

  return (
    <main className={`${MobileUI.screen} ${MobileUI.contentBottom} pt-2.5`}>
      <div className={`${MobileUI.container} flex flex-col gap-2`}>
        <PeopleHeader />

        <div
          className={`grid gap-2 overflow-hidden transition-all duration-300 ${
            compactChrome
              ? "max-h-0 -translate-y-1 opacity-0"
              : "max-h-36 translate-y-0 opacity-100"
          }`}
          aria-hidden={compactChrome}
        >
          <PeopleSummaryCard
            peopleCount={people.length}
            birthdaysThisWeek={birthdaysThisWeek}
            waitingForContact={waitingForContact}
          />

          <HappyRecommendationCard recommendation={recommendation} />
        </div>

        <div className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 -mx-4 bg-slate-50/95 px-4 py-1 backdrop-blur sm:-mx-5 sm:px-5">
          <PeopleSearch
            value={query}
            onChange={setQuery}
            onFilterClick={() => {
              setDraftFilters(appliedFilters);
              setFilterSheetOpen(true);
            }}
            activeFilterCount={activeFilterCount}
          />
        </div>

        <ActivePeopleFilters
          filters={appliedFilters}
          onChange={setAppliedFilters}
        />

        <PeopleList
          loading={loading}
          peopleCount={people.length}
          filteredPeople={filteredPeople}
          query={query}
          appliedFilters={appliedFilters}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onClearFilters={() => setAppliedFilters(DEFAULT_PEOPLE_FILTERS)}
          onClearSearch={() => setQuery("")}
        />

        {appliedFilters.sort === "az" && (
          <PeopleAlphabetIndex items={alphabetItems} />
        )}

        <PeopleFilterSheet
          open={filterSheetOpen}
          draftFilters={draftFilters}
          resultCount={draftResultCount}
          onDraftChange={setDraftFilters}
          onApply={() => {
            setAppliedFilters(draftFilters);
            setFilterSheetOpen(false);
          }}
          onClose={() => setFilterSheetOpen(false)}
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
  appliedFilters,
  expanded,
  onExpandedChange,
  onClearFilters,
  onClearSearch,
}: {
  loading: boolean;
  peopleCount: number;
  filteredPeople: PersonListItem[];
  query: string;
  appliedFilters: PeopleFilters;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClearFilters: () => void;
  onClearSearch: () => void;
}) {
  if (loading) {
    return <PeopleMessage>Ładowanie...</PeopleMessage>;
  }

  if (peopleCount === 0) {
    return <PeopleEmptyState />;
  }

  if (filteredPeople.length === 0) {
    return (
      <PeopleNoResults
        hasQuery={Boolean(query.trim())}
        onClearFilters={onClearFilters}
        onClearSearch={onClearSearch}
      />
    );
  }

  if (query.trim() || appliedFilters.sort !== "default") {
    return (
      <PeopleSection
        title={`🔎 Wyniki (${pluralizePeoplePl(filteredPeople.length)})`}
        items={filteredPeople}
      />
    );
  }

  const nowPeople = filteredPeople.filter(
    (item) =>
      typeof item.daysUntilNextDate === "number" &&
      item.daysUntilNextDate <= 7
  );
  const nowIds = new Set(nowPeople.map((item) => item.person.id));

  const weekPeople = filteredPeople.filter(
    (item) =>
      !nowIds.has(item.person.id) &&
      ((typeof item.daysUntilNextDate === "number" &&
        item.daysUntilNextDate <= 14) ||
        item.memoriesCount === 0)
  );
  const weekIds = new Set(weekPeople.map((item) => item.person.id));

  const otherPeople = filteredPeople.filter(
    (item) => !nowIds.has(item.person.id) && !weekIds.has(item.person.id)
  );
  const shouldCollapse = peopleCount > COLLAPSE_THRESHOLD && !query.trim();
  const visibleOtherPeople =
    shouldCollapse && !expanded
      ? otherPeople.slice(0, COLLAPSED_VISIBLE_COUNT)
      : otherPeople;
  const hiddenCount = otherPeople.length - visibleOtherPeople.length;

  return (
    <div className="flex flex-col gap-2">
      <PeopleSection title={`❤️ Teraz (${nowPeople.length})`} items={nowPeople} />

      <PeopleSection
        title={`🕒 W tym tygodniu (${weekPeople.length})`}
        items={weekPeople}
      />

      <PeopleSection
        title={`👥 Pozostali (${otherPeople.length})`}
        caption={
          shouldCollapse && hiddenCount > 0
            ? `Pokazano ${visibleOtherPeople.length} z ${otherPeople.length}`
            : undefined
        }
        items={visibleOtherPeople}
      />

      {shouldCollapse && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => onExpandedChange(true)}
          className={`${MobileUI.button} bg-white text-blue-600 shadow-[0_10px_26px_rgba(15,23,42,0.055)] ring-1 ring-slate-100`}
        >
          Pokaż pozostałe {hiddenCount}
        </button>
      )}

      {shouldCollapse && expanded && (
        <button
          type="button"
          onClick={() => onExpandedChange(false)}
          className={`${MobileUI.button} bg-blue-50 text-blue-600`}
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
      <div className="mb-1 flex items-end justify-between gap-3 px-1">
        <h2 className="text-[0.75rem] font-black uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        {caption && (
          <p className="text-[0.65rem] font-bold text-slate-400">
            ▼ {caption}
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.person.id} id={`person-${item.person.id}`}>
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

function PeopleAlphabetIndex({
  items,
}: {
  items: Array<{ letter: string; personId: string }>;
}) {
  if (items.length < 6) {
    return null;
  }

  return (
    <nav
      aria-label="Szybki indeks osób"
      className="fixed right-1 top-1/2 z-30 hidden -translate-y-1/2 flex-col rounded-full bg-white/75 px-1 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 backdrop-blur min-[380px]:flex"
    >
      {items.map((item) => (
        <button
          key={item.letter}
          type="button"
          onClick={() => {
            document
              .getElementById(`person-${item.personId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="flex h-4 w-4 items-center justify-center rounded-full text-[0.58rem] font-black text-sky-600 transition hover:bg-sky-50"
        >
          {item.letter}
        </button>
      ))}
    </nav>
  );
}

function PeopleMessage({ children }: { children: ReactNode }) {
  return (
    <div className={`${MobileUI.card} p-5 text-sm font-semibold text-slate-500`}>
      {children}
    </div>
  );
}

function PeopleNoResults({
  hasQuery,
  onClearFilters,
  onClearSearch,
}: {
  hasQuery: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
}) {
  return (
    <section className={`${MobileUI.card} px-4 py-5 text-center`}>
      <h2 className="text-base font-black text-slate-950">
        Nie znaleziono osób
      </h2>
      <p className="mx-auto mt-1 max-w-xs text-xs font-semibold leading-5 text-slate-500">
        Spróbuj zmienić wyszukiwanie lub wyczyścić filtry.
      </p>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={onClearFilters}
          className="min-h-10 rounded-[0.9rem] bg-sky-50 px-4 text-sm font-black text-sky-700"
        >
          Wyczyść filtry
        </button>
        {hasQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            className="min-h-10 rounded-[0.9rem] bg-white px-4 text-sm font-black text-slate-600 ring-1 ring-slate-100"
          >
            Wyczyść wyszukiwanie
          </button>
        )}
      </div>
    </section>
  );
}

function PeopleEmptyState() {
  return (
    <section className={`${MobileUI.card} px-5 py-8 text-center`}>
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
    getPersonRelationLabel(person),
    person.notes,
    person.phone,
    person.email,
    ...tags,
    ...memories.flatMap((memory) => [
      memory.title,
      memory.value_text,
      memory.content_text,
      ...(memory.ai_tags ?? []),
    ]),
  ]
    .filter(Boolean)
    .join(" ");
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

  const relationLabel = getPersonRelationLabel(person);

  if (tags.size === 0 && relationLabel) {
    tags.add(formatTag(relationLabel));
  }

  return Array.from(tags).slice(0, 4);
}

function getAlphabetItems(items: PersonListItem[]) {
  const firstPersonByLetter = new Map<string, string>();

  items
    .slice()
    .sort((a, b) => a.person.name.localeCompare(b.person.name, "pl"))
    .forEach((item) => {
      const letter = item.person.name.trim().charAt(0).toUpperCase();

      if (letter && !firstPersonByLetter.has(letter)) {
        firstPersonByLetter.set(letter, item.person.id);
      }
    });

  return Array.from(firstPersonByLetter.entries()).map(([letter, personId]) => ({
    letter,
    personId,
  }));
}

function formatTag(tag: string): string {
  return tag
    .replaceAll("_", " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function getBirthdayInfo(date: string | null) {
  const daysUntil = getDaysUntilBirthday(date);

  if (daysUntil === null || !date) {
    return null;
  }

  const birthday = parseLocalDate(date);

  return {
    daysUntil,
    label: new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "short",
    }).format(birthday),
  };
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(value);
  }

  return new Date(year, month - 1, day);
}
