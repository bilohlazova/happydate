import { NextResponse } from "next/server";

const unavailable = () => NextResponse.json(
  {
    error: "service_not_available",
    message: "Podaruj Dobro is a future HappyDate service and does not accept submissions.",
  },
  { status: 410, headers: { "Cache-Control": "no-store" } },
);

/** Deliberately does not parse or persist the request body. */
export function POST() {
  return unavailable();
}

export function GET() {
  return unavailable();
}
