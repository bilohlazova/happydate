import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const unavailable = () => NextResponse.json(
  { ok: false, error: "service_not_available" },
  { status: 410, headers: { "Cache-Control": "no-store" } },
);

/** Future partner settlement is intentionally closed until its financial domain exists. */
export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}
