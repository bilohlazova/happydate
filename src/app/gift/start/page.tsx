"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

function formatPL(ymd?: string | null) {
  if (!ymd) return "";
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(
    new Date((ymd as string) + "T00:00:00")
  );
}

export default function GiftStartPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
      "Hej! 💝 Pomóż mi ogarnąć prezent:",
      `• Okazja: ${form.occasion || form.eventTitle || "—"}`,
      form.eventDate ? `• Data: ${formatPL(form.eventDate)}` : "",
      form.forWhom ? `• Dla kogo: ${form.forWhom}` : "",
      form.budget ? `• Budżet: ~${form.budget} zł` : "",
      form.splitPayment ? "• Zrzutka: tak" : "",
      form.anonymity ? "• Anonimowo: tak" : "",
      form.interests ? `• Zainteresowania: ${form.interests}` : "",
      form.notes ? `• Notatki: ${form.notes}` : "",
      "",
      `→ ${typeof window !== "undefined" ? window.location.href : "happydate.pl/gift/start"}`,
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        user_id: user?.id ?? null,
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
        status: "new" as const,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("gift_requests").insert([payload]);
      if (error) {
        console.warn("gift_requests insert error:", error.message);
        setMsg("Nie udało się zapisać zgłoszenia. Sprawdź połączenie lub tabelę.");
      } else {
        // 🔔 спроба відправити e-mail нотифікацію (не блокує UX)
        try {
          await fetch("/api/notify-gift", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
          });
        } catch {
          // ignore
        }

        setMsg("Zgłoszenie wysłane ✅ — konsultant wkrótce się odezwie.");
        setTimeout(() => router.push("/dashboard"), 900);
      }
    } catch {
      setMsg("Wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        {/* HERO */}
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-sky-700 border border-white/70">
            🎁 HappyDate Concierge
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Zrób prezent
          </h1>
          <p className="text-slate-600 mt-1">
            Podaj kilka szczegółów — doradzimy, zaprojektujemy i dostarczymy idealny prezent.
          </p>
        </header>

        {/* Wydarzenie */}
        <section className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-5 border border-white/60 mb-6">
          <h2 className="font-semibold text-slate-800 mb-3">Wydarzenie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1">Tytuł / okazja</label>
              <input
                ref={titleRef}
                value={form.occasion}
                onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))}
                placeholder="Urodziny Mamy, Rocznica, Wieczór gier…"
                className="w-full h-10 border rounded-xl p-2"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Data</label>
              <input
                type="date"
                value={form.eventDate ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                className="w-full h-10 border rounded-xl p-2"
              />
            </div>
          </div>
        </section>

        {/* Formularz */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-5 border border-white/60 space-y-4"
        >
          <h2 className="font-semibold text-slate-800">Dla kogo i co lubi?</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">Dla kogo</label>
              <input
                value={form.forWhom}
                onChange={(e) => setForm((f) => ({ ...f, forWhom: e.target.value }))}
                placeholder="Mama, partner, koleżanka z pracy…"
                className="w-full h-10 border rounded-xl p-2"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Płeć</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="w-full h-10 border rounded-xl p-2"
              >
                <option value="">—</option>
                <option value="kobieta">Kobieta</option>
                <option value="mezczyzna">Mężczyzna</option>
                <option value="inne">Inne / nie określam</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1">
                Budżet: <span className="font-semibold">{form.budget} zł</span>
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
                <span>Zrzutka</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.anonymity}
                  onChange={(e) => setForm((f) => ({ ...f, anonymity: e.target.checked }))}
                />
                <span>Anonimowo</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 h-11 rounded-2xl shadow"
            >
              {saving ? "Wysyłanie…" : "Wyślij zgłoszenie"}
            </button>

            <a
              href={whatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center items-center gap-2 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-5 h-11 rounded-2xl"
            >
              💬 Udostępnij przez WhatsApp
            </a>
          </div>

          {msg && (
            <p
              className={`text-sm mt-2 ${
                msg.includes("✅") ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {msg}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
