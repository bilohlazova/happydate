import { createHash } from "node:crypto";
import { createConfiguredAssistantRateLimiter } from "@/lib/assistant/rateLimiter";
import { authenticateHappyLearningRequest, findOwnedHappyLearningPerson, loadOwnedHappyLearningKnowledge } from "@/lib/happy-learning/happyLearningAccess.server";
import { createHappyLearningConfirmV2Response } from "@/lib/happy-learning/happyLearningConfirmV2.server";
import { createKnowledgeOnServer } from "@/lib/repositories/knowledgeRepository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limiter = createConfiguredAssistantRateLimiter();
  return createHappyLearningConfirmV2Response(request, {
    authenticate: authenticateHappyLearningRequest,
    findOwnedPerson: findOwnedHappyLearningPerson,
    loadKnowledge: loadOwnedHappyLearningKnowledge,
    persist: createKnowledgeOnServer,
    tokenSecret: process.env.HAPPY_LEARNING_TOKEN_SECRET?.trim() ?? "",
    checkRateLimit: async (userId) => {
      if (!limiter) return false;
      const key = createHash("sha256").update(`happy-learning-confirm:${userId}`).digest("hex");
      return (await limiter.check(key, "authenticated")).allowed;
    },
  });
}
