import { NextResponse } from "next/server";

const unavailable = () => NextResponse.json(
  {
    error: "service_not_available",
    message: "Message from Heaven is a future HappyDate service and does not accept uploads or orders.",
  },
  { status: 410, headers: { "Cache-Control": "no-store" } },
);

/** Deliberately does not read files, form fields, credentials or user data. */
export function POST() {
  return unavailable();
}

export function GET() {
  return unavailable();
}
