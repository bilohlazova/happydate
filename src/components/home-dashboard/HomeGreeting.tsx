import type { HomeViewModel } from "@/lib/home/home.types";

export default function HomeGreeting({ greeting }: { greeting: HomeViewModel["greeting"] }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-100 text-lg shadow-sm ring-1 ring-sky-200" aria-hidden="true">💙</span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-extrabold text-slate-950">Happy{greeting.name ? ` · ${greeting.name}` : ""}</p>
        </div>
      </div>
    </div>
  );
}
