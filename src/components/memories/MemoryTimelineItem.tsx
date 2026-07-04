import type { MemoryRow } from "@/lib/repositories/memory.types";

import Card from "@/components/ui/Card";

import { getMemoryIcon } from "@/lib/memories/memoryIcons";

interface MemoryTimelineItemProps {
  memory: MemoryRow;
}

function formatDate(date: string | null) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function MemoryTimelineItem({
  memory,
}: MemoryTimelineItemProps) {
  return (
    <div className="relative pl-8">
      {/* Timeline line */}
      <div className="absolute bottom-0 left-5 top-0 w-px bg-sky-100" />

      {/* Timeline dot */}
      <div className="absolute left-2 top-8 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-sm text-white shadow-md">
        {getMemoryIcon(memory.type)}
      </div>

      <Card className="mb-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900">
              {memory.title ?? "Bez tytułu"}
            </h3>

            {memory.value_text && (
              <p className="mt-2 font-medium text-sky-700">
                {memory.value_text}
              </p>
            )}

            {memory.content_text && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                {memory.content_text}
              </p>
            )}
          </div>

          {memory.occurred_on && (
            <span className="whitespace-nowrap text-xs text-gray-500">
              {formatDate(memory.occurred_on)}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}