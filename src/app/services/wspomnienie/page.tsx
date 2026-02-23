// src/app/services/wspomnienie/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

/**
 * WYMAGANIA:
 * 1) Bucket Supabase "uploads" (publiczny)
 * 2) Zmiennie środowiskowe:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* --------------------------- Dane stałe --------------------------- */
type Step = { emoji: string; title: string; text: string };
const STEPS: Step[] = [
  { emoji: "🖼️", title: "Prześlij zdjęcie", text: "Wyraźna twarz, może być skan. Delikatnie odświeżymy." },
  { emoji: "🎙️", title: "Dodaj tekst (opcjonalnie)", text: "Krótka dedykacja, którą lektor odczyta w wideo." },
  { emoji: "✨", title: "Odbierz wideo", text: "10–15 s subtelnej animacji twarzy z głosem lub muzyką." },
];

type Price = { title: string; price: string; color: "sky" | "pink" | "amber"; features: string[] };
const PRICES: Price[] = [
  { title: "Basic", price: "19 zł", color: "sky", features: ["10 s wideo", "1 twarz", "Muzyka w tle", "Link do pobrania"] },
  { title: "Emotion", price: "39 zł", color: "pink", features: ["10–15 s wideo", "Lekka renowacja", "Głos lektora (TTS)", "Udostępnienie rodzinie"] },
  { title: "Premium", price: "79 zł", color: "amber", features: ["Renowacja + upscaling", "Personalny tekst/edycja", "Wersja 9:16 (TikTok)", "Opcja bez znaku wodnego"] },
];

const FAQ = [
  { q: "Czy to prawdziwe nagranie?", a: "To animacja AI wygenerowana z jednego zdjęcia. Ruch jest subtelny, ale to nie oryginalny film." },
  { q: "Jakie zdjęcie będzie najlepsze?", a: "Wyraźne ujęcie twarzy, najlepiej prosto. Zeskanowane fotografie również działają." },
  { q: "Ile trwa realizacja?", a: "Zwykle kilka–kilkanaście minut od przesłania. Przy większym ruchu może potrwać dłużej." },
  { q: "Czy moje pliki są bezpieczne?", a: "Tak. Przechowujemy je bezpiecznie; na życzenie usuwamy obraz i gotowe wideo." },
];

/* --------------------------- Pomocnicze --------------------------- */
function bytesToPretty(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ================================================================== */

export default function WspomnieniePage() {
  /* --- formularz --- */
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("pl_female_soft");
  const [agree, setAgree] = useState(false);

  /* --- status/pipeline --- */
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0); // wizualny progress klienta
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const pollTimerRef = useRef<number | null>(null);

  /* czyszczenie preview/pollingu */
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [preview]);

  const dropRef = useRef<HTMLLabelElement | null>(null);

useEffect(() => {
  const el = dropRef.current;
  if (!el) return;

  type DragEvtName = "dragover" | "dragenter" | "dragleave" | "drop";

  const on = (t: DragEvtName, fn: EventListener) => el.addEventListener(t, fn);
  const off = (t: DragEvtName, fn: EventListener) => el.removeEventListener(t, fn);

  const prevent: EventListener = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  };

  const enter: EventListener = (ev) => {
    prevent(ev);
    el.classList.add("ring-2", "ring-pink-300", "bg-pink-50/50");
  };

  const leave: EventListener = (ev) => {
    prevent(ev);
    el.classList.remove("ring-2", "ring-pink-300", "bg-pink-50/50");
  };

  const drop: EventListener = (ev) => {
    prevent(ev);
    el.classList.remove("ring-2", "ring-pink-300", "bg-pink-50/50");
    const e = ev as DragEvent; // DOM DragEvent
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setErrorMsg(null);
    }
  };

  on("dragover", prevent);
  on("dragenter", enter);
  on("dragleave", leave);
  on("drop", drop);

  return () => {
    off("dragover", prevent);
    off("dragenter", enter);
    off("dragleave", leave);
    off("drop", drop);
  };
}, []);

  async function handleStart() {
    try {
      setErrorMsg(null);
      setVideoUrl(null);
      setProgress(0);

      if (!file) return setErrorMsg("Dodaj zdjęcie.");
      if (!agree) return setErrorMsg("Zaznacz zgodę na przetwarzanie obrazu.");

      setLoading(true);

      // 1) Upload do Storage
      setProgress(20);
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { data: up, error: upErr } = await supabase.storage
        .from("uploads")
        .upload(`animations/${filename}`, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(up!.path);
      const publicImageUrl = pub?.publicUrl;
      if (!publicImageUrl) throw new Error("Nie udało się uzyskać publicznego URL.");

      // 2) Wywołanie backendu — zwraca { id }
      setProgress(45);
      const res = await fetch("/api/animate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: publicImageUrl, ttsText: text.trim() || null, voice }),
      });
      const j: { id?: string; error?: string } = await res.json();
      if (!res.ok || !j.id) throw new Error(j.error || "Błąd przetwarzania.");

      // 3) Polling statusu
      setProgress(60);
      startPolling(j.id);
    } catch (e) {
      setLoading(false);
      setProgress(0);
      setErrorMsg(e instanceof Error ? e.message : "Coś poszło nie tak.");
    }
  }

  function startPolling(animationId: string) {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = window.setInterval(async () => {
      // postęp „udawany” po stronie UI
      setProgress((p) => (p < 92 ? p + 2 : p));

      const { data, error } = await supabase
        .from("animations")
        .select("status, result_video_url")
        .eq("id", animationId)
        .single();

      if (error) return;
      if (data?.status === "done") {
        if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
        setVideoUrl(data.result_video_url ?? null);
        setLoading(false);
        setProgress(100);
      }
      if (data?.status === "failed") {
        if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
        setLoading(false);
        setProgress(0);
        setErrorMsg("Przetwarzanie nie powiodło się. Spróbuj ponownie.");
      }
    }, 2500);
  }

  /* Kolory kart cen */
  const priceColors = useMemo(
    () => ({
      sky: { ring: "ring-sky-200", badge: "bg-sky-600" },
      pink: { ring: "ring-pink-200", badge: "bg-pink-600" },
      amber: { ring: "ring-amber-200", badge: "bg-amber-600" },
    }),
    []
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50">
      {/* ----------------------------- HERO ----------------------------- */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-28 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -right-28 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-sm font-semibold text-pink-700">
              ✨ Nowość HappyDate
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              Żywe Wspomnienie — <span className="text-pink-600">ożywimy</span> Twoje zdjęcie
            </h1>
            <p className="mt-4 text-lg text-neutral-700">
              Delikatny ruch twarzy, głos lub muzyka w tle. Idealne dla Babci, Dziadka lub bliskiej osoby.
              Wystarczy jedno zdjęcie.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#creator" className="rounded-xl bg-pink-600 px-5 py-3 font-semibold text-white hover:bg-pink-700">
                Ożyw zdjęcie teraz
              </a>
              <Link href="/services" className="rounded-xl border bg-white px-5 py-3 font-semibold text-neutral-700 hover:bg-neutral-50">
                Zobacz inne usługi
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-4 text-sm text-neutral-500">
              <span>🛡️ Materiał oznaczony jako AI</span>
              <span>🔒 Bezpieczne przechowywanie</span>
              <span>⚡ Szybka realizacja</span>
            </div>
          </div>

          {/* mock / podgląd na hero */}
          <div className="relative h-[320px] md:h-[420px]">
            <div className="absolute inset-0 rounded-3xl border bg-white/70 p-3 shadow-sm backdrop-blur">
              <div className="relative h-full w-full overflow-hidden rounded-2xl">
                <Image src="/images/zywe-wspomnienie-hero.jpg" alt="Żywe Wspomnienie" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------ Jak to działa ------------------------- */}
      <section className="mx-auto max-w-7xl px-6 pb-6">
        <h2 className="mb-6 text-2xl font-bold md:text-3xl">Jak to działa</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="text-3xl">{s.emoji}</div>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-neutral-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------- Kreator ---------------------------- */}
      <section id="creator" className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl border bg-white/90 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Stwórz swoje Żywe Wspomnienie</h2>
            {file && (
              <span className="text-xs text-neutral-500">
                {file.name} • {bytesToPretty(file.size)}
              </span>
            )}
          </div>
          <p className="mt-1 text-neutral-600">
            Dodaj zdjęcie, wpisz (opcjonalnie) tekst do przeczytania i rozpocznij. Wideo wygeneruje się automatycznie.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.05fr,1fr]">
            {/* Podgląd / Dropzone */}
            <div>
              <label
                ref={dropRef}
                className="group relative block cursor-pointer overflow-hidden rounded-2xl border bg-neutral-50 transition"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    setPreview(f ? URL.createObjectURL(f) : null);
                    setErrorMsg(null);
                  }}
                />
                <div className="relative aspect-[4/3] w-full">
                  {preview ? (
                    <Image src={preview} alt="Podgląd zdjęcia" fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-500">
                      <span className="text-2xl">⬆️</span>
                      <p className="text-sm">Przeciągnij i upuść zdjęcie albo kliknij, aby wybrać</p>
                      <p className="text-[11px] text-neutral-400">JPG/PNG, do 20 MB</p>
                    </div>
                  )}
                </div>
              </label>

              {/* Progress */}
              {(loading || progress > 0) && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full bg-pink-500 transition-all"
                      style={{ width: `${progress}%` }}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                      role="progressbar"
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {progress < 100 ? "Przetwarzamy Twoje zdjęcie…" : "Gotowe!"}
                  </p>
                </div>
              )}
            </div>

            {/* Ustawienia */}
            <div>
              <label className="block font-semibold">Tekst do przeczytania (opcjonalnie)</label>
              <textarea
                rows={5}
                className="mt-2 w-full rounded-xl border p-3"
                placeholder="Babciu, dziękujemy Ci za każdy uśmiech…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <div className="mt-4">
                <label className="block font-semibold">Głos</label>
                <select
                  className="mt-2 w-full rounded-xl border bg-white p-3"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  <option value="pl_female_soft">PL — kobiecy, łagodny</option>
                  <option value="pl_male_warm">PL — męski, ciepły</option>
                  <option value="ua_female_soft">UA — жіночий, мʼякий</option>
                  <option value="en_female_soft">EN — female, soft</option>
                </select>
              </div>

              <label className="mt-4 flex items-start gap-3">
                <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span className="text-sm text-neutral-600">
                  Wyrażam zgodę na przetwarzanie obrazu i generowanie animacji AI. Wiem, że to materiał generowany.
                </span>
              </label>

              {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleStart}
                  disabled={loading || !file}
                  className="rounded-xl bg-pink-600 px-5 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
                >
                  {loading ? "Przetwarzanie…" : "Ożyw moje zdjęcie"}
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setText("");
                    setVoice("pl_female_soft");
                    setAgree(false);
                    setVideoUrl(null);
                    setErrorMsg(null);
                    setProgress(0);
                    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
                  }}
                  className="rounded-xl border bg-white px-5 py-3 font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Wynik */}
          {videoUrl && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Gotowe! Twój film</h3>
                <div className="flex gap-2 text-sm">
                  <a
                    href={videoUrl}
                    download
                    className="rounded-xl border bg-white px-3 py-2 hover:bg-neutral-50"
                  >
                    Pobierz
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Zobacz moje Żywe Wspomnienie 💛 ${videoUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-emerald-500 px-3 py-2 font-semibold text-white hover:bg-emerald-600"
                  >
                    Udostępnij WhatsApp
                  </a>
                </div>
              </div>
              <video src={videoUrl} controls className="mt-3 w-full rounded-2xl border" />
              <p className="mt-2 text-sm text-neutral-500">
                Dziękujemy, że tworzysz dobro z HappyDate 💛
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------- Cennik --------------------------- */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="mb-6 text-2xl font-bold md:text-3xl">Cennik</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PRICES.map((p) => {
            const c = priceColors[p.color];
            return (
              <div key={p.title} className={`rounded-3xl border bg-white p-6 shadow-sm ring-1 ${c.ring}`}>
                <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${c.badge}`}>
                  {p.title}
                </div>
                <div className="mt-3 text-3xl font-extrabold">{p.price}</div>
                <ul className="mt-4 space-y-2 text-neutral-700">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#creator"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 font-semibold text-white hover:bg-neutral-800"
                >
                  Zamawiam
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------- FAQ ---------------------------- */}
      <section className="mx-auto max-w-5xl px-6 pb-14">
        <h2 className="mb-6 text-2xl font-bold md:text-3xl">Najczęstsze pytania</h2>
        <div className="divide-y rounded-3xl border bg-white">
          {FAQ.map((item) => (
            <details key={item.q} className="group p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                <span>{item.q}</span>
                <span className="text-neutral-400 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-3 text-neutral-700">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-xs text-neutral-500">
          Uwaga: Materiał oznaczamy jako generowany AI. Na życzenie usuwamy pliki ze Storage.
        </p>
      </section>

      {/* ------------------------------ CTA ----------------------------- */}
      <section className="relative bg-gradient-to-br from-sky-50 via-pink-50 to-amber-50">
        <div className="mx-auto max-w-7xl px-6 py-12 text-center md:py-16">
          <h2 className="text-2xl font-bold md:text-3xl">Gotowi na wzruszenie?</h2>
          <p className="mt-2 text-neutral-700">
            Podaruj bliskim emocje, których się nie zapomina. Jedno zdjęcie — i wspomnienie, które ożywa.
          </p>
          <a
            href="#creator"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-pink-600 px-6 py-3 font-semibold text-white hover:bg-pink-700"
          >
            Ożyw zdjęcie teraz
          </a>
        </div>
      </section>
    </main>
  );
}

