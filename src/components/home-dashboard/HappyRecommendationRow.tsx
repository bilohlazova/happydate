import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HomeRecommendation } from "@/lib/home/home.types";

export default function HappyRecommendationRow({ recommendation }: { recommendation: HomeRecommendation }) {
  return (
    <li><Link href={recommendation.href} className="flex min-w-0 items-center gap-3 px-3 py-3 transition hover:bg-sky-50/70 sm:px-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg" aria-hidden="true">{recommendation.icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-800">{recommendation.title}</span>{recommendation.description && <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">{recommendation.description}</span>}</span><ChevronRight size={17} className="shrink-0 text-slate-400" aria-hidden="true" /></Link></li>
  );
}
