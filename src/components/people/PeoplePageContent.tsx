"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import PersonCard from "@/components/people/PersonCard";
import { ActivePeopleFilters } from "@/components/people/ActivePeopleFilters";
import { GenderSelectField } from "@/components/people/GenderSelectField";
import {
  HappyRecommendationCard,
  type HappyRecommendation,
} from "@/components/people/HappyRecommendationCard";
import { PeopleFilterSheet } from "@/components/people/PeopleFilterSheet";
import { PeopleHeader } from "@/components/people/PeopleHeader";
import { PeopleSearch } from "@/components/people/PeopleSearch";
import { PeopleSummaryCard } from "@/components/people/PeopleSummaryCard";
import { AddPersonMenu } from "@/components/people/AddPersonMenu";
import { RelationPickerField } from "@/components/people/RelationPickerField";
import {
  getPersonRelationKey,
  getPersonRelationLabel,
  getPersonRelationSearchAliases,
  getRelationCategoryForKey,
  getRelationLabel,
  type RelationCategory,
} from "@/components/people/peopleRelations";
import {
  DEFAULT_PEOPLE_FILTERS,
  filterPeople,
  getActiveFilterCount,
  getDaysUntilBirthday,
  sortPeople,
  type PeopleFilters,
} from "@/components/people/peopleFilters";
import type { MemoryRow } from "@/lib/repositories/memory.types";
import type {
  PersonGender,
  PersonRelationKey,
  PersonRow,
} from "@/lib/repositories/person.types";
import {
  deletePerson,
  updatePerson,
} from "@/lib/repositories/personRepository";
import { MobileUI } from "@/lib/theme/mobile";
import type { AppLocale } from "@/i18n/config";

const COLLAPSE_THRESHOLD = 10;
const COLLAPSED_VISIBLE_COUNT = 10;

interface PeoplePageContentProps {
  loading: boolean;
  people: PersonRow[];
  memories: MemoryRow[];
  recommendation: HappyRecommendation | null;
  onPersonUpdated: (person: PersonRow) => void;
  onPersonDeleted: (personId: string) => void;
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
  onPersonUpdated,
  onPersonDeleted,
}: PeoplePageContentProps) {
  const t = useTranslations("people");
  const locale = useLocale() as AppLocale;
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
  const [actionPerson, setActionPerson] = useState<PersonRow | null>(null);

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
        const birthday = getBirthdayInfo(person.birthday, locale);

        return {
          person,
          tags,
          memoriesCount: personMemories.length,
          nextDateLabel: birthday?.label ?? null,
          daysUntilNextDate: birthday?.daysUntil ?? null,
          searchText: buildSearchText(person, tags, personMemories),
        };
      }),
    [locale, memories, people]
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
          onPersonAction={setActionPerson}
          t={t}
        />

        {appliedFilters.sort === "az" && (
          <PeopleAlphabetIndex items={alphabetItems} label={t("accessibility.alphabet")} />
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

        <PersonActionsSheet
          person={actionPerson}
          onClose={() => setActionPerson(null)}
          onUpdated={(person) => {
            onPersonUpdated(person);
            setActionPerson(null);
          }}
          onDeleted={(personId) => {
            onPersonDeleted(personId);
            setActionPerson(null);
          }}
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
  onPersonAction,
  t,
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
  onPersonAction: (person: PersonRow) => void;
  t: ReturnType<typeof useTranslations<"people">>;
}) {
  if (loading) {
    return <PeopleMessage>{t("states.loading")}</PeopleMessage>;
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
        title={t("sections.results", { count: filteredPeople.length })}
        items={filteredPeople}
        onPersonAction={onPersonAction}
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
      <PeopleSection
        title={t("sections.now", { count: nowPeople.length })}
        items={nowPeople}
        onPersonAction={onPersonAction}
      />

      <PeopleSection
        title={t("sections.week", { count: weekPeople.length })}
        items={weekPeople}
        onPersonAction={onPersonAction}
      />

      <PeopleSection
        title={t("sections.others", { count: otherPeople.length })}
        caption={
          shouldCollapse && hiddenCount > 0
            ? t("sections.shown", { visible: visibleOtherPeople.length, total: otherPeople.length })
            : undefined
        }
        items={visibleOtherPeople}
        onPersonAction={onPersonAction}
      />

      {shouldCollapse && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => onExpandedChange(true)}
          className={`${MobileUI.button} bg-white text-blue-600 shadow-[0_10px_26px_rgba(15,23,42,0.055)] ring-1 ring-slate-100`}
        >
          {t("sections.showOthers", { count: hiddenCount })}
        </button>
      )}

      {shouldCollapse && expanded && (
        <button
          type="button"
          onClick={() => onExpandedChange(false)}
          className={`${MobileUI.button} bg-blue-50 text-blue-600`}
        >
          {t("sections.collapse")}
        </button>
      )}
    </div>
  );
}

function PeopleSection({
  title,
  caption,
  items,
  onPersonAction,
}: {
  title: string;
  caption?: string;
  items: PersonListItem[];
  onPersonAction: (person: PersonRow) => void;
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
            <Link
              href={`/people/${item.person.id}`}
              className="block"
              style={{ WebkitTouchCallout: "none" } as CSSProperties}
              onContextMenu={(event) => {
                event.preventDefault();
                onPersonAction(item.person);
              }}
            >
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
  label,
}: {
  items: Array<{ letter: string; personId: string }>;
  label: string;
}) {
  if (items.length < 6) {
    return null;
  }

  return (
    <nav
      aria-label={label}
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

function PersonActionsSheet({
  person,
  onClose,
  onUpdated,
  onDeleted,
}: {
  person: PersonRow | null;
  onClose: () => void;
  onUpdated: (person: PersonRow) => void;
  onDeleted: (personId: string) => void;
}) {
  const formT = useTranslations("personForm");
  const [mode, setMode] = useState<"actions" | "edit" | "delete">("actions");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [relationKey, setRelationKey] = useState<PersonRelationKey | null>(null);
  const [relationCategory, setRelationCategory] =
    useState<RelationCategory | null>(null);
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<PersonGender>("unspecified");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!person) return;

    const relationLabel = getPersonRelationLabel(person);

    setMode("actions");
    setName(person.name);
    setRelationship(relationLabel);
    setRelationKey(getPersonRelationKey(person));
    setRelationCategory(
      getRelationCategoryForKey(getPersonRelationKey(person)) ??
        person.relation_category
    );
    setBirthday(person.birthday ?? "");
    setGender(person.gender ?? "unspecified");
    setSaving(false);
    setError(null);
  }, [person]);

  if (!person) return null;

  async function handleSave() {
    if (!person) return;
    if (!name.trim()) {
      setError(formT("validation.nameRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const resolvedRelation = getRelationLabel(relationKey, gender, relationship);

      const updatedPerson = await updatePerson({
        personId: person.id,
        name: name.trim(),
        relationship: resolvedRelation || undefined,
        relationLabel: resolvedRelation || undefined,
        relationKey,
        relationCategory: getRelationCategoryForKey(relationKey) ?? relationCategory,
        birthday: birthday || undefined,
        gender,
      });

      onUpdated(updatedPerson);
    } catch (saveError) {
      console.error("[PersonActionsSheet] updatePerson failed:", saveError);
      setError(formT("states.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!person) return;

    setSaving(true);
    setError(null);

    try {
      await deletePerson(person.id);
      onDeleted(person.id);
    } catch (deleteError) {
      console.error("[PersonActionsSheet] deletePerson failed:", deleteError);
      setError("Nie udało się usunąć osoby.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Zamknij akcje osoby"
        className="absolute inset-0 bg-slate-950/25"
        onClick={onClose}
      />
      <section aria-label={mode === "edit" ? formT("accessibility.editForm") : undefined} className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[520px] rounded-t-[1.35rem] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_60px_rgba(15,23,42,0.22)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-slate-950">
              {person.name}
            </h2>
            <p className="truncate text-xs font-semibold text-slate-500">
              {getPersonRelationLabel(person) || "Brak relacji"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500"
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === "actions" && (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="flex min-h-12 items-center gap-3 rounded-[0.95rem] bg-sky-50 px-3 text-left text-sm font-black text-sky-700"
            >
              <Pencil className="h-5 w-5" />
              {formT("title.edit")}
            </button>
            <button
              type="button"
              onClick={() => setMode("delete")}
              className="flex min-h-12 items-center gap-3 rounded-[0.95rem] bg-rose-50 px-3 text-left text-sm font-black text-rose-600"
            >
              <Trash2 className="h-5 w-5" />
              Usuń
            </button>
          </div>
        )}

        {mode === "edit" && (
          <div className="grid gap-3">
            <Field label={formT("fields.name")} htmlFor="edit-name">
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={MobileUI.input}
                aria-label={formT("accessibility.birthdayInput")}
              />
            </Field>
            <GenderSelectField
              localized
              value={gender}
              onChange={(value) => {
                setGender(value);

                if (relationKey && relationKey !== "other") {
                  setRelationship(getRelationLabel(relationKey, value));
                }
              }}
            />
            <RelationPickerField
              localized
              value={relationship}
              valueKey={relationKey}
              gender={gender}
              onChange={(value, category, key) => {
                setRelationship(value);
                setRelationCategory(category);
                setRelationKey(key);
              }}
            />
            <Field label={formT("fields.birthday")} htmlFor="edit-birthday">
              <input
                id="edit-birthday"
                type="date"
                value={birthday}
                onChange={(event) => setBirthday(event.target.value)}
                className={MobileUI.input}
              />
            </Field>
            {error && (
              <p className="rounded-[0.8rem] bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                {error}
              </p>
            )}
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
              <button
                type="button"
                onClick={() => setMode("actions")}
                className="min-h-11 rounded-[0.9rem] bg-slate-50 px-4 text-sm font-black text-slate-600"
              >
                {formT("actions.cancel")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="min-h-11 rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)] disabled:opacity-50"
              >
                {saving ? formT("states.saving") : formT("actions.update")}
              </button>
            </div>
          </div>
        )}

        {mode === "delete" && (
          <div>
            <p className="rounded-[0.9rem] bg-rose-50 px-3 py-3 text-sm font-bold leading-5 text-rose-700">
              Usunąć tę osobę z HappyDate? Tej akcji nie da się cofnąć.
            </p>
            {error && (
              <p className="mt-2 rounded-[0.8rem] bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                {error}
              </p>
            )}
            <div className="mt-3 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <button
                type="button"
                onClick={() => setMode("actions")}
                className="min-h-11 rounded-[0.9rem] bg-slate-50 px-4 text-sm font-black text-slate-600"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="min-h-11 rounded-[0.9rem] bg-rose-600 px-4 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? "Usuwanie..." : "Usuń osobę"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-black text-slate-600">
        {label}
      </label>
      {children}
    </div>
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
  const t = useTranslations("people");
  return (
    <section className={`${MobileUI.card} px-4 py-5 text-center`}>
      <h2 className="text-base font-black text-slate-950">
        {t("states.noResults")}
      </h2>
      <p className="mx-auto mt-1 max-w-xs text-xs font-semibold leading-5 text-slate-500">
        {t("states.noResultsBody")}
      </p>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={onClearFilters}
          className="min-h-10 rounded-[0.9rem] bg-sky-50 px-4 text-sm font-black text-sky-700"
        >
          {t("states.clearFilters")}
        </button>
        {hasQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            className="min-h-10 rounded-[0.9rem] bg-white px-4 text-sm font-black text-slate-600 ring-1 ring-slate-100"
          >
            {t("search.clear")}
          </button>
        )}
      </div>
    </section>
  );
}

function PeopleEmptyState() {
  const t = useTranslations("people");
  return (
    <section className={`${MobileUI.card} px-5 py-8 text-center`}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
        💙
      </div>
      <h2 className="mt-4 text-xl font-black text-slate-950">
        {t("states.emptyTitle")}
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-slate-500">
        {t("states.emptyBody")}
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
    ...getPersonRelationSearchAliases(person),
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

function getBirthdayInfo(date: string | null, locale: AppLocale) {
  const daysUntil = getDaysUntilBirthday(date);

  if (daysUntil === null || !date) {
    return null;
  }

  const birthday = parseLocalDate(date);

  return {
    daysUntil,
    label: new Intl.DateTimeFormat(locale, {
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
