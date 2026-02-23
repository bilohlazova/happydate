// src/app/api/replicate/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Minimalny typ webhooka Replicate */
type ReplicateWebhookBody = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | string;
  output?: string | string[] | null;
  error?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    // ✅ Створюємо client ТУТ (не зверху)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json()) as ReplicateWebhookBody;

    // знайти animation
    const { data: rows, error } = await supabase
      .from("animations")
      .select("id")
      .eq("replicate_prediction_id", body.id)
      .limit(1);

    if (error) throw error;

    if (!rows?.length) {
      return NextResponse.json({
        ok: true,
        note: "Record not found",
      });
    }

    const animId = rows[0].id;

    if (body.status === "succeeded") {
      const out = Array.isArray(body.output)
        ? body.output[0]
        : body.output ?? null;

      const resultUrl = typeof out === "string" ? out : null;

      await supabase
        .from("animations")
        .update({
          status: "done",
          result_video_url: resultUrl,
        })
        .eq("id", animId);
    }

    else if (body.status === "failed") {
      await supabase
        .from("animations")
        .update({
          status: "failed",
          error: body.error ?? "Prediction failed",
        })
        .eq("id", animId);
    }

    else {
      await supabase
        .from("animations")
        .update({
          status: "processing",
        })
        .eq("id", animId);
    }

    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error("Webhook error:", e);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}