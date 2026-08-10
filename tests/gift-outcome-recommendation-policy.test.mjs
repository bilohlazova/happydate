import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyGiftOutcomeRecommendationPolicy,
} from "../src/lib/gift-intelligence/giftOutcomeRecommendationPolicy.ts";
import { classifyGiftFeedbackCategory } from "../src/lib/gift-intelligence/giftFeedbackCategory.ts";

function suggestion(title, category = "other") {
  return {
    title,
    category,
    why: "Reason",
    confidence: "medium",
    estimatedPrice: null,
    currency: null,
    personalizationSignals: [],
    cautions: [],
  };
}

function evidence(giftId, giftTitle, outcome, note = null) {
  return { giftId, giftTitle, outcome, note, confirmedAt: "2026-08-08T12:00:00Z" };
}

test("explicit positive and negative outcomes deterministically rank matching ideas", () => {
  const result = applyGiftOutcomeRecommendationPolicy(
    [suggestion("Coffee subscription", "subscription"), suggestion("Flower subscription", "flowers"), suggestion("Book")],
    [evidence("liked", "Coffee set", "liked", "Coffee was a success"), evidence("no", "Flower bouquet", "not_liked")],
    true,
  );
  assert.deepEqual(result.map((item) => item.title), ["Coffee subscription", "Book", "Flower subscription"]);
  assert.deepEqual(result[0].learningEvidence?.map((item) => item.giftId), ["liked"]);
  assert.deepEqual(result[2].learningEvidence?.map((item) => item.giftId), ["no"]);
});

test("unsure is transparent but neutral and disabling learning removes all influence", () => {
  const ideas = [suggestion("Camera bag"), suggestion("Book")];
  const history = [evidence("unsure", "Camera", "unsure", "No clear reaction")];
  const neutral = applyGiftOutcomeRecommendationPolicy(ideas, history, true);
  assert.deepEqual(neutral.map((item) => item.title), ["Camera bag", "Book"]);
  assert.equal(neutral[0].learningEvidence?.[0].note, "No clear reaction");
  const disabled = applyGiftOutcomeRecommendationPolicy(ideas, history, false);
  assert.deepEqual(disabled.map((item) => item.title), ["Camera bag", "Book"]);
  assert.equal(disabled.some((item) => item.learningEvidence), false);
});

test("multilingual category classifier is deterministic and fails closed on conflicts", () => {
  assert.equal(classifyGiftFeedbackCategory("Букет квітів"), "flowers");
  assert.equal(classifyGiftFeedbackCategory("Subskrypcja kawy"), "subscription");
  assert.equal(classifyGiftFeedbackCategory("Massage Erlebnis"), "experience");
  assert.equal(classifyGiftFeedbackCategory("Книга та парфуми"), "other");
  assert.equal(classifyGiftFeedbackCategory("A meaningful surprise"), "other");
});

test("category-only similarity is weaker, explicit and never uses other", () => {
  const result = applyGiftOutcomeRecommendationPolicy(
    [suggestion("Rose delivery", "flowers"), suggestion("Museum membership", "subscription"), suggestion("Book")],
    [
      evidence("flowers-1", "Tulip bouquet", "not_liked"),
      evidence("flowers-2", "Rose bouquet", "not_liked"),
      evidence("unknown", "Meaningful surprise", "liked"),
    ],
    true,
  );
  assert.deepEqual(result.map((item) => item.title), ["Museum membership", "Book", "Rose delivery"]);
  assert.equal(result[2].learningEvidence?.[0].matchedBy, "category");
  assert.equal(result[2].learningEvidence?.[0].category, "flowers");
  assert.equal(result.some((item) => item.learningEvidence?.some((entry) => entry.giftId === "unknown")), false);
});

test("one category outcome never becomes a stable preference or avoidance", () => {
  const result = applyGiftOutcomeRecommendationPolicy(
    [suggestion("Rose delivery", "flowers"), suggestion("Book")],
    [evidence("one", "Tulip bouquet", "not_liked")],
    true,
  );
  assert.deepEqual(result.map((item) => item.title), ["Rose delivery", "Book"]);
  assert.equal(result[0].learningEvidence, undefined);
});

test("conflicting category outcomes suppress generalization even after repetition", () => {
  const result = applyGiftOutcomeRecommendationPolicy(
    [suggestion("Rose delivery", "flowers"), suggestion("Book")],
    [
      evidence("yes-1", "Tulip bouquet", "liked"),
      evidence("yes-2", "Lily bouquet", "liked"),
      evidence("no", "Peony bouquet", "not_liked"),
    ],
    true,
  );
  assert.deepEqual(result.map((item) => item.title), ["Rose delivery", "Book"]);
  assert.equal(result[0].learningEvidence, undefined);
});

test("outcome learning consent is owner-controlled and invalidates stale recommendation cache", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20260808165317_add_gift_outcome_learning_preference.sql", import.meta.url),
    "utf8",
  );
  const route = await readFile(new URL("../src/app/api/ai/gift-suggestions/route.ts", import.meta.url), "utf8");
  const profile = await readFile(new URL("../src/app/(app)/profile/page.tsx", import.meta.url), "utf8");
  assert.match(migration, /gift_outcome_learning_enabled boolean not null default true/i);
  assert.match(migration, /grant update[\s\S]*gift_outcome_learning_enabled[\s\S]*to authenticated/i);
  assert.match(migration, /person\.user_id = new\.id/i);
  assert.match(migration, /recipient_reaction is distinct from new\.recipient_reaction/i);
  assert.match(route, /applyGiftOutcomeRecommendationPolicy/);
  assert.match(route, /usesOutcomeLearning/);
  assert.match(profile, /role="switch"/);
});
