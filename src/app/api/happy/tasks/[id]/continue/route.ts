import { createBirthdayTaskContinuationHandler } from "@/lib/happy/task-engine/continueBirthdayTaskApplication.server";
import { createOpenAiHappyAgentProvider } from "@/lib/happy/agent/happyAgentProvider.server";

export const POST = createBirthdayTaskContinuationHandler({ provider: createOpenAiHappyAgentProvider });
