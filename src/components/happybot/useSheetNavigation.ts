"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Browser behaviour of the HappyBot sheet that opens over a page (HD-CHAT-002 Phase 1B).
 *
 * Back button: opening pushes one same-URL history entry; Back (browser, swipe, Android hardware
 * button) pops it and closes the sheet instead of leaving the page. Closing in any other way
 * (X, Esc) pops the entry we pushed so history stays clean. If the user already moved on to
 * another entry (route change) nothing is popped.
 *
 * Scroll: the sheet is fixed above the still-mounted page, so the page scroll normally survives.
 * `rememberScroll()` is called when opening and the position is put back after closing if the browser
 * moved it (mobile browsers can, when body scrolling is locked). Never restored on another route.
 */
export function useSheetNavigation(isOpen: boolean, close: () => void) {
  const pushed = useRef(false);
  const saved = useRef<{ y: number; pathname: string } | null>(null);
  const wasOpen = useRef(false);

  const rememberScroll = useCallback(() => {
    if (wasOpen.current) return;
    saved.current = { y: window.scrollY, pathname: window.location.pathname };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ ...(window.history.state ?? {}), hdHappyBotSheet: true }, "");
    pushed.current = true;
    const onPopState = () => {
      if (!pushed.current) return;
      pushed.current = false;
      close();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (!pushed.current) return;
      pushed.current = false;
      if (window.history.state?.hdHappyBotSheet) window.history.back();
    };
  }, [isOpen, close]);

  useEffect(() => {
    wasOpen.current = isOpen;
    if (isOpen) return;
    const position = saved.current;
    if (!position) return;
    saved.current = null;
    if (window.location.pathname !== position.pathname) return;
    const frame = window.requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - position.y) > 1) window.scrollTo(0, position.y);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  return { rememberScroll };
}
