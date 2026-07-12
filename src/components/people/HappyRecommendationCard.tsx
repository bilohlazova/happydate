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
    <section className="flex min-h-14 items-center justify-between gap-3 rounded-[0.95rem] bg-blue-50 px-3.5 py-2 shadow-[0_6px_16px_rgba(37,99,235,0.05)]">
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

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-[0_6px_14px_rgba(37,99,235,0.07)]">
        {recommendation.icon}
      </div>
    </section>
  );
}
