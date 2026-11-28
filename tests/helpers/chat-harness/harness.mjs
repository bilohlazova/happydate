// jsdom harness that mounts the REAL HappyBot components (ChatAssistantModal, AuthProvider,
// UserScopedChatAssistant, useChatOwnerReset) against a fake Supabase auth client and a fake
// /api/ai-chat. Only synthetic users are used. Variants:
//   patched  (default) - page wiring as in HomePageClient after the fix
//   original           - page wiring as on origin/main (bare modal, no reset); used to prove the defect
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
export const VARIANT = process.env.HARNESS_VARIANT === "original" ? "original" : "patched";

export const USERS = {
  A: { id: "user-A", name: "Тест-А", people: [
    { id: "person-A-mama", name: "Тест-Мама", relation: "mother", birthday: null, gender: "female" },
    { id: "person-A-friend", name: "Тест-Друг", relation: "friend", birthday: null, gender: "male" },
  ] },
  B: { id: "user-B", name: "Тест-Б", people: [
    { id: "person-B-sister", name: "Тест-Сестра", relation: "sister", birthday: null, gender: "female" },
  ] },
};

function entrySource(variant) {
  const wiring = variant === "patched"
    ? `import UserScopedChatAssistant from "@/components/assistant/UserScopedChatAssistant";
       import { useChatOwnerReset } from "@/hooks/useChatOwnerReset";
       const Chat = UserScopedChatAssistant;`
    : `import ChatAssistantModal from "@/components/ChatAssistantModal";
       const Chat = ChatAssistantModal;
       const useChatOwnerReset = () => {};`;
  return `
    import React, { useState, useCallback, act } from "react";
    import { createRoot } from "react-dom/client";
    import { AuthProvider } from "@/components/AuthProvider";
    ${wiring}
    function Page() {
      const [open, setOpen] = useState(false);
      const [scope, setScope] = useState({ type: "global" });
      const [gift, setGift] = useState(null);
      const [prompt, setPrompt] = useState(null);
      globalThis.__page = { setOpen, setScope, setGift, setPrompt };
      const reset = useCallback(() => { setOpen(false); setScope({ type: "global" }); setPrompt(null); setGift(null); }, []);
      useChatOwnerReset(reset);
      return <Chat open={open} onClose={() => setOpen(false)} scope={scope} giftRequest={gift}
        initialPrompt={prompt} autoSubmitInitialPrompt={Boolean(prompt)}
        onPersonMemoryUpdated={(id) => globalThis.__memoryUpdated && globalThis.__memoryUpdated(id)} />;
    }
    function LoginPage() { return <main>LOGIN-PAGE</main>; }
    globalThis.__act = act;
    globalThis.__mount = (el, kind) => { globalThis.__root = createRoot(el); act(() => globalThis.__root.render(kind === "login" ? <AuthProvider><LoginPage /></AuthProvider> : <AuthProvider><Page /></AuthProvider>)); };
    globalThis.__unmount = () => act(() => globalThis.__root.unmount());
  `;
}

const bundles = new Map();
async function bundleFor(variant) {
  if (bundles.has(variant)) return bundles.get(variant);
  const mocks = path.join(here, "mocks");
  const result = await build({
    stdin: { contents: entrySource(variant), resolveDir: repoRoot, loader: "jsx", sourcefile: `entry-${variant}.jsx` },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", logLevel: "silent",
    nodePaths: [path.join(repoRoot, "node_modules")], absWorkingDir: repoRoot,
    define: { "process.env.NODE_ENV": '"test"' },
    alias: {
      "next-intl": path.join(mocks, "next-intl.js"),
      "next/navigation": path.join(mocks, "next-navigation.js"),
      "next/link": path.join(mocks, "next-link.js"),
      "@": path.join(repoRoot, "src"),
    },
    plugins: [{ name: "mocks", setup(b) {
      b.onResolve({ filter: /supabaseClient(\.ts)?$/ }, () => ({ path: path.join(mocks, "supabase.js") }));
      b.onResolve({ filter: /loadHome(\.ts)?$/ }, () => ({ path: path.join(mocks, "loadHome.js") }));
    } }],
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs"],
  });
  const code = result.outputFiles[0].text;
  bundles.set(variant, code);
  return code;
}

// React's scheduler creates MessageChannels; keep them so closeBrowser() can release the ports.
const openChannels = new Set();
class TrackedMessageChannel extends MessageChannel {
  constructor() { super(); openChannels.add(this); }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One browser profile: a shared auth session (like localStorage) broadcast to every tab (like Supabase does). */
export function createBrowser(variant = VARIANT) {
  const browser = {
    variant, session: null, tabs: [], tokenCounter: 0,
    sessionFor(userKey) {
      browser.tokenCounter += 1;
      return { access_token: `token-${userKey}-${browser.tokenCounter}`, user: { id: USERS[userKey].id } };
    },
    async broadcast(event) {
      for (const tab of browser.tabs) await tab.emitAuth(event, browser.session);
    },
    async signIn(userKey) { browser.session = browser.sessionFor(userKey); await browser.broadcast("SIGNED_IN"); },
    async signOut() { browser.session = null; await browser.broadcast("SIGNED_OUT"); },
    async refreshToken() {
      const userKey = Object.keys(USERS).find((key) => USERS[key].id === browser.session.user.id);
      browser.session = browser.sessionFor(userKey);
      await browser.broadcast("TOKEN_REFRESHED");
    },
    async newTab(options = {}) {
      const tab = await createTab(browser, options);
      browser.tabs.push(tab);
      return tab;
    },
  };
  return browser;
}

async function createTab(browser, { gateAuth = false } = {}) {
  const variant = browser.variant;
  const dom = new JSDOM(`<!doctype html><body><div id="root"></div></body>`, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://staging.test/" });
  const w = dom.window;
  Object.assign(w, { MessageChannel: TrackedMessageChannel, ReadableStream, TextDecoder, TextEncoder, Response, Headers });
  w.IS_REACT_ACT_ENVIRONMENT = true;
  w.HTMLElement.prototype.scrollTo = function scrollTo() {};
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });

  let releaseGate = () => {};
  const auth = {
    listeners: new Set(),
    gate: gateAuth ? new Promise((resolve) => { releaseGate = resolve; }) : Promise.resolve(),
    session: () => browser.session,
    homeData: async () => {
      const session = browser.session;
      const user = session && Object.values(USERS).find((candidate) => candidate.id === session.user.id);
      return user
        ? { userId: user.id, isAuthenticated: true, errors: [], events: [], brainInsights: [], assistantPeople: user.people, assistantMemories: [], profile: { firstName: user.name } }
        : { userId: null, isAuthenticated: false, errors: [], events: [], brainInsights: [], assistantPeople: [], assistantMemories: [], profile: null };
    },
  };
  w.__auth = auth;

  const tab = {
    window: w, auth, requests: [], hold: null, heldRequest: null, memoryUpdates: [], otherCalls: [],
    text: () => w.document.body.textContent ?? "",
    hasPrivateChip: () => Boolean(w.document.querySelector(".happy-chat-context")),
    dialogOpen: () => Boolean(w.document.querySelector('[role="dialog"]')),
    async act(fn) { await w.__act(async () => { await fn(); }); },
    async settle(ms = 80) { await tab.act(async () => { await sleep(ms); }); },
    releaseAuthGate() { releaseGate(); },
    async emitAuth(event, session) {
      await tab.act(async () => { for (const listener of [...auth.listeners]) listener(event, session); });
      await tab.settle(40);
    },
    async mount(kind = "page") {
      w.document.getElementById("root").innerHTML = "";
      w.__mount(w.document.getElementById("root"), kind);
      await tab.settle(60);
    },
    async unmount() { await tab.act(async () => { w.__unmount(); }); },
    async open() { await tab.act(async () => { w.__page.setOpen(true); }); await tab.settle(80); },
    async close() { await tab.act(async () => { w.__page.setOpen(false); }); await tab.settle(40); },
    async setScope(scope) { await tab.act(async () => { w.__page.setScope(scope); }); await tab.settle(60); },
    async setGift(gift) { await tab.act(async () => { w.__page.setGift(gift); }); await tab.settle(60); },
    async send(message) {
      const textarea = w.document.querySelector("textarea");
      await tab.act(async () => {
        Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, "value").set.call(textarea, message);
        textarea.dispatchEvent(new w.Event("input", { bubbles: true }));
      });
      await tab.act(async () => { textarea.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
      await tab.settle(420);
    },
    holdNextReply() { tab.hold = true; },
    async releaseHeld(text) { await tab.act(async () => { tab.heldRequest.release(text); }); await tab.settle(150); },
    lastRequest: () => tab.requests.at(-1),
  };
  w.__memoryUpdated = (id) => tab.memoryUpdates.push(id);

  w.fetch = async (url, init = {}) => {
    const target = String(url);
    if (target.includes("/api/ai-chat")) {
      const body = JSON.parse(init.body);
      const authorization = init.headers?.Authorization ?? null;
      tab.requests.push({ authorization, body });
      const encoder = new TextEncoder();
      if (tab.hold) {
        tab.hold = null;
        let controller;
        const stream = new ReadableStream({ start(c) { controller = c; } });
        tab.heldRequest = { signal: init.signal, release: (text) => { try { controller.enqueue(encoder.encode(text)); controller.close(); } catch {} } };
        return new Response(stream, { status: 200 });
      }
      const reply = `ВІДПОВІДЬ-HAPPY-${authorization ? authorization.replace("Bearer ", "") : "guest"}`;
      return new Response(new ReadableStream({ start(c) { c.enqueue(encoder.encode(reply)); c.close(); } }), { status: 200 });
    }
    tab.otherCalls.push(target);
    return new Response(JSON.stringify({ candidates: [] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  w.eval(await bundleFor(variant));
  await tab.mount("page");
  if (!gateAuth) await tab.settle(60);
  return tab;
}

export function closeBrowser(browser) {
  for (const tab of browser.tabs) tab.window.close();
  for (const channel of openChannels) { channel.port1.close(); channel.port2.close(); }
  openChannels.clear();
}
