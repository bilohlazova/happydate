// Owner-scoped symbol drafts (synthetic ids; jsdom localStorage only, never a real browser profile).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mocks = path.join(root, "tests/helpers/chat-harness/mocks");
const channels = new Set();
class TestMessageChannel extends MessageChannel { constructor() { super(); channels.add(this); } }
after(() => { for (const c of channels) { c.port1.close(); c.port2.close(); } channels.clear(); });
const PNG_A = "data:image/png;base64,QUFBQV9QUklWQVRFX0RSQVdJTkc="; // synthetic "AAAA_PRIVATE_DRAWING"

const entry = `
  import React, { act } from 'react';
  import { createRoot } from 'react-dom/client';
  import { PersonSymbolSection } from '@/components/people/PersonSymbolSection';
  const app = createRoot(document.getElementById('root'));
  globalThis.__act = act;
  globalThis.__mount = (personId) => app.render(<PersonSymbolSection personId={personId} personName="Synthetic" symbol={null} />);
  globalThis.__unmount = () => app.unmount();
`;
const synthetic = {
  auth: `export const useAuth=()=>({user:globalThis.__user?{id:globalThis.__user}:null,loading:false});`,
  supabase: `export const supabase={auth:{getUser:async()=>({data:{user:{id:'user-A'}}})}};`,
  repo: `export async function deletePersonSymbol(){} export async function savePersonSymbol(){} export async function updatePersonSymbolInterpretation(){} export async function updatePersonSymbolMeaning(){}`,
  memory: `export const gentleSymbolInterpretation=()=>'';`,
  lucide: `const I=()=>null; export const ImagePlus=I,Palette=I,Pencil=I,Sparkles=I,Trash2=I,Upload=I,X=I;`,
  image: `export default function Image(){return null;}`,
};
const bundle = (await build({
  stdin: { contents: entry, resolveDir: root, loader: "jsx" }, bundle: true, write: false, format: "iife",
  platform: "browser", jsx: "automatic", logLevel: "silent", absWorkingDir: root,
  define: { "process.env.NODE_ENV": '"test"' },
  alias: { "@": path.join(root, "src"), "next-intl": path.join(mocks, "next-intl.js") },
  plugins: [{ name: "syn", setup(b) {
    const map = [[/supabaseClient(\.ts)?$/, "supabase"], [/components\/AuthProvider(\.tsx)?$/, "auth"], [/personSymbolRepository(\.ts)?$/, "repo"], [/memory-engine(\.ts|\/index\.ts)?$/, "memory"], [/^lucide-react$/, "lucide"], [/^next\/image$/, "image"]];
    for (const [filter, name] of map) b.onResolve({ filter }, () => ({ path: name, namespace: "syn" }));
    b.onLoad({ filter: /.*/, namespace: "syn" }, ({ path: p }) => ({ contents: synthetic[p], loader: "js" }));
  } }],
})).outputFiles[0].text;

async function session(dom, personId, userId = "user-A") {
  const w = dom.window; w.__user = userId;
  Object.assign(w, { MessageChannel: TestMessageChannel });
  w.IS_REACT_ACT_ENVIRONMENT = true;
  const images = [];
  w.Image = class { set src(v) { images.push(v); } };
  const ctx = new Proxy({}, { get: () => () => undefined, set: () => true });
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.HTMLCanvasElement.prototype.setPointerCapture = () => undefined;
  w.HTMLCanvasElement.prototype.toDataURL = () => w.__nextPng;
  w.eval(bundle);
  await w.__act(async () => w.__mount(personId));
  return { w, images };
}
async function openDraw(h) {
  const { w } = h;
  // Menu is closed by default: open it, then pick "draw".
  await w.__act(async () => { [...w.document.querySelectorAll("button")].find((b) => /Додати наш символ|Add our symbol/.test(b.textContent))?.click(); });
  await w.__act(async () => { [...w.document.querySelectorAll("button")].find((b) => /Намалювати самостійно|Draw it yourself/.test(b.textContent))?.click(); });
  return w.document.querySelector("canvas");
}
const dom = (url = "https://synthetic.test/") => new JSDOM('<!doctype html><div id="root"></div>', { runScripts: "outside-only", url });
const drafts = (d) => Object.keys(d.window.localStorage).filter((k) => k.startsWith("happydate:symbol-draft:"));
async function stroke(h, png, { release = true } = {}) {
  const { w } = h; w.__nextPng = png;
  const canvas = await openDraw(h);
  const ev = (type) => new w.MouseEvent(type, { bubbles: true, clientX: 5, clientY: 5 });
  await w.__act(async () => { canvas.dispatchEvent(ev("pointerdown")); canvas.dispatchEvent(ev("pointermove")); });
  const midStroke = Object.keys(w.localStorage).length;
  if (release) await w.__act(async () => canvas.dispatchEvent(ev("pointerup")));
  return midStroke;
}

test("draft key is bound to the owner and is written once per stroke, not on every move", async () => {
  const d = dom(); const h = await session(d, "person-A-1", "user-A");
  const mid = await stroke(h, PNG_A);
  assert.equal(mid, 0, "nothing written while the pointer is moving");
  assert.deepEqual(drafts(d), ["happydate:symbol-draft:v2:user-A:person-A-1"]);
  assert.equal(d.window.localStorage.getItem(drafts(d)[0]), PNG_A);
  d.window.close();
});

test("draft value is the PNG data URL and survives unmount for the SAME owner (restores on remount)", async () => {
  const d = dom(); const a = await session(d, "person-A-1", "user-A");
  await stroke(a, PNG_A); await a.w.__act(async () => a.w.__unmount());
  assert.match(d.window.localStorage.getItem("happydate:symbol-draft:v2:user-A:person-A-1"), /^data:image\/png;base64,/);
  d.window.close();
});

test("another owner opening their OWN person gets no draft", async () => {
  const d = dom(); const a = await session(d, "person-A-1", "user-A");
  await stroke(a, PNG_A); await a.w.__act(async () => a.w.__unmount());
  const b = await session(d, "person-B-1", "user-B"); await openDraw(b);
  assert.deepEqual(b.images, []);
  d.window.close();
});

test("another owner with a colliding personId never restores the previous owner's PNG", async () => {
  const d = dom(); const a = await session(d, "person-COLLIDE", "user-A");
  await stroke(a, PNG_A); await a.w.__act(async () => a.w.__unmount());
  const b = await session(d, "person-COLLIDE", "user-B"); await openDraw(b);
  assert.deepEqual(b.images, []);
  d.window.close();
});

test("same owner still gets their own draft back", async () => {
  const d = dom(); const a = await session(d, "person-A-1", "user-A");
  await stroke(a, PNG_A); await a.w.__act(async () => a.w.__unmount());
  const again = await session(d, "person-A-1", "user-A"); await openDraw(again);
  assert.deepEqual(again.images, [PNG_A]);
  d.window.close();
});

test("without a signed-in owner nothing is read or written", async () => {
  const d = dom(); const h = await session(d, "person-A-1", null);
  await stroke(h, PNG_A);
  assert.deepEqual(drafts(d), []);
  d.window.close();
});

test("legacy ownerless keys are dropped, never adopted", async () => {
  const d = dom(); d.window.localStorage.setItem("happydate:symbol-draft:person-A-1", PNG_A);
  d.window.localStorage.setItem("happydate_calendar_country", "PL");
  const h = await session(d, "person-A-1", "user-A"); await openDraw(h);
  assert.deepEqual(h.images, []);
  assert.deepEqual(drafts(d), []);
  assert.equal(d.window.localStorage.getItem("happydate_calendar_country"), "PL", "unrelated keys are untouched");
  d.window.close();
});

// Logout / account switch purge through the real boundary + real AuthProvider.
import { profileHarness } from "./helpers/profile-snapshot-harness.mjs";
async function withBoundary(fn) { const h = await profileHarness(); try { await fn(h); } finally { await h.dispose(); } }
const KEY_A = "happydate:symbol-draft:v2:A:p1";
const KEY_B = "happydate:symbol-draft:v2:B:p9";
const LEGACY = "happydate:symbol-draft:legacy-p";
const seed = (h) => { h.w.localStorage.setItem(KEY_A, PNG_A); h.w.localStorage.setItem(KEY_B, PNG_A); h.w.localStorage.setItem(LEGACY, PNG_A); h.w.localStorage.setItem("happydate_calendar_country", "PL"); };
const left = (h) => Object.keys(h.w.localStorage).sort();

test("A logout removes A's drafts and legacy ownerless drafts, keeps B's draft and unrelated keys", () => withBoundary(async (h) => {
  seed(h); await h.auth(null, "SIGNED_OUT");
  assert.deepEqual(left(h), [KEY_B, "happydate_calendar_country"].sort());
}));
test("A -> B removes A's drafts only; B -> A then removes B's drafts only", () => withBoundary(async (h) => {
  seed(h); await h.auth("B");
  assert.deepEqual(left(h), [KEY_B, "happydate_calendar_country"].sort());
  h.w.localStorage.setItem(KEY_A, PNG_A);
  await h.auth("A");
  assert.deepEqual(left(h), [KEY_A, "happydate_calendar_country"].sort(), "B's draft removed, A's fresh draft untouched");
}));
test("same-user TOKEN_REFRESHED keeps every draft", () => withBoundary(async (h) => {
  seed(h); await h.auth("A", "TOKEN_REFRESHED");
  assert.equal(left(h).length, 4);
}));
test("BFCache hide/restore for the same owner keeps that owner's draft (no logout happened)", () => withBoundary(async (h) => {
  seed(h); h.holdAuth(); await h.transition("pagehide"); await h.transition("pageshow"); await h.verify(0, "A");
  assert.equal(left(h).length, 4);
}));
test("route change keeps the owner's draft", () => withBoundary(async (h) => {
  seed(h); await h.route("person-2");
  assert.equal(left(h).length, 4);
}));
test("login of a different account after logout never reads the previous account's draft key", () => withBoundary(async (h) => {
  seed(h); await h.auth(null, "SIGNED_OUT"); await h.auth("B");
  assert.ok(!left(h).includes(KEY_A));
}));
