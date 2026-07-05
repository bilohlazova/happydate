import type { HappyCard } from "@/lib/happy";

interface HappyCardsProps {
  cards: HappyCard[];
}

export default function HappyCards({
  cards,
}: HappyCardsProps) {
  if (cards.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      {cards.map((card) => (
        <div
          key={card.id}
          className="
            rounded-2xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
          "
        >
          <div className="flex gap-3">
            <div className="text-2xl">
              {card.icon}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">
                {card.title}
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                {card.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}