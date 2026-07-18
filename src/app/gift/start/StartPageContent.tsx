"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { GiftWorkspaceViewModel } from "@/lib/gifts/gift.types";
import { submitLegacyGiftRequest } from "@/lib/gifts/giftRequestCompatibility";
import { MobileUI } from "@/lib/theme/mobile";
import { GiftWorkspacePanel } from "./GiftWorkspacePanel";

type FormState = {
  eventId: string | null;
  eventTitle: string;
  eventDate: string | null;
  forWhom: string;
  gender: string;
  age: string;
  interests: string;
  occasion: string;
  budget: number;
  anonymity: boolean;
  splitPayment: boolean;
  delivery: "kurier" | "paczkomat" | "osobiscie";
  notes: string;
};

function formatDate(ymd: string | null | undefined, locale: string) {
  if (!ymd) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date((ymd as string) + "T00:00:00")
  );
}

export default function GiftStartPage({
  workspace,
  workspaceError,
}: {
  workspace: GiftWorkspaceViewModel | null;
  workspaceError: boolean;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("gift");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ key: "saveError" | "success" | "error"; success: boolean } | null>(null);

  // ініціалізація форми один раз
  const [form, setForm] = useState<FormState>(() => ({
    eventId: sp.get("eventId"),
    eventTitle: sp.get("title") ?? "",
    eventDate: sp.get("date"),
    forWhom: "",
    gender: "",
    age: "",
    interests: "",
    occasion: sp.get("title") ?? "",
    budget: 150,
    anonymity: false,
    splitPayment: false,
    delivery: "kurier",
    notes: "",
  }));

  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const whatsAppHref = useMemo(() => {
    const text = [
      t("share.intro"),
      `• ${t("share.occasion", { value: form.occasion || form.eventTitle || "—" })}`,
      form.eventDate ? `• ${t("share.date", { value: formatDate(form.eventDate, locale) })}` : "",
      form.forWhom ? `• ${t("share.recipient", { value: form.forWhom })}` : "",
      form.budget ? `• ${t("share.budget", { value: form.budget })}` : "",
      form.splitPayment ? `• ${t("share.split")}` : "",
      form.anonymity ? `• ${t("share.anonymous")}` : "",
      form.interests ? `• ${t("share.interests", { value: form.interests })}` : "",
      form.notes ? `• ${t("share.notes", { value: form.notes })}` : "",
      "",
      `→ ${typeof window !== "undefined" ? window.location.href : "happydate.pl/gift/start"}`,
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [form, locale, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    try {
      const payload = {
        event_id: form.eventId,
        event_title: form.eventTitle || form.occasion,
        event_date: form.eventDate,
        for_whom: form.forWhom,
        gender: form.gender || null,
        age: form.age || null,
        interests: form.interests || null,
        occasion: form.occasion || null,
        budget_pln: form.budget,
        anonymity: form.anonymity,
        split_payment: form.splitPayment,
        delivery: form.delivery,
        notes: form.notes || null,
      };

      const result = await submitLegacyGiftRequest(payload);
      if (!result.ok) {
        console.warn("gift_requests insert error:", result.error);
        setMsg({ key: "saveError", success: false });
      } else {
        setMsg({ key: "success", success: true });
        setTimeout(() => router.push("/dashboard"), 900);
      }
    } catch {
      setMsg({ key: "error", success: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={`${MobileUI.screen} bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50`}>
      <div className={`${MobileUI.container} ${MobileUI.contentBottom} py-4`}>
        {/* HERO */}
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-sky-700 border border-white/70">
            {t("hero.badge")}
          </div>
          <h1 className={`${MobileUI.title} mt-2`}>
            {t("hero.title")}
          </h1>
          <p className="text-slate-600 mt-1">
            {t("hero.subtitle")}
          </p>
        </header>

        <GiftWorkspacePanel workspace={workspace} hasError={workspaceError} />

        {/* Wydarzenie */}
        <section className={`${MobileUI.card} mb-4 border-white/60 bg-white/80 p-4 backdrop-blur`}>
          <h2 className="font-semibold text-slate-800 mb-3">{t("form.event")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1">{t("form.occasion")}</label>
              <input
                ref={titleRef}
                value={form.occasion}
                onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))}
                placeholder={t("form.occasionPlaceholder")}
                className={MobileUI.input}
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">{t("form.date")}</label>
              <input
                type="date"
                value={form.eventDate ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                className={MobileUI.input}
              />
            </div>
          </div>
        </section>

        {/* Formularz */}
        <form
          onSubmit={handleSubmit}
          className={`${MobileUI.card} space-y-4 border-white/60 bg-white/80 p-4 backdrop-blur`}
        >
          <h2 className="font-semibold text-slate-800">{t("form.details")}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">{t("form.recipient")}</label>
              <input
                value={form.forWhom}
                onChange={(e) => setForm((f) => ({ ...f, forWhom: e.target.value }))}
                placeholder={t("form.recipientPlaceholder")}
                className={MobileUI.input}
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">{t("form.gender")}</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className={MobileUI.input}
              >
                <option value="">—</option>
                <option value="kobieta">{t("form.genderFemale")}</option>
                <option value="mezczyzna">{t("form.genderMale")}</option>
                <option value="inne">{t("form.genderOther")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1">
                {t("form.budget", { amount: form.budget })}
              </label>
              <input
                type="range"
                min={50}
                max={1000}
                step={10}
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.splitPayment}
                  onChange={(e) => setForm((f) => ({ ...f, splitPayment: e.target.checked }))}
                />
                <span>{t("form.split")}</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.anonymity}
                  onChange={(e) => setForm((f) => ({ ...f, anonymity: e.target.checked }))}
                />
                <span>{t("form.anonymous")}</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className={`${MobileUI.button} bg-emerald-500 px-5 text-white shadow hover:bg-emerald-600`}
            >
              {t(saving ? "form.sending" : "form.submit")}
            </button>

            <a
              href={whatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${MobileUI.button} border border-emerald-200 bg-white px-5 text-emerald-700 hover:bg-emerald-50`}
            >
              {t("form.share")}
            </a>
          </div>

          {msg && (
            <p
              className={`text-sm mt-2 ${
                msg.success ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {t(`status.${msg.key}`)}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
