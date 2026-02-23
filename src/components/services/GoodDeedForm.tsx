// src/components/services/GoodDeedForm.tsx
"use client";

import { useState } from "react";

type FormData = {
  type: "zwierzaki" | "dzieci" | "planeta";
  city: string;
  date: string;
  time: string;
  message: string;
  email: string;
  consent: boolean;
};

const TYPES = [
  { id: "zwierzaki", label: "🐾 Zwierzaki", color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
  { id: "dzieci", label: "👶 Dzieci", color: "bg-pink-50 border-pink-300 text-pink-700" },
  { id: "planeta", label: "🌍 Planeta", color: "bg-sky-50 border-sky-300 text-sky-700" },
];

export default function GoodDeedForm() {
  const [form, setForm] = useState<FormData>({
    type: "zwierzaki",
    city: "",
    date: "",
    time: "",
    message: "",
    email: "",
    consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // текстові поля
  function handleText(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.currentTarget;
    setForm((f) => ({ ...f, [name]: value }));
  }

  // чекбокс — важливо: одразу зчитуємо checked у локальну змінну
  function handleConsent(e: React.ChangeEvent<HTMLInputElement>) {
    const isChecked = e.currentTarget.checked;
    setForm((f) => ({ ...f, consent: isChecked }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/good-deed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess(true);
        setForm({ ...form, city: "", date: "", time: "", message: "", email: "", consent: false });
      } else {
        setError(data.error || "Coś poszło nie tak.");
      }
    } catch {
      setError("Nie udało się wysłać formularza.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-xl mx-auto bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-slate-200"
    >
      <h2 className="text-2xl font-bold text-center text-slate-800">
        Podaruj Dobro 💛
      </h2>
      <p className="text-center text-slate-500 text-sm mb-4">
        Wybierz kierunek dobra, wypełnij dane i dołącz do akcji.
      </p>

      {/* WYBÓR TYPÓW */}
      <div className="grid grid-cols-3 gap-3">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setForm((f) => ({ ...f, type: t.id as FormData["type"] }))}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 font-medium transition ${
              form.type === t.id ? `${t.color} ring-2 ring-offset-1` : "bg-white hover:bg-slate-50 border-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CITY */}
      <div>
        <label className="block text-sm font-medium text-slate-700">Miasto</label>
        <input
          type="text"
          name="city"
          value={form.city}
          onChange={handleText}
          placeholder="np. Warszawa"
          required
          className="mt-1 w-full rounded-xl border p-2"
        />
      </div>

      {/* DATE + TIME */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Data</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleText}
            required
            className="mt-1 w-full rounded-xl border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Godzina</label>
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleText}
            className="mt-1 w-full rounded-xl border p-2"
          />
        </div>
      </div>

      {/* MESSAGE */}
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Wiadomość (opcjonalnie)
        </label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleText}
          rows={3}
          className="mt-1 w-full rounded-xl border p-2"
          placeholder="Dlaczego chcesz podarować dobro?"
        />
      </div>

      {/* EMAIL */}
      <div>
        <label className="block text-sm font-medium text-slate-700">Twój e-mail</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleText}
          required
          placeholder="np. jan.kowalski@gmail.com"
          className="mt-1 w-full rounded-xl border p-2"
        />
      </div>

      {/* CONSENT */}
      <div className="flex items-center gap-2">
        <input
          id="consent"
          type="checkbox"
          name="consent"
          checked={form.consent}
          onChange={handleConsent}
          required
          className="peer hidden"
        />
        <label
          htmlFor="consent"
          className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none"
        >
          <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 peer-checked:bg-pink-500 peer-checked:text-white transition">
            ❤️
          </span>
          Wyrażam zgodę na przetwarzanie danych osobowych (RODO).
        </label>
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 py-3 font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Wysyłanie…" : "Wyślij zgłoszenie ✨"}
      </button>

      {/* FEEDBACK */}
      {success && (
        <p className="text-green-600 text-center font-medium">
          Twoje zgłoszenie zostało wysłane ✅
        </p>
      )}
      {error && (
        <p className="text-red-600 text-center font-medium">
          {error}
        </p>
      )}
    </form>
  );
}
