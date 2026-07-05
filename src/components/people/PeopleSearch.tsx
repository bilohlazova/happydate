import { SlidersHorizontal, Search } from "lucide-react";

interface PeopleSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function PeopleSearch({ value, onChange }: PeopleSearchProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-16 w-full rounded-[1.4rem] border border-slate-100 bg-white pl-14 pr-5 text-base font-medium text-slate-800 shadow-[0_14px_36px_rgba(15,23,42,0.07)] outline-none transition placeholder:text-slate-400 focus:border-blue-200 focus:ring-4 focus:ring-blue-100"
          placeholder="Szukaj osób, tagów, wspomnień..."
          type="search"
        />
      </label>
      <button
        type="button"
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-white text-slate-500 shadow-[0_14px_36px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 transition hover:text-blue-600"
        aria-label="Filtry"
      >
        <SlidersHorizontal className="h-6 w-6" />
      </button>
    </div>
  );
}
