import { SlidersHorizontal, Search } from "lucide-react";

interface PeopleSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function PeopleSearch({ value, onChange }: PeopleSearchProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-[0.9rem] border border-slate-100 bg-white pl-10 pr-3.5 text-[16px] font-semibold text-slate-800 shadow-[0_6px_18px_rgba(15,23,42,0.045)] outline-none transition placeholder:text-slate-400 focus:border-blue-200 focus:ring-4 focus:ring-blue-100"
          placeholder="Szukaj osób, tagów, wspomnień..."
          type="search"
        />
      </label>
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-white text-slate-500 shadow-[0_6px_18px_rgba(15,23,42,0.045)] ring-1 ring-slate-100 transition hover:text-blue-600 active:scale-[0.96]"
        aria-label="Filtry"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>
    </div>
  );
}
