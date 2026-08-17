import { randomUUID } from "node:crypto";
import { ERROR_EVENT_MAX_BYTES, parseSafeClientErrorEvent } from "@/lib/observability/errorEvent";
import { readBoundedJson } from "@/lib/server/readBoundedJson";
import { getAssistantRequestIdentity } from "@/lib/assistant/chatIdentity";
import { createConfiguredAssistantRateLimiter } from "@/lib/assistant/rateLimiter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsedBody = await readBoundedJson(request, ERROR_EVENT_MAX_BYTES);
  if (!parsedBody.ok) {
    return Response.json(
      { error: parsedBody.error },
      { status: parsedBody.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  const event = parseSafeClientErrorEvent(parsedBody.value);
  if (!event) {
    return Response.json(
      { error: "invalid_request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const limiter = createConfiguredAssistantRateLimiter();
  if (!limiter) {
    return Response.json(
      { error: "service_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const identity = await getAssistantRequestIdentity(request);
  const limit = await limiter.check(`telemetry:${identity.key}`, "guest").catch(() => null);
  if (!limit) {
    return Response.json(
      { error: "service_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!limit.allowed) {
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1_000))),
        },
      },
    );
  }

  // This record deliberately excludes message, stack, URL query, user/contact
  // identifiers and free-form content. Hosting logs can route the JSON onward.
  console.error(JSON.stringify({
    level: "error",
    service: "happydate-web",
    event: "client_error",
    eventId: randomUUID(),
    ...event,
    receivedAt: new Date().toISOString(),
  }));

  return new Response(null, {
    status: 202,
    headers: { "Cache-Control": "no-store" },
  });
}
