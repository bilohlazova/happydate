import type { MemoryRow } from "@/lib/repositories/memory.types";

import MemoryTimelineItem from "@/components/memories/MemoryTimelineItem";
import Card from "@/components/ui/Card";
import { useTranslations } from "next-intl";

interface MemoryListProps {
  memories: MemoryRow[];
}

export default function MemoryList({
  memories,
}: MemoryListProps) {
  const t = useTranslations("person");
  if (memories.length === 0) {
    return (
      <section aria-label={t("accessibility.memorySection")} className="mt-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          {t("memories.title")}
        </h2>

        <Card className="p-8 text-center">
          <div className="mb-4 text-5xl">
            📖
          </div>

          <h3 className="text-lg font-semibold text-gray-900">
            {t("memories.emptyTitle")}
          </h3>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            {t("memories.emptyDescription")}
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section aria-label={t("accessibility.memorySection")} className="mt-8">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        {t("memories.title")}
      </h2>

      <div>
        {memories.map((memory) => (
          <MemoryTimelineItem
            key={memory.id}
            memory={memory}
          />
        ))}
      </div>
    </section>
  );
}
