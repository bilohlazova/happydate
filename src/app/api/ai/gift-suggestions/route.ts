import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getCachedGiftIdeas,
  findOwnedGiftPerson,
  loadLegacyGiftNotes,
  loadGiftIntelligenceSource,
  saveGiftIdeas,
} from "@/lib/repositories/giftIntelligenceRepository.server";
import {
  authenticateGiftRequest,
  resolveGiftAccess,
} from "@/lib/gifts/giftApiSecurity";
import {
  buildGiftKnowledgeContext,
  formatGiftContextAsLegacyNotes,
} from "@/lib/gifts/giftKnowledgeContext";

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

/* ================= CLIENTS ================= */

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

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

    const access = await resolveGiftAccess(req, personId, {
      authenticate: authenticateGiftRequest,
      findOwnedPerson: findOwnedGiftPerson,
    });
    if (!access.ok) {
      return NextResponse.json(
        { ideas: [], error: access.error },
        { status: access.status },
      );
    }
    const ownedPerson = access.person;

    const cached = await getCachedGiftIdeas(ownedPerson, occasion);

    if (cached) {
      return NextResponse.json({
        ideas: cached,
        cached: true,
      });
    }

    /* ================= LOAD PERSON ================= */

    const { person, knowledge } =
      await loadGiftIntelligenceSource(ownedPerson);
    const giftContext = buildGiftKnowledgeContext(ownedPerson.id, knowledge);
    const legacyNotes = giftContext.facts.length
      ? []
      : await loadLegacyGiftNotes(ownedPerson);
    const notesText = formatGiftContextAsLegacyNotes(giftContext, legacyNotes);

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

    await saveGiftIdeas(ownedPerson, occasion, parsed.ideas);

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
