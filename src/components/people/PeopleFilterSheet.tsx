"use client";

import {
  DEFAULT_PEOPLE_FILTERS,
  type GenderFilter,
  type ImportantDateFilter,
  type PeopleFilters,
  type PeopleSort,
  type ProfileFilter,
  type RelationFilter,
} from "@/components/people/peopleFilters";
import { useTranslations } from "next-intl";

interface PeopleFilterSheetProps {
  open: boolean;
  draftFilters: PeopleFilters;
  resultCount: number;
  onDraftChange: (filters: PeopleFilters) => void;
  onApply: () => void;
  onClose: () => void;
}

type FilterLabelKey = "all" | "family" | "partner" | "friends" | "work" | "other"
  | "today" | "sevenDays" | "thirtyDays" | "missingDate"
  | "women" | "men" | "genderOther" | "unspecified"
  | "missingRelation" | "missingMemories" | "incomplete"
  | "default" | "az" | "birthday" | "recent";

const RELATION_OPTIONS: Array<{ value: RelationFilter; labelKey: FilterLabelKey }> = [
  { value: "all", labelKey: "all" },
  { value: "family", labelKey: "family" },
  { value: "partner", labelKey: "partner" },
  { value: "friends", labelKey: "friends" },
  { value: "work", labelKey: "work" },
  { value: "other", labelKey: "other" },
];

const DATE_OPTIONS: Array<{ value: ImportantDateFilter; labelKey: FilterLabelKey }> = [
  { value: "today", labelKey: "today" },
  { value: "7_days", labelKey: "sevenDays" },
  { value: "30_days", labelKey: "thirtyDays" },
  { value: "missing", labelKey: "missingDate" },
];

const GENDER_OPTIONS: Array<{ value: GenderFilter; labelKey: FilterLabelKey }> = [
  { value: "all", labelKey: "all" },
  { value: "female", labelKey: "women" },
  { value: "male", labelKey: "men" },
  { value: "other", labelKey: "genderOther" },
  { value: "unspecified", labelKey: "unspecified" },
];

const PROFILE_OPTIONS: Array<{ value: ProfileFilter; labelKey: FilterLabelKey }> = [
  { value: "missing_relation", labelKey: "missingRelation" },
  { value: "missing_memories", labelKey: "missingMemories" },
  { value: "incomplete", labelKey: "incomplete" },
];

const SORT_OPTIONS: Array<{ value: PeopleSort; labelKey: FilterLabelKey }> = [
  { value: "default", labelKey: "default" },
  { value: "az", labelKey: "az" },
  { value: "birthday", labelKey: "birthday" },
  { value: "recent", labelKey: "recent" },
];

export function PeopleFilterSheet({
  open,
  draftFilters,
  resultCount,
  onDraftChange,
  onApply,
  onClose,
}: PeopleFilterSheetProps) {
  const t = useTranslations("people");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label={t("accessibility.closeFilters")}
        className="absolute inset-0 bg-slate-950/25"
        onClick={onClose}
      />
      <section className="absolute inset-x-0 bottom-0 mx-auto flex h-[min(82dvh,42rem)] w-full max-w-[520px] flex-col rounded-t-[1.35rem] bg-white shadow-[0_-18px_60px_rgba(15,23,42,0.22)]">
        <div className="shrink-0 px-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950">{t("filters.title")}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-black text-slate-400"
            >
              {t("filters.close")}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid gap-3">
            <FilterGroup title={t("filters.relation")}>
              <ChipGrid
                options={RELATION_OPTIONS}
                value={draftFilters.relation}
                onChange={(relation) =>
                  onDraftChange({ ...draftFilters, relation })
                }
              />
            </FilterGroup>

            <FilterGroup title={t("filters.importantDates")}>
              <ChipGrid
                options={DATE_OPTIONS}
                value={draftFilters.importantDate}
                onChange={(importantDate) =>
                  onDraftChange({
                    ...draftFilters,
                    importantDate:
                      draftFilters.importantDate === importantDate
                        ? "none"
                        : importantDate,
                  })
                }
              />
            </FilterGroup>

            <FilterGroup title={t("filters.gender")}>
              <ChipGrid
                options={GENDER_OPTIONS}
                value={draftFilters.gender}
                onChange={(gender) =>
                  onDraftChange({ ...draftFilters, gender })
                }
              />
            </FilterGroup>

            <FilterGroup title={t("filters.profile")}>
              <ChipGrid
                options={PROFILE_OPTIONS}
                value={draftFilters.profile}
                onChange={(profile) =>
                  onDraftChange({
                    ...draftFilters,
                    profile:
                      draftFilters.profile === profile ? "none" : profile,
                  })
                }
              />
            </FilterGroup>

            <FilterGroup title={t("filters.sort")}>
              <ChipGrid
                options={SORT_OPTIONS}
                value={draftFilters.sort}
                onChange={(sort) => onDraftChange({ ...draftFilters, sort })}
              />
            </FilterGroup>
          </div>
        </div>

        <div className="relative z-[2] grid shrink-0 grid-cols-[0.8fr_1.2fr] gap-2 border-t border-slate-100 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_22px_rgba(15,23,42,0.06)]">
          <button
            type="button"
            onClick={() => onDraftChange(DEFAULT_PEOPLE_FILTERS)}
            className="min-h-11 rounded-[0.9rem] bg-slate-50 px-4 text-sm font-black text-slate-600"
          >
            {t("filters.clear")}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="min-h-11 rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)]"
          >
            {t("filters.show", { count: resultCount })}
          </button>
        </div>
      </section>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; labelKey: FilterLabelKey }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const t = useTranslations("people");
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-8 rounded-full px-3 text-xs font-black transition ${
              active
                ? "bg-sky-500 text-white shadow-[0_6px_16px_rgba(14,165,233,0.2)]"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            {t(`filters.${option.labelKey}`)}
          </button>
        );
      })}
    </div>
  );
}
