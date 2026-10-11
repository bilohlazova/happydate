import "server-only";
import { getAssistantRequestIdentity, type AssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import type { HappyAgentProvider } from "../agent/happyAgent.types";
import { continueBirthdayTask, type ContinueBirthdayTaskResult } from "./continueBirthdayTask.server";

type RouteContext = { params: Promise<{ id: string }> };
type Dependencies = {
  authenticate?: (request: Request) => Promise<AssistantRequestIdentity>;
  provider: () => HappyAgentProvider;
  continueTask?: typeof continueBirthdayTask;
};

const headers = { "Cache-Control": "no-store" };

/** Server-only application boundary. Dependencies are fixed by the server;
 * request data can never select a provider or workflow authority. */
export function createBirthdayTaskContinuationHandler(dependencies: Dependencies) {
  const authenticate = dependencies.authenticate ?? getAssistantRequestIdentity;
  const run = dependencies.continueTask ?? continueBirthdayTask;
  return async function handle(request: Request, { params }: RouteContext): Promise<Response> {
    const body = await request.text();
    if (body.trim()) return Response.json({ error: "invalid_request" }, { status: 400, headers });
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "invalid_request" }, { status: 400, headers });
    const identity = await authenticate(request);
    if (identity.kind !== "authenticated" || !identity.userId) return Response.json({ error: "unauthorized" }, { status: 401, headers });
    const result: ContinueBirthdayTaskResult = await run({ userId: identity.userId, taskId: id, locale: "en", timezone: "UTC", provider: dependencies.provider() });
    const status = result.kind === "not_found" ? 404 : result.kind === "invalid_state" ? 409 : result.kind === "provider_unavailable" ? 502 : result.kind === "unavailable" ? 503 : 200;
    return Response.json(result, { status, headers });
  };
}
