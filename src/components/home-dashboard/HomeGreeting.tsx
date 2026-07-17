import type { HomeViewModel } from "@/lib/home/home.types";

export default function HomeGreeting({ greeting }: { greeting: HomeViewModel["greeting"] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-sky-600">HappyDate</p>
      <h1 className="text-[2rem] font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-[2.45rem]">
        {greeting.title} <span aria-hidden="true">👋</span>
      </h1>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500 sm:text-base">
        {greeting.subtitle}
      </p>
    </div>
  );
}
