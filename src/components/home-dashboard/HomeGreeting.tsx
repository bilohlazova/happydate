import type { HomeViewModel } from "@/lib/home/home.types";
import { useLocale } from "next-intl";

export default function HomeGreeting({ greeting }: { greeting: HomeViewModel["greeting"] }) {
  const locale = useLocale();
  const hello = locale === "pl" ? "Cześć" : locale === "de" ? "Hallo" : locale === "ru" ? "Привет" : "Привіт";
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-100 text-lg shadow-sm ring-1 ring-sky-200" aria-hidden="true">💙</span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-extrabold text-slate-950">Happy</p>
        </div>
        <div className="mt-2 inline-block max-w-full rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2.5 text-[15px] font-semibold leading-6 text-slate-800">
          {hello}{greeting.name ? `, ${greeting.name}` : ""} <span aria-hidden="true">👋</span>
          <span className="block font-medium text-slate-600">Як ти сьогодні?</span>
        </div>
      </div>
    </div>
  );
}
