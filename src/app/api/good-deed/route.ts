// src/app/api/good-deed/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { Resend } from "resend";

/* ───────────────── Supabase ───────────────── */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ───────────────── Resend ───────────────── */
const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM;
const RESEND_TO = process.env.RESEND_TO; // admin mail
const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

/* ───────────────── Schema ───────────────── */
const GoodDeedSchema = z.object({
  type: z.enum(["zwierzaki", "dzieci", "planeta"]),
  city: z.string().min(2).max(120).trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^(\d{2}:\d{2})?$/).optional().default(""),
  message: z.string().max(2000).optional().default(""),
  email: z.string().email().trim(),
  consent: z.boolean().refine((v) => v === true, "Wymagana zgoda"),
  _hp: z.string().max(0).optional().default(""),
});

/* ───────────────── Helpers ───────────────── */
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = GoodDeedSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Błąd walidacji" },
        { status: 400 }
      );
    }
    const { type, city, date, time, message, email, consent, _hp } = parsed.data;

    if (_hp) return NextResponse.json({ ok: true });

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;

    const { error } = await supabase.from("good_deeds").insert([
      {
        user_id: userId,
        kind: type,
        city,
        visit_date: date,
        visit_time: time || null,
        message: message || null,
        consent,
        status: "new",
        contact_email: email,
      },
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (resend && RESEND_FROM) {
      /* Admin */
      if (RESEND_TO) {
        try {
          await resend.emails.send({
            from: RESEND_FROM,
            to: RESEND_TO,
            subject: `Nowa zgłoszenie „Podaruj Dobro” — ${type} — ${city} — ${date}`,
            html: `<p><b>Rodzaj:</b> ${type}<br/><b>Miasto:</b> ${city}<br/><b>Data:</b> ${date}<br/>
                   <b>Godzina:</b> ${time || "—"}<br/><b>Wiadomość:</b> ${escapeHtml(message || "—")}<br/>
                   <b>E-mail:</b> ${escapeHtml(email)}</p>`,
          });
        } catch (e) {
          console.error("Resend admin error:", e);
        }
      }

      /* User */
      try {
        await resend.emails.send({
          from: RESEND_FROM,
          to: email,
          subject: "Potwierdzenie zgłoszenia — HappyDate: Podaruj Dobro",
          html: `<h2>Dziękujemy za zgłoszenie 💛</h2>
                 <p>Otrzymaliśmy Twoją prośbę o wizytę w ramach akcji <b>„Podaruj Dobro”</b>.</p>
                 <ul><li>${type}</li><li>${city}</li><li>${date}</li><li>${time || "—"}</li></ul>`,
        });
      } catch (e) {
        console.error("Resend user error:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Server error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
