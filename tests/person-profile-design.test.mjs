import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("person profile progressively reveals personal context before gifts and timeline", async () => {
  const source = await readFile(new URL("../src/components/people/PersonProfileContent.tsx", import.meta.url), "utf8");
  const layoutStart = source.indexOf('<div className="person-profile-flow');
  const layoutEnd = source.indexOf("<ChatAssistantModal", layoutStart);
  const layout = source.slice(layoutStart, layoutEnd);

  assert.match(source, /className={`person-profile-page/);
  assert.match(source, /href="\/people" className="person-profile-back"/);
  assert.ok(layout.indexOf("<BrainSection") < layout.indexOf("<PetsSection"));
  assert.ok(layout.indexOf("<PetsSection") < layout.indexOf("<KnowledgeSection"));
  assert.ok(layout.indexOf("<KnowledgeSection") < layout.indexOf("<PersonGiftManager"));
  assert.ok(layout.indexOf("<PersonGiftManager") < layout.indexOf("<TimelineSection"));
  assert.doesNotMatch(layout, /GiftLearningAuditSection/);
  assert.match(source, /className="person-timeline-card"/);
});
