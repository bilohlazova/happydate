// Evidence about the REAL installed @supabase/auth-js (no mocks): what a page restored from BFCache
// learns after another document of the same browser signed out. Characterizes a dependency behaviour
// that AuthProvider relies on; if auth-js starts emitting SIGNED_OUT here, this test documents the change.
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

test("auth-js emits NO auth event when storage lost the session while the page was frozen", async () => {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "https://happydate.test/", pretendToBeVisual: true });
  const w = dom.window;
  Object.assign(globalThis, { window: w, document: w.document });
  Object.defineProperty(globalThis, "localStorage", { value: w.localStorage, configurable: true });
  Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true });
  const { GoTrueClient } = await import("@supabase/auth-js");
  const key = "sb-test-auth-token";
  const user = { id: "A", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  w.localStorage.setItem(key, JSON.stringify({ access_token: "a", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }));
  const client = new GoTrueClient({ url: "https://x.test/auth/v1", storageKey: key, storage: w.localStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false });
  const events = [];
  client.onAuthStateChange((event) => { events.push(event); });
  await client.initialize();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const { data: before } = await client.getSession();
  assert.equal(before.session?.user.id, "A", "control: the client starts with A's session");
  events.length = 0;

  // Another document of the same browser signs out: it clears the shared storage. This frozen page gets no storage event.
  w.localStorage.removeItem(key);
  // BFCache restore: the document becomes visible again.
  w.document.dispatchEvent(new w.Event("visibilitychange"));
  w.dispatchEvent(new w.PageTransitionEvent("pageshow", { persisted: true }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.deepEqual(events, [], "no SIGNED_OUT event is delivered, so AuthProvider keeps the old user");
  const { data: after } = await client.getSession();
  assert.equal(after.session, null, "storage really has no session any more");
  await client.dispose();
  w.close();
});
