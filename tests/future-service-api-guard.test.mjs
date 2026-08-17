import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const routes = [
  new URL("../src/app/api/good-deed/route.ts", import.meta.url),
  new URL("../src/app/api/heaven-messages/route.ts", import.meta.url),
  new URL("../src/app/api/notify-gift/route.ts", import.meta.url),
  new URL("../src/app/api/replicate/webhook/route.ts", import.meta.url),
  new URL("../src/app/api/auto-release/route.ts", import.meta.url),
];

test("future service APIs fail closed with 410 and no-store", async () => {
  for (const route of routes) {
    const source = await readFile(route, "utf8");
    assert.match(source, /status: 410/);
    assert.match(source, /Cache-Control.*no-store/);
    assert.match(source, /service_not_available/);
  }
});

test("future service APIs cannot parse, upload, persist or email data", async () => {
  const source = (await Promise.all(routes.map(route => readFile(route, "utf8")))).join("\n");
  assert.doesNotMatch(source, /createClient|SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET|REPLICATE|req(?:uest)?\.formData\(|req(?:uest)?\.json\(|partner_holds|animations|\.insert\(|\.update\(|\.upload\(|Resend|emails\.send/);
});
