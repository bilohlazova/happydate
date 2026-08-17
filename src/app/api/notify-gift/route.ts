import { NextResponse } from "next/server";

const unavailable = () => NextResponse.json(
  { error: "service_not_available", message: "Gift ordering and delivery are future HappyDate services." },
  { status: 410, headers: { "Cache-Control": "no-store" } },
);

export function POST() { return unavailable(); }
export function GET() { return unavailable(); }
