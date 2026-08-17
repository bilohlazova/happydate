import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const unavailable = () => NextResponse.json(
  { ok: false, error: "service_not_available" },
  { status: 410, headers: { "Cache-Control": "no-store" } },
);

/** Future animation delivery is intentionally closed until signed webhooks exist. */
export async function POST() {
  return unavailable();
}
