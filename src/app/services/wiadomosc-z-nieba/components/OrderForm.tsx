"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type PlanType = "list_cyfrowy" | "list_drukowany" | "video_cyfrowe" | "video_premium";

type FormData = {
  type: PlanType;
  recipientEmail: string;
  recipientName: string;
  deliveryDate: string;
  message: string;
  file?: File | null;
};

const VALID_TYPES = new Set<PlanType>([
  "list_cyfrowy",
  "list_drukowany",
  "video_cyfrowe",
  "video_premium",
]);

export default function OrderForm({ initialType }: { initialType?: PlanType }) {
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormData>({
    type: initialType ?? "list_cyfrowy",
    recipientEmail: "",
    recipientName: "",
    deliveryDate: "",
    message: "",
    file: null,
  });

  useEffect(() => {
    const q = (searchParams.get("plan") || "").toLowerCase();
    if (VALID_TYPES.has(q as PlanType)) {
      setForm((prev) => ({ ...prev, type: q as PlanType }));
    } else if (initialType && VALID_TYPES.has(initialType)) {
      setForm((prev) => ({ ...prev, type: initialType }));
    }

  }, [searchParams, initialType]);

  const [status, setStatus] =
    useState<"idle" | "loading" | "success" | "error">("idle");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target as { name: keyof FormData; value: string };
    setForm((prev) => ({ ...prev, [name]: value } as FormData));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const payload = new FormData();
      payload.append("type", form.type);
      payload.append("recipientEmail", form.recipientEmail);
      payload.append("recipientName", form.recipientName);
      payload.append("deliveryDate", form.deliveryDate);
      payload.append("message", form.message);
      if (form.file) payload.append("file", form.file);

      const res = await fetch("/api/heaven-messages", {
        method: "POST",
        body: payload,
      });

      if (!res.ok) throw new Error("Błąd zapisu");
      setStatus("success");
      setForm({
        type: initialType ?? "list_cyfrowy",
        recipientEmail: "",
        recipientName: "",
        deliveryDate: "",
        message: "",
        file: null,
      });
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <section
      id="order-form"
      aria-labelledby="order-form-heading"
      className="relative py-6"
    >
      {/* pastel blobs */}
      <span className="pointer-events-none absolute -left-10 top-6 h-56 w-56 rounded-full bg-pink-200/30 blur-3xl" />
      <span className="pointer-events-none absolute -right-12 bottom-6 h-64 w-64 rounded-full bg-sky-200/35 blur-3xl" />

      <div className="relative z-10">
        <h2
          id="order-form-heading"
          className="text-center text-3xl md:text-4xl font-bold text-slate-900"
        >
          Zamów swoją wiadomość
        </h2>
        <p className="mt-3 text-center text-slate-600">
          Wybierz formę, wypełnij dane i wskaż dzień dostarczenia. Resztą
          zajmiemy się my ✨
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-6 rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_16px_50px_-20px_rgba(0,0,0,.15)] backdrop-blur-lg md:p-8"
        >
          {/* Typ */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-800">
              Wybierz pakiet
            </label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
              className="mt-2 block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-slate-900 outline-none ring-2 ring-transparent transition focus:border-pink-300 focus:ring-pink-200"
            >
              <option value="list_cyfrowy">List cyfrowy</option>
              <option value="list_drukowany">List drukowany</option>
              <option value="video_cyfrowe">Wideo cyfrowe</option>
              <option value="video_premium">Wideo premium</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Każdy pakiet obejmuje 12 miesięcy przechowywania.
            </p>
          </div>

          {/* Dane odbiorcy */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="recipientName" className="block text-sm font-medium text-slate-800">
                Imię odbiorcy
              </label>
              <input
                type="text"
                id="recipientName"
                name="recipientName"
                value={form.recipientName}
                onChange={handleChange}
                required
                placeholder="np. Anna"
                className="mt-2 block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-slate-900 outline-none ring-2 ring-transparent transition focus:border-pink-300 focus:ring-pink-200"
              />
            </div>

            <div>
              <label htmlFor="recipientEmail" className="block text-sm font-medium text-slate-800">
                E-mail odbiorcy
              </label>
              <input
                type="email"
                id="recipientEmail"
                name="recipientEmail"
                value={form.recipientEmail}
                onChange={handleChange}
                required
                placeholder="anna@example.com"
                className="mt-2 block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-slate-900 outline-none ring-2 ring-transparent transition focus:border-pink-300 focus:ring-pink-200"
              />
              <p className="mt-2 text-xs text-slate-500">
                Dla „Listu drukowanego” i „Wideo premium” adres wysyłki zbierzemy po złożeniu zamówienia.
              </p>
            </div>
          </div>

          {/* Data */}
          <div>
            <label htmlFor="deliveryDate" className="block text-sm font-medium text-slate-800">
              Data wysyłki
            </label>
            <input
              type="date"
              id="deliveryDate"
              name="deliveryDate"
              value={form.deliveryDate}
              onChange={handleChange}
              required
              className="mt-2 block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-slate-900 outline-none ring-2 ring-transparent transition focus:border-pink-300 focus:ring-pink-200"
            />
            <p className="mt-2 text-xs text-slate-500">
              Wyślemy wiadomość dokładnie w tym dniu (czas lokalny odbiorcy).
            </p>
          </div>

          {/* Treść */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-800">
              Treść wiadomości (opcjonalnie)
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              value={form.message}
              onChange={handleChange}
              placeholder="Możesz wkleić tutaj tekst listu..."
              className="mt-2 block w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-slate-900 outline-none ring-2 ring-transparent transition placeholder:text-slate-400 focus:border-pink-300 focus:ring-pink-200"
            />
            <p className="mt-2 text-xs text-slate-500">
              Jeśli dodasz wideo lub dokument — treść może pozostać pusta.
            </p>
          </div>

          {/* Plik */}
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-slate-800">
              Plik (wideo lub dokument)
            </label>
            <input
              type="file"
              id="file"
              name="file"
              onChange={handleFile}
              accept="video/*,.txt,.pdf"
              className="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-pink-50 file:px-4 file:py-2 file:font-semibold file:text-pink-700 hover:file:bg-pink-100"
            />
            <p className="mt-2 text-xs text-slate-500">
              Wideo do 10 min (max ~1&nbsp;GB). Obsługujemy popularne formaty.
            </p>
          </div>

          {/* Zgoda */}
          <div className="flex items-start rounded-lg bg-white/60 p-3 ring-1 ring-slate-200">
            <input
              type="checkbox"
              id="consent"
              required
              className="mt-1 mr-3 h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
            />
            <label htmlFor="consent" className="text-sm text-slate-700">
              Wyrażam zgodę na przetwarzanie danych i rozumiem, że usługa ma
              charakter spersonalizowany (brak prawa odstąpienia po rozpoczęciu realizacji).
            </label>
          </div>

          {/* Status */}
          {status === "success" && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-green-700 ring-1 ring-green-200">
              ✅ Zamówienie przyjęte! Sprawdź skrzynkę e-mail.
            </p>
          )}
          {status === "error" && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700 ring-1 ring-red-200">
              ❌ Wystąpił błąd. Spróbuj ponownie.
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 py-3 font-semibold text-white shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:opacity-60"
          >
            {status === "loading" ? "Wysyłanie…" : "Zamawiam"}
          </button>
        </form>
      </div>
    </section>
  );
}
