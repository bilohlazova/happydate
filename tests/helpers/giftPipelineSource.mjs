import { readFile } from "node:fs/promises";

/**
 * Text of the Gift AI route plus the shared pipeline service it delegates to.
 * Contract tests assert behaviour that now lives in the service; the route text
 * comes first so ordering assertions (ownership before cache before provider)
 * keep their meaning.
 */
export async function readGiftPipelineSource() {
  const [route, service] = await Promise.all([
    readFile(new URL("../../src/app/api/ai/gift-suggestions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/lib/gift-intelligence/giftRecommendationService.server.ts", import.meta.url), "utf8"),
  ]);
  return `${route}\n${service}`;
}
