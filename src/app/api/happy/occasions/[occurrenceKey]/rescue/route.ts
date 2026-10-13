import { createOccasionRescueHandler } from "@/lib/occasions/occasionRescueApplication.server";
import { createOpenAiOccasionRescueProvider } from "@/lib/occasions/occasionRescueProvider.server";

export const runtime = "nodejs";
export const POST = createOccasionRescueHandler({ provider: createOpenAiOccasionRescueProvider() });
