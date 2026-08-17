import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { permanentlyDeleteHappyDateAccount } from "@/lib/account/accountDeletion.server";
import { requireSupabasePublicConfig } from "@/lib/supabase/publicConfig";
import { readBoundedJson } from "@/lib/server/readBoundedJson";

export const runtime = "nodejs";
const MAX_AUTH_AGE_MS = 30 * 60 * 1000;

function response(body: { ok: boolean; error?: string }, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!accessToken) return response({ ok: false, error: "authentication_required" }, 401);

  const parsedBody = await readBoundedJson(request, 4 * 1024);
  if (!parsedBody.ok) {
    return response({ ok: false, error: parsedBody.error }, parsedBody.status);
  }
  let confirmation = "";
  const body = parsedBody.value;
  if (body && typeof body === "object" && "confirmation" in body) {
    const value = (body as { confirmation?: unknown }).confirmation;
    if (typeof value === "string" && value.length <= 320) confirmation = value.trim();
  }

  const config = requireSupabasePublicConfig();
  const verifier = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await verifier.auth.getUser(accessToken);
  const user = error ? null : data.user;
  if (!user?.email) return response({ ok: false, error: "authentication_required" }, 401);
  const lastSignInAt = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : Number.NaN;
  if (!Number.isFinite(lastSignInAt) || Date.now() - lastSignInAt > MAX_AUTH_AGE_MS) {
    return response({ ok: false, error: "reauthentication_required" }, 403);
  }
  if (confirmation.toLocaleLowerCase() !== user.email.toLocaleLowerCase()) {
    return response({ ok: false, error: "confirmation_mismatch" }, 400);
  }

  try {
    await permanentlyDeleteHappyDateAccount(user.id);
    return response({ ok: true }, 200);
  } catch {
    return response({ ok: false, error: "deletion_failed" }, 500);
  }
}
