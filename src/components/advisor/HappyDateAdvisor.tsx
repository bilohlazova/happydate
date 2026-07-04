import type { AdvisorTip } from "@/lib/advisors/personAdvisor";

interface HappyDateAdvisorProps {
  tips: AdvisorTip[];
}

export default function HappyDateAdvisor({
  tips,
}: HappyDateAdvisorProps) {
  if (tips.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-5">
      <h2 className="mb-4 text-lg font-semibold text-rose-700">
        💝 HappyDate podpowiada
      </h2>

      <div className="space-y-3">
        {tips.map((tip) => (
          <div
            key={tip.id}
            className="rounded-xl bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">
                {tip.icon}
              </span>

              <div>
                <p className="font-medium text-gray-900">
                  {tip.title}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {tip.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}