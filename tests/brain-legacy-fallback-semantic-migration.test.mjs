import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";
import ts from "typescript";

import {
  buildMemoryInsight,
} from "../src/lib/brain/engines/memoryEngine.ts";
import {
  buildPreferenceInsight,
} from "../src/lib/brain/engines/preferenceEngine.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../"))
      && !/\.[^/]+$/.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      const source = readFileSync(new URL(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
          fileName: new URL(url).pathname,
        }).outputText,
      };
    }
    return nextLoad(url, context);
  },
});

const { buildInsights } = await import("../src/lib/brain/buildInsights.ts");

function record(id, type, value, overrides = {}) {
  return {
    id,
    personId: null,
    eventId: null,
    type,
    title: "Tytuł",
    value,
    content: null,
    importance: 0,
    occurredOn: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    isActive: true,
    ...overrides,
  };
}

test("legacy memory fallback preserves memory, note and story behavior", () => {
  for (const type of ["memory", "note", "story"]) {
    const result = buildMemoryInsight({
      memories: [record(type, type, `Wartość ${type}`)],
    });

    assert.deepEqual(result, {
      id: `memory-${type}`,
      type: "memory",
      priority: 100,
      icon: "💭",
      title: "Pamiętam",
      description: `Tytuł: Wartość ${type}`,
    });
  }
});

test("legacy preference fallback preserves its exact category allowlist", () => {
  const allowed = [
    "flower",
    "coffee",
    "restaurant",
    "food",
    "movie",
    "book",
    "music",
    "perfume",
    "hobby",
  ];
  for (const type of allowed) {
    assert.equal(
      buildPreferenceInsight({
        memories: [record(type, type, `Wartość ${type}`)],
      })?.id,
      `preference-${type}`,
    );
  }

  const excluded = [
    "preference",
    "interest",
    "drink",
    "place",
    "travel",
    "sport",
    "pet",
  ];
  for (const type of excluded) {
    assert.equal(
      buildPreferenceInsight({
        memories: [record(type, type, `Wartość ${type}`)],
      }),
      null,
    );
  }
});

test("both legacy engines preserve source-order first-match selection", () => {
  const memories = [
    record("first-memory", "story", "Pierwsze", {
      createdAt: null,
      occurredOn: null,
    }),
    record("newer-memory", "memory", "Nowsze", {
      createdAt: "2030-01-01T00:00:00.000Z",
      occurredOn: "2030-01-01",
    }),
    record("first-preference", "coffee", "Flat White", {
      createdAt: null,
    }),
    record("newer-preference", "hobby", "Fotografia", {
      createdAt: "2030-01-01T00:00:00.000Z",
    }),
  ];

  assert.equal(buildMemoryInsight({ memories })?.id, "memory-first-memory");
  assert.equal(
    buildPreferenceInsight({ memories })?.id,
    "preference-first-preference",
  );
});

test("empty fields are skipped without semantic title or content fallback", () => {
  const memories = [
    record("empty-title", "memory", "Wartość", { title: "   " }),
    record("empty-value", "story", "   ", { content: "Treść" }),
    record("valid-note", "note", "Treść notatki", { title: "Notatka" }),
  ];
  const preferences = [
    record("empty-preference-title", "coffee", "Flat White", { title: "" }),
    record("empty-preference-value", "hobby", null, {
      content: "Fotografia",
    }),
  ];

  assert.equal(buildMemoryInsight({ memories })?.id, "memory-valid-note");
  assert.equal(buildPreferenceInsight({ memories: preferences }), null);
});

test("inactive, journal, unknown and non-exact raw types stay excluded", () => {
  const excluded = [
    record("inactive-memory", "memory", "Ukryte", { isActive: false }),
    record("journal", "journal", "Prywatne"),
    record("unknown", "custom_type", "Nieznane"),
    record("uppercase", "MEMORY", "Nieznormalizowane"),
    record("spaced", " memory ", "Ze spacjami"),
    record("missing", null, "Brak typu"),
  ];

  assert.equal(buildMemoryInsight({ memories: excluded }), null);
  assert.equal(
    buildPreferenceInsight({
      memories: [
        record("inactive-coffee", "coffee", "Latte", { isActive: false }),
        record("journal", "journal", "Prywatne"),
        record("unknown", "custom_type", "Nieznane"),
        record("uppercase", "COFFEE", "Nieznormalizowane"),
      ],
    }),
    null,
  );
});

test("buildInsights preserves no-people fallback IDs, priorities and order", () => {
  const insights = buildInsights({
    people: [],
    events: [],
    memories: [
      record("memory-source", "memory", "Wyjazd", {
        title: "Wspomnienie",
      }),
      record("preference-source", "coffee", "Flat White", {
        title: "Kawa",
      }),
    ],
    currentDate: new Date(2026, 6, 13, 12),
  });

  assert.deepEqual(insights, [
    {
      id: "memory-memory-source",
      type: "memory",
      priority: 100,
      icon: "💭",
      title: "Pamiętam",
      description: "Wspomnienie: Wyjazd",
    },
    {
      id: "preference-preference-source",
      type: "preference",
      priority: 50,
      icon: "⭐",
      title: "Preferencje",
      description: "Kawa: Flat White",
    },
  ]);
});

test("legacy fallback remains deterministic and input-immutable", () => {
  const input = {
    people: [],
    events: [],
    memories: [
      record("note", "note", "Notatka"),
      record("coffee", "coffee", "Flat White"),
    ],
    currentDate: new Date(2026, 6, 13, 12),
  };
  const snapshot = structuredClone(input);

  assert.deepEqual(buildInsights(input), buildInsights(input));
  assert.deepEqual(input, snapshot);
});

test("legacy engines delegate classification without reversing dependencies", async () => {
  const memoryUrl = new URL(
    "../src/lib/brain/engines/memoryEngine.ts",
    import.meta.url,
  );
  const preferenceUrl = new URL(
    "../src/lib/brain/engines/preferenceEngine.ts",
    import.meta.url,
  );
  const buildInsightsUrl = new URL(
    "../src/lib/brain/buildInsights.ts",
    import.meta.url,
  );
  const semanticDirectory = new URL(
    "../src/lib/semantic-memory/",
    import.meta.url,
  );
  const [memorySource, preferenceSource, buildInsightsSource, semanticFiles] =
    await Promise.all([
      readFile(memoryUrl, "utf8"),
      readFile(preferenceUrl, "utf8"),
      readFile(buildInsightsUrl, "utf8"),
      readdir(semanticDirectory),
    ]);
  const semanticSources = await Promise.all(
    semanticFiles
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFile(new URL(name, semanticDirectory), "utf8")),
  );

  for (const source of [memorySource, preferenceSource]) {
    assert.match(source, /selectBrainLegacyFallbackSource/);
    assert.equal(source.includes("consumerStoredType"), false);
  }
  assert.equal(memorySource.includes("MEMORY_TYPES"), false);
  assert.equal(preferenceSource.includes("PREFERENCE_TYPES"), false);
  assert.match(buildInsightsSource, /if \(people\.length > 0\)/);
  assert.match(buildInsightsSource, /buildMemoryInsight\(\{ memories \}\)/);
  assert.match(buildInsightsSource, /buildPreferenceInsight\(\{ memories \}\)/);
  assert.equal(
    semanticSources.some((source) =>
      /from\s+["'][^"']*(?:\/brain\/|\/brain["'])/.test(source)
    ),
    false,
  );
});
