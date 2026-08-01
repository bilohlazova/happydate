import { createHash } from "node:crypto";
import { createConfiguredAssistantRateLimiter } from "@/lib/assistant/rateLimiter";
import {
  authenticateHappyLearningRequest,
  findOwnedHappyLearningPerson,
  loadOwnedHappyLearningKnowledge,
} from "@/lib/happy-learning/happyLearningAccess.server";
import { createHappyLearningDetectV2Response } from "@/lib/happy-learning/happyLearningDetectV2.server";
import { createOpenAiHappyLearningProvider } from "@/lib/happy-learning/openAiHappyLearningProvider.server";
import { issueHappyLearningDetectionToken } from "@/lib/happy-learning/happyLearningDetectionToken.server";

export const runtime = "nodejs";

function rateLimitKey(userId: string): string {
  return createHash("sha256").update(`happy-learning-detect:${userId}`).digest("hex");
}

export async function POST(request: Request) {
  const limiter = createConfiguredAssistantRateLimiter();
  return createHappyLearningDetectV2Response(request, {
    authenticate: authenticateHappyLearningRequest,
    findOwnedPerson: findOwnedHappyLearningPerson,
    loadKnowledge: loadOwnedHappyLearningKnowledge,
    provider: createOpenAiHappyLearningProvider(),
    issueDetectionToken: (userId, candidate) => issueHappyLearningDetectionToken({
      userId,
      candidate,
      secret: process.env.HAPPY_LEARNING_TOKEN_SECRET?.trim() ?? "",
    }),
    checkRateLimit: async (userId) => {
      if (!limiter) throw new Error("rate_limiter_unavailable");
      return (await limiter.check(rateLimitKey(userId), "authenticated")).allowed;
    },
  });
}
