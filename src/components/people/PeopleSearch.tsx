import { SlidersHorizontal, Search } from "lucide-react";
import { useTranslations } from "next-intl";

interface PeopleSearchProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick: () => void;
  activeFilterCount: number;
}

export function PeopleSearch({
  value,
  onChange,
  onFilterClick,
  activeFilterCount,
}: PeopleSearchProps) {
  const t = useTranslations("people");
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="people-search flex items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{t("search.label")}</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="people-search__input h-12 w-full rounded-[0.9rem] border border-slate-100 bg-white pl-10 pr-12 text-[16px] font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-100"
          placeholder={t("search.placeholder")}
          type="search"
        />
        <button
          type="button"
          onClick={onFilterClick}
          className={`absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[0.7rem] transition active:scale-[0.96] ${
            hasActiveFilters
              ? "bg-sky-500 text-white"
              : "text-slate-500 hover:bg-sky-50 hover:text-sky-600"
          }`}
          aria-label={t("accessibility.filters")}
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
          {hasActiveFilters && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[0.58rem] font-black leading-none text-white ring-2 ring-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </label>
    </div>
  );
}
