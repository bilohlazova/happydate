"use client";

import { Bell, ExternalLink, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useAuth } from "@/components/AuthProvider";
import { applyInboxReadMutation, markInboxPageFailure, mergeInboxPage, selectRenderableInbox, type InboxSnapshot } from "@/lib/notifications/inboxState";
import { supabase } from "@/lib/supabaseClient";

type NotificationItem = {
  id: string;
  title: string;
  message: string | null;
  priority: "silent" | "normal" | "important";
  createdAt: string;
  readAt: string | null;
  openedAt: string | null;
  destination: { href: string; kind: string };
};

type InboxResponse = {
  ownerId?: string;
  items?: NotificationItem[];
  unreadCount?: number;
  hasMore?: boolean;
};

function isCurrentOwner(ownerId: string, currentUserId: string | null, authLoading: boolean, ownerRef: MutableRefObject<string | null>): boolean {
  return !authLoading && currentUserId === ownerId && ownerRef.current === ownerId;
}

export default function NotificationInbox() {
  const t = useTranslations("navigation.notifications");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<InboxSnapshot<NotificationItem> | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState(false);
  const requestIdRef = useRef(0);
  const ownerRef = useRef<string | null>(null);

  const resetForOwner = useCallback((ownerId: string | null) => {
    requestIdRef.current += 1;
    ownerRef.current = ownerId;
    setSnapshot(null);
    setOpen(false);
    setPendingIds(new Set());
    setActionError(false);
  }, []);

  useEffect(() => {
    // Auth ownership is an external subscription boundary; clear all prior-user state immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetForOwner(authLoading ? null : user?.id ?? null);
  }, [authLoading, resetForOwner, user?.id]);

  const load = useCallback(async (page = 0, append = false) => {
    const ownerId = user?.id ?? null;
    if (authLoading || !ownerId) return;
    const requestId = ++requestIdRef.current;
    ownerRef.current = ownerId;
    setSnapshot((current) => current?.ownerId === ownerId
      ? { ...current, status: "loading" }
      : { ownerId, status: "loading", items: [], unreadCount: 0, page: 0, hasMore: false });
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (requestId === requestIdRef.current && isCurrentOwner(ownerId, user?.id ?? null, authLoading, ownerRef)) {
          setSnapshot((current) => markInboxPageFailure(current, ownerId, page, append, "unauthorized", false));
        }
        return;
      }
      const response = await fetch(`/api/happy/notifications?page=${page}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json().catch(() => ({})) as InboxResponse;
      if (requestId !== requestIdRef.current || !isCurrentOwner(ownerId, user?.id ?? null, authLoading, ownerRef)) return;
      if (response.status === 401) {
        setSnapshot((current) => markInboxPageFailure(current, ownerId, page, append, "unauthorized", false));
        return;
      }
      if (response.status === 503) {
        setSnapshot((current) => markInboxPageFailure(current, ownerId, page, append, "unavailable"));
        return;
      }
      if (!response.ok || body.ownerId !== ownerId || !Array.isArray(body.items)) {
        setSnapshot((current) => markInboxPageFailure(current, ownerId, page, append, "error"));
        return;
      }
      setSnapshot((current) => mergeInboxPage(current, ownerId, page, body.items!, Number.isInteger(body.unreadCount) ? body.unreadCount ?? 0 : 0, body.hasMore === true, append));
    } catch {
      if (requestId === requestIdRef.current && isCurrentOwner(ownerId, user?.id ?? null, authLoading, ownerRef)) {
        setSnapshot((current) => markInboxPageFailure(current, ownerId, page, append, "error"));
      }
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    // Load the externally owned Inbox snapshot when the authenticated owner changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!authLoading && user) void load();
  }, [authLoading, load, user]);

  const visible = selectRenderableInbox(snapshot, user?.id ?? null, authLoading);
  const status = visible?.status ?? (authLoading || !user ? "idle" : "loading");
  const items = visible?.items ?? [];
  const unreadCount = visible?.unreadCount ?? 0;
  const badge = unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : String(unreadCount);

  async function authRequest(path: string) {
    const ownerId = user?.id ?? null;
    if (authLoading || !ownerId) return null;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ownerId, response: null };
    const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    return { ownerId, response };
  }

  async function markRead(id: string) {
    if (pendingIds.has(id)) return;
    const ownerId = user?.id ?? null;
    if (!ownerId) return;
    setPendingIds((current) => new Set(current).add(id));
    setActionError(false);
    try {
      const result = await authRequest(`/api/happy/notifications/${encodeURIComponent(id)}/read`);
      if (!result?.response || result.response.status === 401 || !result.response.ok) { setActionError(true); return; }
      const body = await result.response.json() as { notification?: NotificationItem };
      if (!isCurrentOwner(ownerId, user?.id ?? null, authLoading, ownerRef) || !body.notification) return;
      setSnapshot((current) => current && current.ownerId === ownerId ? applyInboxReadMutation(current, id, body.notification!) : current);
    } catch {
      setActionError(true);
    } finally {
      setPendingIds((current) => { const next = new Set(current); next.delete(id); return next; });
    }
  }

  async function openNotification(item: NotificationItem) {
    if (pendingIds.has(item.id)) return;
    const ownerId = user?.id ?? null;
    if (!ownerId) return;
    setPendingIds((current) => new Set(current).add(item.id));
    setActionError(false);
    try {
      const result = await authRequest(`/api/happy/notifications/${encodeURIComponent(item.id)}/open`);
      if (!result?.response || result.response.status === 401 || !result.response.ok) { setActionError(true); return; }
      const body = await result.response.json() as { notification?: NotificationItem };
      if (!isCurrentOwner(ownerId, user?.id ?? null, authLoading, ownerRef) || !body.notification) return;
      setSnapshot((current) => current && current.ownerId === ownerId ? applyInboxReadMutation(current, item.id, body.notification!) : current);
      setOpen(false);
      if (body.notification.destination.href) router.push(body.notification.destination.href);
    } catch {
      setActionError(true);
    } finally {
      setPendingIds((current) => { const next = new Set(current); next.delete(item.id); return next; });
    }
  }

  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const errorMessage = status === "unauthorized" ? t("unauthorized") : status === "unavailable" ? t("unavailable") : t("error");

  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen((value) => !value); if (!open) void load(); }} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-sky-700" aria-label={unreadCount ? `${t("title")} (${badge})` : t("title")} aria-expanded={open} aria-controls="happy-notification-inbox">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-black leading-4 text-white" aria-hidden="true">{badge}</span>}
      </button>
      {open && <section id="happy-notification-inbox" className="hd-notification-panel absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" aria-label={t("title")}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="font-extrabold text-slate-900">{t("title")}</h2>{status === "loading" && <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" aria-label={t("loading")} />}</div>
        {status === "error" || status === "unauthorized" || status === "unavailable" ? <div className="px-4 py-8 text-center text-sm text-slate-600" role="alert"><p>{errorMessage}</p><button type="button" onClick={() => void load(visible?.failedPage ?? visible?.page ?? 0, visible?.failedAppend ?? false)} className="mt-3 font-bold text-sky-700 underline">{t("retry")}</button></div> : items.length === 0 && status !== "loading" ? <p className="px-4 py-8 text-center text-sm text-slate-500">{t("empty")}</p> : <div className="max-h-[min(70vh,520px)] overflow-y-auto">{items.map((item) => <article key={item.id} className={`border-b border-slate-100 px-4 py-3 ${item.readAt ? "" : "bg-sky-50/60"}`}>
          <div className="flex items-start gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-slate-200" : "bg-sky-500"}`} aria-hidden="true" /><div className="min-w-0 flex-1"><p className="font-bold text-slate-900">{item.title}</p>{item.message && <p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p>}<time className="mt-2 block text-xs text-slate-400" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time><div className="mt-2 flex gap-2">{!item.readAt && <button type="button" disabled={pendingIds.has(item.id)} onClick={() => void markRead(item.id)} className="text-xs font-bold text-slate-600 underline disabled:opacity-50">{t("markRead")}</button>}<button type="button" disabled={pendingIds.has(item.id)} onClick={() => void openNotification(item)} className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 underline disabled:opacity-50">{t("open")}<ExternalLink className="h-3 w-3" aria-hidden="true" /></button></div></div></div>
        </article>)}{visible?.hasMore && <button type="button" onClick={() => void load(visible.page + 1, true)} disabled={status === "loading"} className="w-full px-4 py-3 text-sm font-bold text-sky-700 disabled:opacity-50">{status === "loading" ? t("loadingMore") : t("loadMore")}</button>}</div>}
        {actionError && <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-800" role="alert">{t("error")}</p>}
      </section>}
    </div>
  );
}
