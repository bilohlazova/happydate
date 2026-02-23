// src/app/api/auto-release/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Виконуємо на Node (не Edge), щоб безпечно Юзати SERVICE ROLE
export const runtime = "nodejs";

function unauthorized(msg = "Unauthorized") {
  return NextResponse.json({ ok: false, error: msg }, { status: 401 });
}

async function runAutoRelease() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Знайдемо всі лочки до сьогодні
  const { data: rows, error: selErr } = await supabase
    .from("partner_holds")
    .select("id, partner_id, amount, status, release_date, note")
    .eq("status", "locked")
    .lte("release_date", new Date().toISOString().slice(0, 10)); // YYYY-MM-DD

  if (selErr) throw selErr;

  if (!rows || rows.length === 0) {
    return { updated: 0, ids: [] as string[] };
  }

  // 2) Оновимо по черзі, аби НЕ перетирати існуючі нотатки
  const suffix = ` ⏱️ auto-release ${new Date().toISOString()}`;
  const ids: string[] = [];

  for (const r of rows) {
    const newNote = (r.note ?? "") + suffix;
    const { error: updErr } = await supabase
      .from("partner_holds")
      .update({ status: "released", note: newNote })
      .eq("id", r.id)
      .eq("status", "locked"); // ще одна запобіжна перевірка
    if (updErr) throw updErr;
    ids.push(r.id);
  }

  return { updated: ids.length, ids };
}

function checkSecret(req: Request) {
  const fromHeader = req.headers.get("x-cron-secret");
  const fromQuery = new URL(req.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  return expected && (fromHeader === expected || fromQuery === expected);
}

export async function GET(req: Request) {
  if (!checkSecret(req)) return unauthorized();
  try {
    const out = await runAutoRelease();
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // дозволяємо і POST, щоб крон/CI могли викликати як завгодно
  return GET(req);
}
