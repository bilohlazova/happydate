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
    <section className="flex items-center justify-between gap-4 rounded-[1.5rem] bg-blue-50 px-6 py-5 shadow-[0_16px_40px_rgba(37,99,235,0.08)] sm:px-8">
      <div>
        <p className="text-xl font-black text-slate-950">
          {recommendation.title}
        </p>
        <p className="mt-2 text-base font-bold text-slate-950 sm:text-lg">
          {recommendation.message}
        </p>
        <button
          type="button"
          className="mt-2 text-left text-base font-bold text-blue-600 transition hover:text-blue-500"
        >
          {recommendation.actionLabel}
        </button>
      </div>

      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white text-5xl shadow-[0_16px_35px_rgba(37,99,235,0.1)]">
        {recommendation.icon}
      </div>
    </section>
  );
}
