"use client";

import {
  DEFAULT_PEOPLE_FILTERS,
  type PeopleFilters,
} from "@/components/people/peopleFilters";

interface ActivePeopleFiltersProps {
  filters: PeopleFilters;
  onChange: (filters: PeopleFilters) => void;
}

export function ActivePeopleFilters({
  filters,
  onChange,
}: ActivePeopleFiltersProps) {
  const chips = getActiveFilterChips(filters);

  if (chips.length === 0) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
      <div className="flex gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => onChange(chip.clear(filters))}
            className="shrink-0 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700"
          >
            {chip.label} ×
          </button>
        ))}
      </div>
    </div>
  );
}

function getActiveFilterChips(filters: PeopleFilters) {
  return [
    filters.relation !== "all" && {
      key: "relation",
      label: relationLabel(filters.relation),
      clear: (current: PeopleFilters) => ({
        ...current,
        relation: DEFAULT_PEOPLE_FILTERS.relation,
      }),
    },
    filters.importantDate !== "none" && {
      key: "importantDate",
      label: dateLabel(filters.importantDate),
      clear: (current: PeopleFilters) => ({
        ...current,
        importantDate: DEFAULT_PEOPLE_FILTERS.importantDate,
      }),
    },
    filters.gender !== "all" && {
      key: "gender",
      label: genderLabel(filters.gender),
      clear: (current: PeopleFilters) => ({
        ...current,
        gender: DEFAULT_PEOPLE_FILTERS.gender,
      }),
    },
    filters.profile !== "none" && {
      key: "profile",
      label: profileLabel(filters.profile),
      clear: (current: PeopleFilters) => ({
        ...current,
        profile: DEFAULT_PEOPLE_FILTERS.profile,
      }),
    },
    filters.sort !== "default" && {
      key: "sort",
      label: sortLabel(filters.sort),
      clear: (current: PeopleFilters) => ({
        ...current,
        sort: DEFAULT_PEOPLE_FILTERS.sort,
      }),
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    clear: (filters: PeopleFilters) => PeopleFilters;
  }>;
}

function relationLabel(value: PeopleFilters["relation"]) {
  return {
    all: "Wszystkie",
    family: "Rodzina",
    partner: "Partner",
    friends: "Przyjaciele",
    work: "Praca",
    other: "Inne",
  }[value];
}

function dateLabel(value: PeopleFilters["importantDate"]) {
  return {
    none: "",
    today: "Dzisiaj",
    "7_days": "Do 7 dni",
    "30_days": "Do 30 dni",
    missing: "Brak daty",
  }[value];
}

function genderLabel(value: PeopleFilters["gender"]) {
  return {
    all: "Wszystkie",
    female: "Kobiety",
    male: "Mężczyźni",
    unspecified: "Nie podano",
  }[value];
}

function profileLabel(value: PeopleFilters["profile"]) {
  return {
    none: "",
    missing_relation: "Brak relacji",
    missing_memories: "Brak wspomnień",
    incomplete: "Do uzupełnienia",
  }[value];
}

function sortLabel(value: PeopleFilters["sort"]) {
  return {
    default: "",
    az: "A-Z",
    birthday: "Najbliższe urodziny",
    recent: "Ostatnio dodane",
  }[value];
}
