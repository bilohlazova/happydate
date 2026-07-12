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
    <section className="flex min-h-16 items-center justify-between gap-3 rounded-[1rem] bg-blue-50 px-3.5 py-2.5 shadow-[0_8px_20px_rgba(37,99,235,0.06)]">
      <div className="min-w-0">
        <p className="truncate text-xs font-black text-slate-950">
          {recommendation.title}
        </p>
        <p className="truncate text-sm font-bold leading-5 text-slate-950">
          {recommendation.message}
        </p>
        <button
          type="button"
          className="text-left text-xs font-extrabold leading-4 text-blue-600 transition hover:text-blue-500"
        >
          {recommendation.actionLabel}
        </button>
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-[0_8px_18px_rgba(37,99,235,0.08)]">
        {recommendation.icon}
      </div>
    </section>
  );
}
