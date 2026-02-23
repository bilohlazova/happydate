// src/app/api/replicate/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // potrzebny Buffer itd.

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

/** Minimalny, bezpieczny typ ciała webhooka Replicate */
type ReplicateWebhookBody = {
  id: string; // prediction.id
  status: "starting" | "processing" | "succeeded" | "failed" | string;
  output?: string | string[] | null;
  error?: string | null;
  // inne pola nas nie interesują
};

export async function POST(req: NextRequest) {
  try {
    // (Opcjonalnie) weryfikacja podpisu z nagłówka:
    // const signature = req.headers.get("replicate-signature"); // jeżeli skonfigurujesz

    const body = (await req.json()) as ReplicateWebhookBody;

    // 1) Znajdź rekord po prediction_id
    const { data: rows, error } = await supabase
      .from("animations")
      .select("id")
      .eq("replicate_prediction_id", body.id)
      .limit(1);

    if (error) throw error;
    if (!rows?.length) {
      return NextResponse.json({ ok: true, note: "Record not found for prediction_id" });
    }

    const animId = rows[0].id;

    // 2) Statusy
    if (body.status === "succeeded") {
      const out = Array.isArray(body.output) ? body.output[0] : body.output ?? null;
      const resultUrl = typeof out === "string" ? out : null;

      await supabase
        .from("animations")
        .update({ status: "done", result_video_url: resultUrl })
        .eq("id", animId);
    } else if (body.status === "failed") {
      await supabase
        .from("animations")
        .update({ status: "failed", error: body.error ?? "Prediction failed" })
        .eq("id", animId);
    } else {
      // "starting" / "processing" i inne przejściowe
      await supabase.from("animations").update({ status: "processing" }).eq("id", animId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook error";
    console.error("[/api/replicate/webhook] error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* --- (opcjonalne) mirror wyniku do Supabase, jeżeli chcesz stały URL w swoim bucket’cie ---
async function mirrorToSupabase(srcUrl: string | null): Promise<string | null> {
  if (!srcUrl) return null;

  const res = await fetch(srcUrl);
  if (!res.ok) return srcUrl;

  const buf = Buffer.from(await res.arrayBuffer());
  const filename = `results/${Date.now()}-result.mp4`;

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(filename, buf, { contentType: "video/mp4", upsert: false });
  if (error) return srcUrl;

  const { data: pub } = supabase.storage.from("uploads").getPublicUrl(data.path);
  return pub?.publicUrl || srcUrl;
}
*/
