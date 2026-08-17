import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("reviews presents only real moderated voices without invented ratings", async () => {
  const client = await readFile(
    path.join(root, "src/app/reviews/ReviewsClient.tsx"),
    "utf8",
  );

  assert.match(client, /reviews-soul__promise/);
  assert.match(client, /\.eq\("published", true\)/);
  assert.doesNotMatch(client, /★★★★★|starRating|fakeReview/);
  assert.match(client, /role="dialog" aria-modal="true"/);
  assert.match(client, /emailPrivacy/);
  assert.match(client, /listError/);
});

test("honest review guidance is localized for every supported locale", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(
      await readFile(path.join(root, `messages/${locale}/static.json`), "utf8"),
    ).reviews;

    assert.ok(messages.promiseTitle);
    assert.ok(messages.emptyTitle);
    assert.ok(messages.emailPrivacy);
    assert.ok(messages.messageHelp);
  }
});
