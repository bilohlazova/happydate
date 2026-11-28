import { useSyncExternalStore } from "react";
const router = { push: () => {}, refresh: () => {}, replace: () => {} };
const params = new URLSearchParams();
const listeners = new Set();
// Per-window pathname the harness can change to simulate a route change (HD-CHAT-002 provider tests).
export const __setPathname = (next) => { globalThis.__pathname = next; for (const listener of [...listeners]) listener(); };
export const useRouter = () => router;
export const usePathname = () => useSyncExternalStore(
  (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  () => globalThis.__pathname ?? "/",
  () => "/",
);
export const useSearchParams = () => params;
