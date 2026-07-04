// src/components/memories/MemoryList.tsx

import type { MemoryRow } from "@/lib/repositories/memory.types";

interface MemoryListProps {
  memories: MemoryRow[];
}

export default function MemoryList({
  memories,
}: MemoryListProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">
        Wspomnienia
      </h2>

      {memories.length === 0 ? (
        <p className="text-sm text-gray-600">
          Brak wspomnień.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {memories.map((memory) => (
            <li
              key={memory.id}
              className="rounded-md border border-gray-200 p-3"
            >
              {memory.title ??
                memory.content_text ??
                "Bez tytułu"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}