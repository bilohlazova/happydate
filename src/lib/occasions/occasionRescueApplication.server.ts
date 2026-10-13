import "server-only";
import { createAssistantRlsClient, getAssistantRequestIdentity } from "../assistant/chatIdentity.ts";
import { resolveOccasionRescueForUser, generateOccasionRescue } from "./occasionRescue.server.ts";
import type { OccasionRescueProvider } from "./occasionRescue.types.ts";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const localeFrom = (request: Request) => (request.headers.get("accept-language")?.split(",")[0]?.trim().slice(0, 5) || "en");

/** Narrow authenticated, advisory-only boundary. The URL occurrence is always revalidated. */
export function createOccasionRescueHandler(dependencies: { provider: OccasionRescueProvider; now?: () => Date }) {
  return async function POST(request: Request, context: { params: Promise<{ occurrenceKey: string }> }) {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    let raw: unknown;
    try { raw = await request.json(); } catch { return json({ error: "invalid_request" }, 400); }
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw as Record<string, unknown>).length !== 0) return json({ error: "invalid_request" }, 400);
    const identity = await getAssistantRequestIdentity(request);
    if (identity.kind !== "authenticated" || !identity.userId) return json({ error: "unauthorized" }, 401);
    const rls = createAssistantRlsClient(request);
    if (!rls) return json({ error: "unauthorized" }, 401);
    const { occurrenceKey } = await context.params;
    try {
      const resolved = await resolveOccasionRescueForUser({ client: rls.client, userId: identity.userId, occurrenceKey, now: dependencies.now?.() });
      if (resolved.kind === "not_found") return json({ error: "not_found" }, 404);
      if (resolved.kind !== "eligible") return json({ error: "ineligible" }, 409);
      const response = await generateOccasionRescue({ resolved, locale: localeFrom(request), provider: dependencies.provider, signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) });
      return json(response);
    } catch {
      // Provider/database detail is intentionally not exposed and generation has no writes.
      return json({ error: "provider_unavailable" }, 502);
    }
  };
}
