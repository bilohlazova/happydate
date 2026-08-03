import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveSupabasePublicConfig } from "../src/lib/supabase/publicConfig.ts";

test("Supabase public config prefers publishable key and trims values", () => {
  assert.deepEqual(resolveSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " publishable ",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: " legacy ",
  }), { url: "https://example.supabase.co", key: "publishable" });
});

test("Supabase public config supports the legacy anon fallback", () => {
  assert.deepEqual(resolveSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy",
  }), { url: "https://example.supabase.co", key: "legacy" });
  assert.equal(resolveSupabasePublicConfig({}), null);
  assert.equal(resolveSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  }), null);
});

test("client and server public-key consumers use the canonical resolver", async () => {
  const paths = [
    "src/lib/supabaseClient.ts",
    "src/components/SupabaseProvider.tsx",
    "src/lib/assistant/chatIdentity.ts",
    "src/lib/gifts/giftApiSecurity.ts",
    "src/lib/happy-learning/happyLearningAccess.server.ts",
    "src/app/api/good-deed/route.ts",
    "src/middleware.disabled.ts",
  ];
  for (const path of paths) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /process\.env\.NEXT_PUBLIC_SUPABASE_(?:ANON|PUBLISHABLE)_KEY/, path);
  }
});

test("Notes maps canonical People relation columns into its compatibility DTO", async () => {
  const source = await readFile(
    new URL("../src/lib/repositories/memoryRepository.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /select\("id, name, relationship, relation_label"\)/);
  assert.match(source, /relation: person\.relation_label \?\? person\.relationship \?\? null/);
  assert.doesNotMatch(source, /select\("id, name, relation"\)/);
});

test("Profile uses profiles.points as the single confirmed points source", async () => {
  const source = await readFile(
    new URL("../src/app/(app)/profile/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /select\("full_name, avatar_url, points"\)/);
  assert.match(source, /setPoints\(profile\.points \?\? 0\)/);
  assert.doesNotMatch(source, /points_balance|\.balance/);
});
