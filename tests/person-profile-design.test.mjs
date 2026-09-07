import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("person profile uses a navigable five-page digital album", async () => {
  const source = await readFile(new URL("../src/components/people/PersonProfileContent.tsx", import.meta.url), "utf8");
  assert.match(source, /className={`person-profile-page/);
  assert.match(source, /href="\/people" className="person-profile-back"/);
  assert.match(source, /onEdit=\{\(\) => setPersonActionsMode\("edit"\)\}/);
  assert.match(source, /onDelete=\{\(\) => setPersonActionsMode\("delete"\)\}/);
  assert.match(source, /<PersonActionsSheet/);
  assert.match(source, /router\.replace\("\/people"\)/);
  assert.match(source, /const views = \["profile", "about", "notes", "gifts", "history"\]/);
  assert.match(source, /<AlbumNavigation/);
  assert.match(source, /activeView === "profile"/);
  assert.match(source, /activeView === "about"/);
  assert.match(source, /activeView === "notes"/);
  assert.match(source, /activeView === "gifts"/);
  assert.match(source, /activeView === "history"/);
  assert.match(source, /onTouchStart/);
  assert.match(source, /event\.key === "ArrowRight"/);
  assert.match(source, /params\.set\("view", next\)/);
  assert.match(source, /className="person-timeline-card"/);
});
