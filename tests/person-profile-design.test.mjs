import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("person profile prioritizes Happy insight and relationship timeline", async () => {
  const source = await readFile(new URL("../src/components/people/PersonProfileContent.tsx", import.meta.url), "utf8");
  const layoutStart = source.indexOf('<div className="person-profile-columns');
  const layoutEnd = source.indexOf("<ChatAssistantModal", layoutStart);
  const layout = source.slice(layoutStart, layoutEnd);

  assert.match(source, /className={`person-profile-page/);
  assert.match(source, /href="\/people" className="person-profile-back"/);
  assert.ok(layout.indexOf("<BrainSection") < layout.indexOf("<TimelineSection"));
  assert.ok(layout.indexOf("<TimelineSection") < layout.indexOf("<PersonGiftManager"));
  assert.ok(layout.indexOf("<PersonGiftManager") < layout.indexOf("<KnowledgeSection"));
  assert.match(source, /className="person-timeline-card"/);
});
