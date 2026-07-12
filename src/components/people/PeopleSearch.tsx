import { SlidersHorizontal, Search } from "lucide-react";

interface PeopleSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function PeopleSearch({ value, onChange }: PeopleSearchProps) {
  return (
    <div className="flex items-center">
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-[0.9rem] border border-slate-100 bg-white pl-10 pr-12 text-[16px] font-semibold text-slate-800 shadow-[0_6px_18px_rgba(15,23,42,0.045)] outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-100"
          placeholder="Szukaj osób, tagów, wspomnień..."
          type="search"
        />
        <button
          type="button"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[0.7rem] text-slate-500 transition hover:bg-sky-50 hover:text-sky-600 active:scale-[0.96]"
          aria-label="Filtry"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
      </label>
    </div>
  );
}
