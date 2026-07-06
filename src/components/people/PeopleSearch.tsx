import { SlidersHorizontal, Search } from "lucide-react";
import { MobileUI } from "@/lib/theme/mobile";

interface PeopleSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function PeopleSearch({ value, onChange }: PeopleSearchProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${MobileUI.input} pl-11 pr-4`}
          placeholder="Szukaj osób, tagów, wspomnień..."
          type="search"
        />
      </label>
      <button
        type="button"
        className={`${MobileUI.iconButton} bg-white text-slate-500 shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 hover:text-blue-600`}
        aria-label="Filtry"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>
    </div>
  );
}
