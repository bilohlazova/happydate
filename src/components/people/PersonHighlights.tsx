import Card from "@/components/ui/Card";
import { useTranslations } from "next-intl";

import type { MemoryRow } from "@/lib/repositories/memory.types";
import { getPersonHighlights } from "@/lib/people/personHighlights";

interface PersonHighlightsProps {
  memories: MemoryRow[];
}

export default function PersonHighlights({
  memories,
}: PersonHighlightsProps) {
  const t = useTranslations("person");
  const highlights = getPersonHighlights(memories);

  if (highlights.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("highlights.title")}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {highlights.map((highlight) => (
          <Card
            key={highlight.id}
            className="p-4"
          >
            <div className="text-3xl">
              {highlight.icon}
            </div>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t(`highlights.${highlight.id as "coffee" | "food" | "restaurant" | "place" | "flower" | "movie" | "music" | "book" | "hobby"}`)}
            </p>

            <p className="mt-2 font-semibold text-gray-900">
              {highlight.value}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
