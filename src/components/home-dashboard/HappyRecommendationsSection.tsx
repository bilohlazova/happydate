import type { HomeRecommendation } from "@/lib/home/home.types";
import HappyRecommendationRow from "./HappyRecommendationRow";

export default function HappyRecommendationsSection({ recommendations, title }: { recommendations: HomeRecommendation[]; title: string }) {
  if (!recommendations.length) return null;
  return <section className="mt-7"><h2 className="mb-3 text-lg font-black text-slate-900">{title}</h2><ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.045)]">{recommendations.map((recommendation) => <HappyRecommendationRow key={recommendation.id} recommendation={recommendation} />)}</ul></section>;
}
