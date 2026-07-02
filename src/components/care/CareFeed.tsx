"use client";

import InsightCard from "../assistant/InsightCard";
import MemoryCard from "./MemoryCard";
import type { AssistantCardData } from "@/lib/brain/mapInsightToAssistant";

interface CareFeedProps {
  hero: AssistantCardData | null;
}

export default function CareFeed({ hero }: CareFeedProps) {
  return (
    <div className="space-y-6">
      {/* Hero Card */}
      {hero && <InsightCard data={hero} />}

      {/* Brain recommendations (поки заглушка) */}
      <div className="rounded-2xl border border-dashed border-gray-300 p-5">
        <p className="text-sm text-gray-500">
         
        </p>
      </div>

      {/* Memory Card */}
      <MemoryCard />

      {/* AI recommendations (поки заглушка) */}
      <div className="rounded-2xl border border-dashed border-gray-300 p-5">
        <p className="text-sm text-gray-500">
          Тут будуть пропозиції AI
        </p>
      </div>
    </div>
  );
}