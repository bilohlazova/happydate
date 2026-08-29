import type { HomeViewModel } from "@/lib/home/home.types";

export default function HomeGreeting({ greeting }: { greeting: HomeViewModel["greeting"] }) {
  return (
    <div>
      <h1 className="text-[2rem] font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-[2.45rem]">
        {greeting.title} <span aria-hidden="true">👋</span>
      </h1>
    </div>
  );
}
