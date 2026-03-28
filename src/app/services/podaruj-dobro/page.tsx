import type { Metadata } from "next";
import Link from "next/link";
import GoodDeedSteps from "@/components/services/GoodDeedSteps";
import YouTubeShowcase from "@/components/services/YouTubeShowcase";
import GoodDeedForm from "@/components/services/GoodDeedForm";

export const metadata: Metadata = {
  title: "HappyDate – Podaruj Dobro",
  description: "Zamiast prezentu — podaruj dobro! Zarejestruj się na wizytę i pomóż potrzebującym.",
  alternates: { canonical: "/services/podaruj-dobro" },
  robots: { index: true, follow: true },
};

export default function PodarujDobroPage() {
  return (
    <main style={{ background: "#f8f7ff", minHeight: "100svh", paddingBottom: 100, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

      {/* ── HERO — kompaktny ── */}
      <section style={{ background: "linear-gradient(135deg,#fce7f3,#fef9c3,#dbeafe)", padding: "24px 20px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1040", margin: "0 0 6px", lineHeight: 1.3 }}>
          Dobro ma wiele twarzy.
        </h1>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#e11d48", margin: "0 0 14px", lineHeight: 1.3 }}>
          Którą z nich pokażesz dzisiaj?
        </p>

        {/* Trzy wartości — kompaktnie */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, textAlign: "left", maxWidth: 340, margin: "0 auto 16px" }}>
          {[
            { emoji: "🐾", who: "Zwierzakowi", what: "chwilę bezpieczeństwa i czułości" },
            { emoji: "👧", who: "Dziecku",     what: "czas, którego nigdy nie zapomni" },
            { emoji: "🌿", who: "Planecie",    what: "gest troski, który wróci do nas" },
          ].map(item => (
            <div key={item.who} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
              <span style={{ fontSize: 18 }}>{item.emoji}</span>
              <span><strong>{item.who}</strong> możesz dać <em>{item.what}</em>.</span>
            </div>
          ))}
        </div>

        <a
          href="#form"
          style={{ display: "inline-block", background: "linear-gradient(135deg,#e11d48,#f97316)", color: "#fff", borderRadius: 20, padding: "10px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}
        >
          ❤️ Wybieram swoją drogę dobra
        </a>

        <div style={{ marginTop: 10 }}>
          <Link href="/services" style={{ fontSize: 12, color: "#7c6f9f", textDecoration: "underline" }}>
            ← Wróć do Usługi
          </Link>
        </div>
      </section>

      {/* ── Jak to działa ── */}
      <GoodDeedSteps />

      {/* ── Wideo ── */}
      <YouTubeShowcase />

      {/* ── Formularz ── */}
      <section id="form" style={{ padding: "24px 16px" }}>
        <GoodDeedForm />
      </section>

    </main>
  );
}