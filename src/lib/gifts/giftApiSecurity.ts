import { createClient } from "@supabase/supabase-js";
import type { OwnedGiftPerson } from "../repositories/giftIntelligenceRepository.server.ts";

export interface GiftAccessDependencies {
  authenticate(request: Request): Promise<string | null>;
  findOwnedPerson(userId: string, personId: string): Promise<OwnedGiftPerson | null>;
}

export type GiftAccessResult =
  | { ok: true; person: OwnedGiftPerson }
  | { ok: false; status: 401 | 404; error: "unauthorized" | "person_not_found" };

export async function authenticateGiftRequest(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  if (!token || !url || !key) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(token);
  return !error && data.user?.id ? data.user.id : null;
}

export async function resolveGiftAccess(
  request: Request,
  personId: string,
  dependencies: GiftAccessDependencies,
): Promise<GiftAccessResult> {
  const userId = await dependencies.authenticate(request);
  if (!userId) return { ok: false, status: 401, error: "unauthorized" };
  const person = await dependencies.findOwnedPerson(userId, personId);
  return person
    ? { ok: true, person }
    : { ok: false, status: 404, error: "person_not_found" };
}

