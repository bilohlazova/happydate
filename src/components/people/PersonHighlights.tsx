import Card from "@/components/ui/Card";

import type { MemoryRow } from "@/lib/repositories/memory.types";
import { getPersonHighlights } from "@/lib/people/personHighlights";

interface PersonHighlightsProps {
  memories: MemoryRow[];
}

export default function PersonHighlights({
  memories,
}: PersonHighlightsProps) {
  const highlights = getPersonHighlights(memories);

  if (highlights.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">
        ⭐ Najważniejsze
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
              {highlight.title}
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