import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type GiftNotifyPayload = {
  user_id: string | null;
  event_title?: string | null;
  occasion?: string | null;
  event_date?: string | null;
  for_whom?: string | null;
  budget_pln?: number | null;
  split_payment?: boolean;
  anonymity?: boolean;
  delivery?: string | null;
  interests?: string | null;
  notes?: string | null;
};

const resendKey = process.env.RESEND_API_KEY;
const TO = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

const resend = resendKey ? new Resend(resendKey) : null;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GiftNotifyPayload;

    // Якщо немає ключа або отримувача — працюємо в dry-run режимі на деві
    if (!resend || !TO) {
      console.log("[notify-gift] (dry-run) payload:", body);
      return NextResponse.json({ ok: true, dryRun: true });
    }

    const subject = `🎁 Nowa prośba o prezent: ${body.event_title ?? "bez tytułu"}`;
    const lines = [
      `Użytkownik: ${body.user_id ?? "anon"}`,
      `Okazja: ${body.occasion ?? body.event_title ?? "—"}`,
      `Data: ${body.event_date ?? "—"}`,
      `Dla kogo: ${body.for_whom ?? "—"}`,
      `Budżet: ${body.budget_pln ?? "—"} zł`,
      `Zrzutka: ${body.split_payment ? "tak" : "nie"}`,
      `Anonimowo: ${body.anonymity ? "tak" : "nie"}`,
      `Dostawa: ${body.delivery ?? "—"}`,
      `Zainteresowania: ${body.interests ?? "—"}`,
      `Notatki: ${body.notes ?? "—"}`,
    ].join("\n");

    await resend.emails.send({
      from: "HappyDate <no-reply@happydate.app>", // заміни на свій домен у Resend
      to: [TO],
      subject,
      text: lines,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[notify-gift] error", message);
    return NextResponse.json(
      { ok: false, error: "notify_failed", message },
      { status: 500 }
    );
  }
}
