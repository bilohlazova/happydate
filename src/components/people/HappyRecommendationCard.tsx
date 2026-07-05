export interface HappyRecommendation {
  title: string;
  message: string;
  actionLabel: string;
  icon: string;
}

interface HappyRecommendationCardProps {
  recommendation: HappyRecommendation | null;
}

export function HappyRecommendationCard({
  recommendation,
}: HappyRecommendationCardProps) {
  if (!recommendation) {
    return null;
  }

  return (
    <section className="flex min-h-20 items-center justify-between gap-3 rounded-[1.2rem] bg-blue-50 px-4 py-3 shadow-[0_10px_26px_rgba(37,99,235,0.07)]">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-950">
          {recommendation.title}
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-slate-950">
          {recommendation.message}
        </p>
        <button
          type="button"
          className="mt-1 text-left text-xs font-extrabold text-blue-600 transition hover:text-blue-500"
        >
          {recommendation.actionLabel}
        </button>
      </div>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-3xl shadow-[0_10px_24px_rgba(37,99,235,0.08)]">
        {recommendation.icon}
      </div>
    </section>
  );
}
