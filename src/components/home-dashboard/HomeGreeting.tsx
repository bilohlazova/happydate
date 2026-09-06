import type { HomeViewModel } from "@/lib/home/home.types";

export default function HomeGreeting({ greeting }: { greeting: HomeViewModel["greeting"] }) {
  return (
    <div>
      <h1 className="text-[1.8rem] font-extrabold leading-tight tracking-[-0.035em] text-slate-950 sm:text-[2.35rem]">
        {greeting.title} <span aria-hidden="true">👋</span>
      </h1>
    </div>
  );
}
