// src/app/services/podaruj-dobro/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

// GoodDeedSteps та YouTubeShowcase — default-експорти (без фігурних дужок).
// GoodDeedForm теж експортується як default.
import GoodDeedSteps from "@/components/services/GoodDeedSteps";
import YouTubeShowcase from "@/components/services/YouTubeShowcase";
import GoodDeedForm from "@/components/services/GoodDeedForm";

export const metadata: Metadata = {
  title: "HappyDate – Podaruj Dobro",
  description:
    "Zamiast prezentu — podaruj dobro! Zarejestruj się na wizytę i pomóż potrzebującym.",
  alternates: { canonical: "/services/podaruj-dobro" },
  openGraph: {
    title: "HappyDate – Podaruj Dobro",
    description:
      "Zamiast prezentu – odwiedź dzieci lub schronisko i zostaw po sobie ślad dobra.",
    url: "https://happydate.pl/services/podaruj-dobro",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function PodarujDobroPage() {
  return (
    <main className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white overflow-x-hidden">
      {/* HERO */}
      <section className="bg-gradient-to-b from-rose-50 to-cyan-50 py-20 md:py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl sm:text-5xl font-bold leading-snug mb-8">
            Dobro ma wiele twarzy.
            <br className="hidden sm:inline" />
            <span className="text-rose-600"> Którą z nich pokażesz dzisiaj?</span>
          </h1>

          <div className="mt-6 space-y-5 text-lg font-medium text-gray-800 dark:text-gray-200">
            <p>
              🐾 <strong>Zwierzakowi</strong> możesz dać{" "}
              <span className="italic">chwilę bezpieczeństwa i czułości.</span>
            </p>
            <p>
              👧 <strong>Dziecku</strong> możesz dać{" "}
              <span className="italic">czas, którego nigdy nie zapomni.</span>
            </p>
            <p>
              🌿 <strong>Planecie</strong> możesz dać{" "}
              <span className="italic">gest troski, który wróci do nas wszystkich.</span>
            </p>
          </div>

          <p className="mt-10 text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
            Nie potrzebujesz wiele. Wystarczy obecność.
            <br />
            <strong className="text-gray-900 dark:text-white">
              Zostaw po sobie ślad dobra.
            </strong>
          </p>

          <a
            href="#form"
            className="mt-8 inline-block bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
          >
            ❤️ Wybieram swoją drogę dobra
          </a>

          <div className="mt-6">
            <Link href="/services" className="text-sm underline opacity-80 hover:opacity-100">
              ← Wróć do „Usługi”
            </Link>
          </div>
        </div>
      </section>

      {/* Jak to działa */}
      <GoodDeedSteps />

      {/* Wideo кейси */}
      <YouTubeShowcase />

      {/* Formularz */}
      <section id="form" className="bg-white dark:bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-6 text-center">Zapisz się na wizytę</h2>
          <GoodDeedForm />
        </div>
      </section>
      {/* STOPKA приходить з layout.tsx */}
    </main>
  );
}
