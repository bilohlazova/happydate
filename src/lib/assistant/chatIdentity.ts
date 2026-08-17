import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { AssistantIdentityKind } from "./chatConfig.ts";
import { readSupabasePublicConfig } from "../supabase/publicConfig.ts";

export type AssistantRequestIdentity = {
  kind: AssistantIdentityKind;
  key: string;
  /** Server-verified subject. Never use the client request body as a substitute. */
  userId?: string;
};

function hashIdentity(value: string): string {
  return createHash("sha256").update(`assistant-rate-limit:${value}`).digest("hex");
}

function normalizedGuestAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim();
  return address || "unknown-address";
}

function assistantAccessToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}

/** RLS client scoped to the bearer token already verified for this request. */
export function createAssistantRlsClient(request: Request) {
  const accessToken = assistantAccessToken(request);
  const config = readSupabasePublicConfig();
  if (!accessToken || !config) return null;
  return {
    accessToken,
    client: createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }),
  };
}

export async function getAssistantRequestIdentity(request: Request): Promise<AssistantRequestIdentity> {
  const accessToken = assistantAccessToken(request);
  const publicSupabaseConfig = readSupabasePublicConfig();

  if (accessToken && publicSupabaseConfig) {
    const supabase = createClient(publicSupabaseConfig.url, publicSupabaseConfig.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data.user?.id) {
      return {
        kind: "authenticated",
        key: hashIdentity(`user:${data.user.id}`),
        userId: data.user.id,
      };
    }
  }

  return { kind: "guest", key: hashIdentity(`guest:${normalizedGuestAddress(request)}`) };
}
