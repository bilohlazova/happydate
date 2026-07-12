import type { PersonRow } from "@/lib/repositories/person.types";
import {
  getPersonRelationCategory,
  getPersonRelationLabel,
} from "@/components/people/peopleRelations";

export type RelationFilter = "all" | "family" | "partner" | "friends" | "work" | "other";
export type ImportantDateFilter = "none" | "today" | "7_days" | "30_days" | "missing";
export type GenderFilter = "all" | "female" | "male" | "unspecified";
export type ProfileFilter = "none" | "missing_relation" | "missing_memories" | "incomplete";
export type PeopleSort = "default" | "az" | "birthday" | "recent";

export interface PeopleFilters {
  relation: RelationFilter;
  importantDate: ImportantDateFilter;
  gender: GenderFilter;
  profile: ProfileFilter;
  sort: PeopleSort;
}

export interface FilterablePerson {
  person: PersonRow;
  memoriesCount: number;
  daysUntilNextDate: number | null;
  searchText: string;
}

export const DEFAULT_PEOPLE_FILTERS: PeopleFilters = {
  relation: "all",
  importantDate: "none",
  gender: "all",
  profile: "none",
  sort: "default",
};

export function filterPeople<T extends FilterablePerson>(
  items: T[],
  query: string,
  filters: PeopleFilters
) {
  const normalizedQuery = normalizeSearchValue(query);

  return items.filter((item) => {
    if (
      normalizedQuery &&
      !normalizeSearchValue(item.searchText).includes(normalizedQuery)
    ) {
      return false;
    }

    if (
      filters.relation !== "all" &&
      normalizeRelationCategory(item.person) !== filters.relation
    ) {
      return false;
    }

    if (!matchesImportantDate(item, filters.importantDate)) {
      return false;
    }

    if (!matchesGender(item.person, filters.gender)) {
      return false;
    }

    return matchesProfile(item, filters.profile);
  });
}

export function sortPeople<T extends FilterablePerson>(
  items: T[],
  sort: PeopleSort
) {
  const sorted = items.slice();

  if (sort === "az") {
    return sorted.sort(compareByName);
  }

  if (sort === "birthday") {
    return sorted.sort((a, b) => {
      const aDays = a.daysUntilNextDate;
      const bDays = b.daysUntilNextDate;

      if (aDays === null && bDays === null) return compareByName(a, b);
      if (aDays === null) return 1;
      if (bDays === null) return -1;

      return aDays - bDays || compareByName(a, b);
    });
  }

  if (sort === "recent") {
    return sorted.sort((a, b) => {
      const aTime = new Date(a.person.created_at).getTime();
      const bTime = new Date(b.person.created_at).getTime();

      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime) || compareByName(a, b);
    });
  }

  return sorted;
}

export function normalizeRelationCategory(
  person: PersonRow
): Exclude<RelationFilter, "all"> {
  const category = getPersonRelationCategory(person);

  if (
    category === "close_family" ||
    category === "children" ||
    category === "family"
  ) {
    return "family";
  }

  if (category === "clients" || category === "work") {
    return "work";
  }

  if (category === "acquaintances" || category === "neighbors") {
    return "other";
  }

  return category;
}

export function getDaysUntilBirthday(value: string | null) {
  if (!value) return null;

  const date = parseLocalDate(value);

  if (!date) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextBirthday = new Date(
    today.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  return Math.round(
    (nextBirthday.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );
}

export function isBirthdayMissing(value: string | null) {
  return getDaysUntilBirthday(value) === null;
}

export function isRelationMissing(value: string | null) {
  return !value?.trim();
}

export function isPersonRelationMissing(person: PersonRow) {
  return !getPersonRelationLabel(person).trim();
}

export function getActiveFilterCount(filters: PeopleFilters) {
  return [
    filters.relation !== "all",
    filters.importantDate !== "none",
    filters.gender !== "all",
    filters.profile !== "none",
    filters.sort !== "default",
  ].filter(Boolean).length;
}

export function pluralizePeoplePl(count: number) {
  const suffix = getPeopleWord(count);

  return `${count} ${suffix}`;
}

export function getPeopleWord(count: number) {
  if (count === 1) return "osoba";

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return "osoby";
  }

  return "osób";
}

export function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ");
}

function matchesImportantDate(
  item: FilterablePerson,
  filter: ImportantDateFilter
) {
  if (filter === "none") return true;
  if (filter === "missing") return item.daysUntilNextDate === null;
  if (item.daysUntilNextDate === null) return false;
  if (filter === "today") return item.daysUntilNextDate === 0;
  if (filter === "7_days") return item.daysUntilNextDate <= 7;
  if (filter === "30_days") return item.daysUntilNextDate <= 30;

  return true;
}

function matchesGender(person: PersonRow, filter: GenderFilter) {
  if (filter === "all") return true;

  return (person.gender ?? "unspecified") === filter;
}

function matchesProfile(item: FilterablePerson, filter: ProfileFilter) {
  if (filter === "none") return true;
  if (filter === "missing_relation") return isPersonRelationMissing(item.person);
  if (filter === "missing_memories") return item.memoriesCount === 0;
  if (filter === "incomplete") {
    return isBirthdayMissing(item.person.birthday) || isPersonRelationMissing(item.person);
  }

  return true;
}

function compareByName<T extends FilterablePerson>(a: T, b: T) {
  return a.person.name.localeCompare(b.person.name, "pl", {
    sensitivity: "base",
  });
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}
