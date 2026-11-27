import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const parserRequire = createRequire(require.resolve("date-holidays-parser"));
const merge = parserRequire("deepmerge");
const malicious = () => JSON.parse('{"__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}},"prototype":{"isAdmin":true}}');
function safe(object) {
  assert.equal(Object.getPrototypeOf(object), Object.prototype);
  assert.equal(object.isAdmin, undefined);
  for (const key of ["__proto__", "constructor", "prototype"]) assert.equal(Object.hasOwn(object, key), false);
  assert.equal(Object.prototype.isAdmin, undefined);
}
test("calendar parser resolves to the reviewed local security fork", () => {
  const meta = parserRequire("deepmerge/package.json");
  assert.equal(meta.name, "@happydate/safe-deepmerge");
  assert.equal(meta.version, "4.3.1-happydate.1");
  assert.equal(merge, require("../vendor/safe-deepmerge/index.cjs"));
});
test("GHSA null-prototype and null/primitive placeholder payloads cannot poison results", () => {
  safe(merge(Object.create(null), malicious()));
  for (const placeholder of [null, undefined, 0, false, ""]) {
    safe(merge({ session: placeholder }, { session: malicious() }).session);
  }
});
test("malicious target keys and recursive arrays are filtered before assignment", () => {
  safe(merge(malicious(), {}));
  safe(merge({}, malicious()));
  safe(merge.all([{}, { nested: [malicious()] }]).nested[0]);
  let accessed = false;
  const target = {};
  Object.defineProperty(target, "__proto__", { enumerable: true, get() { accessed = true; throw new Error("forbidden getter"); } });
  safe(merge(target, {}));
  assert.equal(accessed, false);
});
test("throwing membership traps fail closed and ordinary .all behavior remains compatible", () => {
  const proxy = new Proxy({}, { has() { throw new Error("membership denied"); } });
  assert.deepEqual(merge(proxy, { untrusted: true }), {});
  const left = { name: { en: "Holiday" }, regions: ["A"], config: { enabled: true } };
  const right = { name: { uk: "Свято" }, regions: ["B"], config: { enabled: false } };
  assert.deepEqual(merge.all([{}, left, right]), { name: { en: "Holiday", uk: "Свято" }, regions: ["A", "B"], config: { enabled: false } });
  assert.deepEqual(left.regions, ["A"]);
  const symbol = Symbol("calendar");
  assert.equal(merge({}, { [symbol]: "value" })[symbol], "value");
  assert.deepEqual(merge.all([[1], [2]], { arrayMerge: (_target, source) => source }), [2]);
});
