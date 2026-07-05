import Link from "next/link";

import type {
  HappyCard,
  HappyCardType,
} from "@/lib/happy";

interface HappyCardsProps {
  cards: HappyCard[];
}

const THOUGHT_STYLES: Record<
  HappyCardType,
  {
    label: string;
    accent: string;
    icon: string;
  }
> = {
  reminder: {
    label: "Zwróciłem uwagę...",
    accent: "from-sky-400 to-cyan-400",
    icon: "bg-sky-50 text-sky-700",
  },
  memory: {
    label: "Happy pomyślał...",
    accent: "from-pink-300 to-rose-300",
    icon: "bg-pink-50 text-pink-700",
  },
  idea: {
    label: "Mam pomysł...",
    accent: "from-amber-300 to-yellow-300",
    icon: "bg-amber-50 text-amber-700",
  },
  warning: {
    label: "Warto uważać...",
    accent: "from-orange-300 to-red-300",
    icon: "bg-orange-50 text-orange-700",
  },
};

export default function HappyCards({
  cards,
}: HappyCardsProps) {
  if (cards.length === 0) return null;

  const sortedCards = [...cards].sort(
    (firstCard, secondCard) =>
      firstCard.priority - secondCard.priority
  );

  return (
    <div className="mt-4 space-y-2.5">
      <style>
        {`
          @keyframes happy-thought-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      {sortedCards.map((card, index) => {
        const style = THOUGHT_STYLES[card.type];

        return (
          <Link
            key={card.id}
            href={card.actionRoute}
            aria-label={`${card.actionLabel}: ${card.title}`}
            className="
              group
              relative
              block
              overflow-hidden
              rounded-[22px]
              border
              border-white/80
              bg-white/95
              p-4
              opacity-0
              shadow-[0_14px_34px_rgba(14,165,233,0.10)]
              ring-1
              ring-sky-100/60
              transition
              duration-300
              hover:-translate-y-0.5
              hover:shadow-[0_18px_42px_rgba(14,165,233,0.16)]
              focus:outline-none
              focus:ring-2
              focus:ring-sky-300
              active:translate-y-0
            "
            style={{
              animation:
                "happy-thought-in 420ms ease-out forwards",
              animationDelay: `${index * 160}ms`,
            }}
          >
            <div
              className={`absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b ${style.accent}`}
            />

            <div className="flex gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl ${style.icon}`}
              >
                {card.icon}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                  {style.label}
                </p>

                <h3 className="mt-0.5 text-sm font-semibold text-gray-900">
                  {card.title}
                </h3>

                <p className="mt-1 text-sm leading-5 text-gray-600">
                  {card.description}
                </p>

                <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 transition-colors group-hover:text-sky-600">
                  <span>{card.actionLabel}</span>
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
