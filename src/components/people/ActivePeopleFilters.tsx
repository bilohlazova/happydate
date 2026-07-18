"use client";

import {
  DEFAULT_PEOPLE_FILTERS,
  type PeopleFilters,
} from "@/components/people/peopleFilters";
import { useTranslations } from "next-intl";

type FilterLabelKey = "family" | "partner" | "friends" | "work" | "other" | "today" | "sevenDays" | "thirtyDays" | "missingDate" | "women" | "men" | "genderOther" | "unspecified" | "missingRelation" | "missingMemories" | "incomplete" | "az" | "birthday" | "recent";

interface ActivePeopleFiltersProps {
  filters: PeopleFilters;
  onChange: (filters: PeopleFilters) => void;
}

export function ActivePeopleFilters({
  filters,
  onChange,
}: ActivePeopleFiltersProps) {
  const t = useTranslations("people");
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
            {t(`filters.${chip.label}`)} ×
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
    label: FilterLabelKey;
    clear: (filters: PeopleFilters) => PeopleFilters;
  }>;
}

function relationLabel(value: PeopleFilters["relation"]) {
  return {
    all: "all",
    family: "family", partner: "partner", friends: "friends", work: "work", other: "other",
  }[value];
}

function dateLabel(value: PeopleFilters["importantDate"]) {
  return {
    none: "",
    today: "today", "7_days": "sevenDays", "30_days": "thirtyDays", missing: "missingDate",
  }[value];
}

function genderLabel(value: PeopleFilters["gender"]) {
  return {
    all: "all",
    female: "women", male: "men", other: "genderOther", unspecified: "unspecified",
  }[value];
}

function profileLabel(value: PeopleFilters["profile"]) {
  return {
    none: "",
    missing_relation: "missingRelation", missing_memories: "missingMemories", incomplete: "incomplete",
  }[value];
}

function sortLabel(value: PeopleFilters["sort"]) {
  return {
    default: "",
    az: "az", birthday: "birthday", recent: "recent",
  }[value];
}
