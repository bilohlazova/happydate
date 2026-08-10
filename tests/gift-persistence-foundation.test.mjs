import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("gift lifecycle and saved links have separate canonical tables", async () => {
  const migration = await source(
    "supabase/migrations/20260808094421_create_gift_lifecycle_and_saved_links.sql",
  );
  assert.match(migration, /create table public\.gifts/);
  assert.match(migration, /create table public\.gift_links/);
  assert.match(migration, /'idea', 'selected', 'purchased', 'given'/);
  assert.match(migration, /lifecycle <> 'given' or occurred_on is not null/);
  assert.match(migration, /foreign key \(gift_id, user_id, person_id\)/);
});

test("new gift tables are explicitly protected and exposed only to authenticated users", async () => {
  const migration = await source(
    "supabase/migrations/20260808094421_create_gift_lifecycle_and_saved_links.sql",
  );
  for (const table of ["gifts", "gift_links"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
    assert.match(migration, new RegExp(`grant select, insert, update, delete on table public\\.${table} to authenticated`));
  }
  assert.equal((migration.match(/\(select auth\.uid\(\)\) = user_id/g) ?? []).length >= 8, true);
});

test("saved external references accept only HTTPS and remain user-owned", async () => {
  const [migration, persistence] = await Promise.all([
    source("supabase/migrations/20260808094421_create_gift_lifecycle_and_saved_links.sql"),
    source("src/lib/gifts/gift.persistence.ts"),
  ]);
  assert.match(migration, /lower\(url\) ~ '\^https:\/\//);
  assert.match(persistence, /parsed\.protocol !== "https:"/);
  assert.match(persistence, /\.eq\("user_id", userId\)/);
  assert.match(persistence, /metadata is untrusted|untrusted user data/i);
});

test("Gift Repository combines canonical gifts with the legacy read bridge", async () => {
  const repository = await source("src/lib/gifts/gift.repository.ts");
  assert.match(repository, /listCanonicalGifts/);
  assert.match(repository, /listKnowledge/);
  assert.match(repository, /createCanonicalGift as createGift/);
  assert.match(repository, /setCanonicalGiftLifecycle as setGiftLifecycle/);
  assert.match(repository, /saveGiftLink/);
});

test("active Gift creation is idempotent across concurrent clients", async () => {
  const [migration, persistence] = await Promise.all([
    source("supabase/migrations/20260808155759_prevent_duplicate_active_gifts.sql"),
    source("src/lib/gifts/gift.persistence.ts"),
  ]);
  assert.match(migration, /generated always as/i);
  assert.match(migration, /create unique index gifts_active_identity_uidx/i);
  assert.match(migration, /nulls not distinct/i);
  assert.match(migration, /where lifecycle <> 'given'/i);
  assert.match(migration, /having count\(\*\) > 1/i);
  assert.match(persistence, /error\?\.code === "23505"/);
  assert.match(persistence, /findEquivalentActiveGift/);
  assert.match(persistence, /\.eq\("normalized_title"/);
  assert.match(persistence, /if \(existing\) return existing/);
});

test("Gift shortlists keep one RLS-bound preferred option with an optional reason", async () => {
  const [migration, persistence] = await Promise.all([
    source("supabase/migrations/20260808162319_add_gift_link_shortlist_decisions.sql"),
    source("src/lib/gifts/gift.persistence.ts"),
  ]);
  assert.match(migration, /add column is_preferred boolean not null default false/i);
  assert.match(migration, /gift_links_one_preferred_per_gift_uidx/i);
  assert.match(migration, /where gift_id is not null and is_preferred/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke all on function public\.ensure_single_preferred_gift_link\(\)/i);
  assert.match(migration, /char_length\(btrim\(decision_note\)\) between 1 and 500/i);
  assert.match(persistence, /setPreferredGiftLink/);
  assert.match(persistence, /\.update\(\{ is_preferred: preferred, decision_note: note \}\)/);
  assert.match(persistence, /result\.error\?\.code === "23505"/);
});

test("purchase lifecycle captures an immutable final Gift selection snapshot", async () => {
  const [migration, persistence, mapper] = await Promise.all([
    source("supabase/migrations/20260808162834_snapshot_final_gift_selection.sql"),
    source("src/lib/gifts/gift.persistence.ts"),
    source("src/lib/gifts/gift.mapper.ts"),
  ]);
  assert.match(migration, /new\.lifecycle in \('purchased', 'given'\)/i);
  assert.match(migration, /old\.selection_finalized_at is not null/i);
  assert.match(migration, /Final Gift selection history is immutable/i);
  assert.match(migration, /where link\.gift_id = old\.id[\s\S]*link\.is_preferred/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke all on function public\.snapshot_final_gift_selection\(\)/i);
  assert.match(migration, /where lifecycle in \('purchased', 'given'\) and selection_finalized_at is null/i);
  assert.match(persistence, /selection_finalized_at/);
  assert.match(persistence, /finalSelection: row\.selection_finalized_at/);
  assert.match(mapper, /finalSelection: gift\.finalSelection/);
});

test("Gift outcomes store only explicit post-given user confirmation", async () => {
  const [migration, persistence, people] = await Promise.all([
    source("supabase/migrations/20260808164644_add_confirmed_gift_outcomes.sql"),
    source("src/lib/gifts/gift.persistence.ts"),
    source("src/lib/people/buildPeopleViewModels.ts"),
  ]);
  assert.match(migration, /recipient_reaction in \('liked', 'not_liked', 'unsure'\)/i);
  assert.match(migration, /recipient_reaction_confirmed_at is not null and lifecycle = 'given'/i);
  assert.match(migration, /new\.recipient_reaction_confirmed_at := now\(\)/i);
  assert.match(migration, /Gift outcome can only be confirmed after the Gift is given/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke all on function public\.confirm_explicit_gift_outcome\(\)/i);
  assert.match(persistence, /setCanonicalGiftOutcome/);
  assert.match(persistence, /\.eq\("lifecycle", "given"\)/);
  assert.match(people, /confirmedGiftOutcomes/);
  assert.match(migration, /never inferred by AI/i);
});

test("one Gift outcome can be excluded from learning without deleting its history", async () => {
  const migration = await source("supabase/migrations/20260808171025_add_per_gift_outcome_learning_control.sql");
  const persistence = await source("src/lib/gifts/gift.persistence.ts");
  const giftAi = await source("src/lib/repositories/giftIntelligenceRepository.server.ts");
  const conversation = await source("src/lib/assistant/giftOutcomeContext.server.ts");
  assert.match(migration, /recipient_reaction_learning_enabled boolean not null default true/i);
  assert.match(migration, /recipient_reaction is not null or recipient_reaction_learning_enabled/i);
  assert.match(migration, /new\.recipient_reaction_learning_enabled := true/i);
  assert.match(migration, /recipient_reaction_learning_enabled is distinct from new\.recipient_reaction_learning_enabled/i);
  assert.match(persistence, /setCanonicalGiftOutcomeLearning/);
  assert.match(persistence, /\.eq\("user_id", userId\)/);
  assert.match(persistence, /\.not\("recipient_reaction", "is", null\)/);
  assert.match(giftAi, /\.eq\("recipient_reaction_learning_enabled", true\)/);
  assert.match(conversation, /\.eq\("recipient_reaction_learning_enabled", true\)/);
});

test("post-gift follow-up can be snoozed or dismissed without becoming feedback", async () => {
  const [migration, persistence, homeRepository, row] = await Promise.all([
    source("supabase/migrations/20260808185020_add_gift_outcome_follow_up_control.sql"),
    source("src/lib/gifts/gift.persistence.ts"),
    source("src/lib/repositories/home/home.repository.ts"),
    source("src/components/home-dashboard/HappyRecommendationRow.tsx"),
  ]);
  assert.match(migration, /recipient_reaction_follow_up_snoozed_until timestamptz/i);
  assert.match(migration, /recipient_reaction_follow_up_dismissed_at timestamptz/i);
  assert.match(migration, /gifts_pending_reaction_follow_up_idx/i);
  assert.match(migration, /where lifecycle = 'given'[\s\S]*recipient_reaction is null/i);
  assert.match(migration, /new\.recipient_reaction_follow_up_snoozed_until := null/i);
  assert.match(migration, /new\.recipient_reaction_follow_up_dismissed_at := null/i);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(persistence, /setCanonicalGiftOutcomeFollowUp/);
  assert.match(persistence, /3 \* 24 \* 60 \* 60 \* 1_000/);
  assert.match(persistence, /\.eq\("user_id", userId\)[\s\S]*\.eq\("lifecycle", "given"\)[\s\S]*\.is\("recipient_reaction", null\)/);
  assert.match(homeRepository, /recipient_reaction_follow_up_dismissed_at/);
  assert.match(homeRepository, /recipient_reaction_follow_up_snoozed_until\.lte/);
  assert.match(row, /changeFollowUp\("snooze"\)/);
  assert.match(row, /changeFollowUp\("dismiss"\)/);
  assert.doesNotMatch(persistence.match(/setCanonicalGiftOutcomeFollowUp[\s\S]*?^}/m)?.[0] ?? "", /recipient_reaction:/);
});

test("Home accepts only an explicit Gift outcome through the owner-scoped persistence path", async () => {
  const [page, dashboard, row, persistence] = await Promise.all([
    source("src/components/HomePageClient.tsx"),
    source("src/components/home-dashboard/HomeDashboard.tsx"),
    source("src/components/home-dashboard/HappyRecommendationRow.tsx"),
    source("src/lib/gifts/gift.persistence.ts"),
  ]);
  assert.match(page, /confirmPersonGiftOutcome\(giftId, outcome\)/);
  assert.match(page, /onGiftOutcome=\{giftOutcome\}/);
  assert.match(dashboard, /giftOutcomeLiked/);
  assert.match(row, /answer\("liked"\)/);
  assert.match(row, /answer\("not_liked"\)/);
  assert.match(row, /answer\("unsure"\)/);
  assert.match(row, /fieldset disabled=\{busy !== null\}/);
  assert.match(persistence, /setCanonicalGiftOutcome[\s\S]*?\.eq\("user_id", userId\)[\s\S]*?\.eq\("lifecycle", "given"\)/);
});

test("an accidental Home Gift outcome can be undone through the same ownership boundary", async () => {
  const [page, loaders, repository, persistence, migration] = await Promise.all([
    source("src/components/HomePageClient.tsx"),
    source("src/lib/gifts/gift.loaders.ts"),
    source("src/lib/gifts/gift.repository.ts"),
    source("src/lib/gifts/gift.persistence.ts"),
    source("supabase/migrations/20260808185020_add_gift_outcome_follow_up_control.sql"),
  ]);
  assert.match(page, /GIFT_OUTCOME_UNDO_WINDOW_MS = 8_000/);
  assert.match(page, /undoPersonGiftOutcome\(giftOutcomeConfirmation\.giftId\)/);
  assert.match(page, /giftOutcomeUndoError/);
  assert.match(loaders, /clearGiftOutcome\(await requiredUserId\(\), giftId\)/);
  assert.match(repository, /clearCanonicalGiftOutcome as clearGiftOutcome/);
  assert.match(persistence, /clearCanonicalGiftOutcome[\s\S]*?recipient_reaction: null[\s\S]*?\.eq\("user_id", userId\)[\s\S]*?\.eq\("lifecycle", "given"\)[\s\S]*?\.not\("recipient_reaction", "is", null\)/);
  assert.match(migration, /if new\.recipient_reaction is null then[\s\S]*?new\.recipient_reaction_confirmed_at := null[\s\S]*?new\.recipient_reaction_learning_enabled := true/i);
});

test("the optional Home outcome note preserves the already-confirmed reaction boundary", async () => {
  const [page, confirmation, loaders, persistence] = await Promise.all([
    source("src/components/HomePageClient.tsx"),
    source("src/components/home-dashboard/GiftOutcomeConfirmation.tsx"),
    source("src/lib/gifts/gift.loaders.ts"),
    source("src/lib/gifts/gift.persistence.ts"),
  ]);
  assert.match(page, /savePersonGiftOutcomeNote\(giftOutcomeConfirmation\.giftId, giftOutcomeConfirmation\.outcome, note\)/);
  assert.match(page, /startGiftOutcomeNote[\s\S]*?clearTimeout/);
  assert.match(confirmation, /maxLength=\{500\}/);
  assert.match(confirmation, /if \(!normalizedNote \|\| noteBusy\) return/);
  assert.match(confirmation, /labels\.skipNote/);
  assert.match(loaders, /setGiftOutcomeNote\(await requiredUserId\(\), giftId, outcome, note\)/);
  assert.match(persistence, /setCanonicalGiftOutcomeNote[\s\S]*?normalizedNote\.length > 500[\s\S]*?\.eq\("user_id", userId\)[\s\S]*?\.eq\("lifecycle", "given"\)[\s\S]*?\.eq\("recipient_reaction", outcome\)/);
});
