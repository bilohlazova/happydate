import { appendFile } from "node:fs/promises";
import { createOccasionRescueHandler } from "@/lib/occasions/occasionRescueApplication.server";

const clock = (mode: string): Date => {
  if (mode === "today") return new Date("2026-09-30T08:00:00.000Z");
  if (mode === "planning") return new Date("2026-09-23T08:00:00.000Z");
  if (mode === "preparing") return new Date("2026-09-27T08:00:00.000Z");
  return new Date("2026-09-29T08:00:00.000Z");
};

export async function POST(request: Request, context: { params: Promise<{ mode: string; occurrenceKey: string }> }) {
  const { mode } = await context.params;
  const handler = createOccasionRescueHandler({
    now: () => clock(mode),
    provider: async () => {
      await appendFile("/tmp/block51-provider-calls", "1\n");
      return { suggestions: [
        { category: "quick_gift", title: "Quick gift", description: "Consider a simple thoughtful item." },
        { category: "digital", title: "Digital option", description: "Consider a digital option." },
        { category: "greeting", title: "Greeting", description: "Write a personal message." },
      ] };
    },
  });
  return handler(request, context);
}
