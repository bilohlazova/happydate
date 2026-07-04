import type { AdvisorTip } from "@/lib/advisors/personAdvisor";
import { THEME } from "@/lib/theme";

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
    <section
      className={`
        overflow-hidden
        rounded-3xl
        ${THEME.card.base}
        ${THEME.card.shadow}
      `}
    >
      <div
        className={`
          ${THEME.brand.gradient}
          px-6
          py-4
        `}
      >
        <h2 className="text-xl font-bold text-white">
          🎁 HappyDate
        </h2>

        <p className="mt-1 text-sm text-sky-100">
          Twój osobisty asystent prezentowy
        </p>
      </div>

      <div className="space-y-4 p-5">
        {tips.map((tip) => (
          <div
            key={tip.id}
            className="rounded-2xl border border-sky-100 bg-white p-4 transition hover:shadow-md"
          >
            <div className="flex gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-2xl">
                {tip.icon}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {tip.title}
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-600">
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