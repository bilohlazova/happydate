import type { PersonGender } from "@/lib/repositories/person.types";

interface GenderSelectFieldProps {
  value: PersonGender;
  onChange: (value: PersonGender) => void;
}

const OPTIONS: Array<{ value: PersonGender; label: string }> = [
  { value: "female", label: "Kobieta" },
  { value: "male", label: "Mężczyzna" },
  { value: "other", label: "Inna" },
  { value: "unspecified", label: "Wolę nie podawać" },
];

export function GenderSelectField({ value, onChange }: GenderSelectFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-600">Płeć</label>
        <span className="text-[0.65rem] font-bold text-slate-400">
          Opcjonalnie
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-9 rounded-[0.8rem] px-2 text-xs font-black transition ${
              value === option.value
                ? "bg-sky-500 text-white"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
