import type { HomeRecommendation } from "@/lib/home/home.types";
import type { GiftOutcomeValue } from "@/lib/gifts/gift.types";
import HappyRecommendationRow from "./HappyRecommendationRow";

export default function HappyRecommendationsSection({ recommendations, title, onGiftOutcome, onGiftFollowUp, followUpLabels }: { recommendations: HomeRecommendation[]; title: string; onGiftOutcome: (giftId: string, outcome: GiftOutcomeValue) => Promise<void>; onGiftFollowUp: (giftId: string, action: "snooze" | "dismiss") => Promise<void>; followUpLabels: { answerLabel: string; liked: string; notLiked: string; unsure: string; snooze: string; dismiss: string; error: string } }) {
  if (!recommendations.length) return null;
  return <section className="mt-7"><h2 className="mb-3 text-lg font-black text-slate-900">{title}</h2><ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.045)]">{recommendations.map((recommendation) => <HappyRecommendationRow key={recommendation.id} recommendation={recommendation} onGiftOutcome={onGiftOutcome} onGiftFollowUp={onGiftFollowUp} labels={followUpLabels} />)}</ul></section>;
}
