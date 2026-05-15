import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

/* ================= TYPES ================= */

type AiIdea = {
  title: string;
  explanation: string;
  why: string;
  price_range: string;
};

type AiResponse = {
  ideas: AiIdea[];
};

/* ================= ENV ================= */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

/* ================= CLIENTS ================= */

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/* ================= SCHEMA ================= */

const schema = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          explanation: { type: "string" },
          why: { type: "string" },
          price_range: { type: "string" },
        },
        required: [
          "title",
          "explanation",
          "why",
          "price_range",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["ideas"],
  additionalProperties: false,
} as const;

/* ================= ROUTE ================= */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const personId = body.personId as string | undefined;
    const occasion = body.occasion || "general";

    if (!personId) {
      return NextResponse.json(
        { ideas: [], error: "Missing personId" },
        { status: 400 }
      );
    }

    /* ================= CACHE CHECK ================= */

    const { data: cached, error: cacheError } =
      await supabase
        .from("ai_gift_cache")
        .select("ideas")
        .eq("person_id", personId)
        .eq("occasion", occasion)
        .maybeSingle();

    if (!cacheError && cached?.ideas) {
      return NextResponse.json({
        ideas: cached.ideas,
        cached: true,
      });
    }

    /* ================= LOAD PERSON ================= */

    const { data: person } = await supabase
      .from("people")
      .select("name, relation")
      .eq("id", personId)
      .maybeSingle();

    /* ================= LOAD NOTES ================= */

    const { data: notes } = await supabase
      .from("notes")
      .select("content")
      .eq("person_id", personId)
      .order("created_at", { ascending: false });

    const notesText =
      notes && notes.length > 0
        ? notes.map((n) => `- ${n.content}`).join("\n")
        : "No notes provided.";

    /* ================= PROMPT ================= */

    const input = `
You are an elite gift recommendation expert.

Person: ${person?.name ?? "Unknown"}
Relation: ${person?.relation ?? "Unknown"}
Occasion: ${occasion}

Notes:
${notesText}

Generate exactly 5 gift ideas available in Poland.

Return ONLY valid JSON matching schema.
`;

    /* ================= OPENAI ================= */

    const ai = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.8,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "gift_ideas",
          strict: true,
          schema,
        },
      },
    });

    const output = ai.output_text;

    if (!output) {
      throw new Error("Empty AI output");
    }

    let parsed: AiResponse;

    try {
      parsed = JSON.parse(output);
    } catch {
      throw new Error("Invalid JSON from AI");
    }

    /* ================= SAVE CACHE ================= */

    await supabase.from("ai_gift_cache").upsert(
      {
        person_id: personId,
        occasion,
        ideas: parsed.ideas,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "person_id,occasion",
      }
    );

    /* ================= RETURN ================= */

    return NextResponse.json({
      ideas: parsed.ideas,
      cached: false,
    });
  } catch (error) {
    console.error("AI ROUTE ERROR:", error);

    return NextResponse.json(
      {
        ideas: [],
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}