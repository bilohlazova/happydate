// src/app/services/wiadomosc-grupowa/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HappyDate – Wiadomość od Grupy",
  description:
    "Zbierz życzenia od wszystkich — wideo, audio lub tekst. Złożymy to w piękną, wzruszającą niespodziankę dla jednej osoby.",
  alternates: { canonical: "/services/wiadomosc-grupowa" },
  openGraph: {
    title: "HappyDate – Wiadomość od Grupy",
    description:
      "Wspólny prezent emocji: kompilacja życzeń od rodziny, klasy czy zespołu. My montujemy, Ty wręczasz efekt WOW.",
    type: "website",
    url: "https://happydate.pl/services/wiadomosc-grupowa",
  },
  twitter: { card: "summary_large_image" },
};

export default function WiadomoscGrupowaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-sky-50 to-amber-50">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto max-w-6xl px-4 pt-20 pb-16 md:pt-24 md:pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-4 h-1 w-32 rounded-full bg-gradient-to-r from-pink-500 via-sky-500 to-emerald-500" />
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              🤝 Prezenty Grupowe
            </h1>
            <p className="mt-2 text-slate-600">
              Razem raźniej — organizuj wspólne upominki łatwo i efektownie.
            </p>
          </div>

          {/* karta usługi */}
          <div className="mt-10 mx-auto max-w-3xl rounded-2xl bg-white/90 backdrop-blur shadow-xl ring-1 ring-black/5 p-6">
            <h2 className="text-2xl font-bold text-slate-900">
              🎬 Wiadomość od Grupy
            </h2>
            <p className="mt-2 text-slate-700">
              Zbierz życzenia od wszystkich — wideo, audio lub tekst. My
              montujemy w spójną, wzruszającą niespodziankę. Idealne na
              urodziny, jubileusz, Dzień Nauczyciela czy pożegnanie w pracy.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">Jak to działa?</h3>
                <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                  <li>Tworzymy link do zbierania życzeń.</li>
                  <li>Wysyłasz go rodzinie, klasie lub zespołowi.</li>
                  <li>Każdy dodaje nagranie lub wiadomość.</li>
                  <li>My montujemy i dostarczamy finałowy plik + kartkę.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">Pakiety</h3>
                <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                  <li><b>Mini</b> — do 10 klipów, podstawowy montaż.</li>
                  <li><b>Standard</b> — do 25 klipów, muzyka, napisy.</li>
                  <li><b>Premium</b> — 25–60 klipów, intro/outro, animacje.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/survey?flow=group-message"
                className="inline-flex items-center rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow ring-1 ring-black/5 hover:bg-blue-700"
                aria-label="Rozpocznij zbieranie życzeń"
              >
                Rozpocznij zbieranie życzeń →
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
              >
                ← Wróć do usług
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ (krótko) */}
      <section className="py-10">
        <div className="container mx-auto max-w-4xl px-4">
          <h3 className="text-xl font-bold text-slate-900">FAQ</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <details className="rounded-lg border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-medium">
                W jakich formatach można dodać życzenia?
              </summary>
              <p className="mt-2">
                Akceptujemy krótkie wideo (mp4, mov), audio (mp3, m4a) i tekst.
              </p>
            </details>
            <details className="rounded-lg border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-medium">
                Ile trwa realizacja?
              </summary>
              <p className="mt-2">
                Zwykle 2–4 dni robocze od zakończenia zbierania materiału
                (ekspres za dopłatą).
              </p>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}
