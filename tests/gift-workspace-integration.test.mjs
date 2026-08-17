import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Gift Workspace reads through one loader and passes a ViewModel to React", async () => {
  const [page, content, panel] = await Promise.all([
    source("src/app/gift/start/page.tsx"),
    source("src/app/gift/start/StartPageContent.tsx"),
    source("src/app/gift/start/GiftWorkspacePanel.tsx"),
  ]);
  assert.equal((page.match(/loadGiftWorkspace\(\)/g) ?? []).length, 1);
  assert.match(page, /GiftWorkspaceViewModel/);
  assert.match(content, /workspace: GiftWorkspaceViewModel/);
  assert.match(panel, /GiftWorkspaceViewModel/);
  for (const forbidden of ["gift.repository", ".from(", "supabase"]) {
    assert.equal(page.includes(forbidden), false, `page: ${forbidden}`);
    assert.equal(content.includes(forbidden), false, `content: ${forbidden}`);
    assert.equal(panel.includes(forbidden), false, `panel: ${forbidden}`);
  }
});

test("existing gift CTA routes to the compatible Gift Workspace", async () => {
  const [people, card] = await Promise.all([
    source("src/components/people/PeoplePageContent.tsx"),
    source("src/components/people/HappyRecommendationCard.tsx"),
  ]);
  assert.match(people, /href: `\/gift\/start\?personId=/);
  assert.match(card, /<Link/);
  assert.match(card, /recommendation\.href/);
});

test("retired concierge write is absent from React", async () => {
  const content = await source("src/app/gift/start/StartPageContent.tsx");
  assert.doesNotMatch(content, /giftRequestCompatibility|gift_requests|notify-gift/);
});
