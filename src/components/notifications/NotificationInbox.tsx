"use client";

import { Bell, ExternalLink, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

export default function NotificationInbox() {
  const t = useTranslations("navigation.notifications");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/happy/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json() as { items?: NotificationItem[]; unreadCount?: number };
      setItems(Array.isArray(body.items) ? body.items : []);
      setUnreadCount(Number.isInteger(body.unreadCount) ? Math.max(0, body.unreadCount ?? 0) : 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function markRead(id: string) {
    const response = await fetch(`/api/happy/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
    if (!response.ok) return;
    const body = await response.json() as { notification?: NotificationItem };
    if (body.notification) setItems((current) => current.map((item) => item.id === id ? body.notification! : item));
    setUnreadCount((count) => Math.max(0, count - (items.find((item) => item.id === id)?.readAt ? 0 : 1)));
  }

  async function openNotification(item: NotificationItem) {
    const response = await fetch(`/api/happy/notifications/${encodeURIComponent(item.id)}/open`, { method: "POST" });
    if (!response.ok) return;
    const body = await response.json() as { notification?: NotificationItem };
    if (body.notification) setItems((current) => current.map((entry) => entry.id === item.id ? body.notification! : entry));
    if (!item.readAt) setUnreadCount((count) => Math.max(0, count - 1));
    setOpen(false);
    if (body.notification?.destination.href) router.push(body.notification.destination.href);
  }

  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const badge = unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen((value) => !value); if (!open) void load(); }} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-sky-700" aria-label={unreadCount ? `${t("title")} (${badge})` : t("title")} aria-expanded={open} aria-controls="happy-notification-inbox">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-black leading-4 text-white" aria-hidden="true">{badge}</span>}
      </button>
      {open && <section id="happy-notification-inbox" className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" aria-label={t("title")}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="font-extrabold text-slate-900">{t("title")}</h2>{loading && <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" aria-label={t("loading")} />}</div>
        {items.length === 0 && !loading ? <p className="px-4 py-8 text-center text-sm text-slate-500">{t("empty")}</p> : <div className="max-h-[min(70vh,520px)] overflow-y-auto">{items.map((item) => <article key={item.id} className={`border-b border-slate-100 px-4 py-3 ${item.readAt ? "" : "bg-sky-50/60"}`}>
          <div className="flex items-start gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-slate-200" : "bg-sky-500"}`} aria-hidden="true" /><div className="min-w-0 flex-1"><p className="font-bold text-slate-900">{item.title}</p>{item.message && <p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p>}<time className="mt-2 block text-xs text-slate-400" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time><div className="mt-2 flex gap-2">{!item.readAt && <button type="button" onClick={() => void markRead(item.id)} className="text-xs font-bold text-slate-600 underline">{t("markRead")}</button>}<button type="button" onClick={() => void openNotification(item)} className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 underline">{t("open")}<ExternalLink className="h-3 w-3" aria-hidden="true" /></button></div></div></div>
        </article>)}</div>}
      </section>}
    </div>
  );
}
