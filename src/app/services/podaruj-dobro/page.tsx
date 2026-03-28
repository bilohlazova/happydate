import type { Metadata } from "next";
import Link from "next/link";
import YouTubeShowcase from "@/components/services/YouTubeShowcase";
import GoodDeedForm from "@/components/services/GoodDeedForm";

export const metadata: Metadata = {
  title: "HappyDate – Podaruj Dobro",
  description: "Zamiast prezentu — podaruj dobro! Zarejestruj się na wizytę i pomóż potrzebującym.",
  alternates: { canonical: "/services/podaruj-dobro" },
  robots: { index: true, follow: true },
};

const DIRECTIONS = [
  {
    emoji: "🐾",
    title: "Zwierzęta",
    subtitle: "Schronisko",
    desc: "Godzina Twojej obecności zmienia wszystko dla zwierzaka czekającego na dom.",
    bg: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
    border: "#6ee7b7",
    color: "#065f46",
  },
  {
    emoji: "👧",
    title: "Dzieci",
    subtitle: "Dom dziecka",
    desc: "Twój czas i uwaga to prezent, którego żaden sklep nie sprzedaje.",
    bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)",
    border: "#f9a8d4",
    color: "#9d174d",
  },
  {
    emoji: "🌿",
    title: "Planeta",
    subtitle: "Akcja eko",
    desc: "Każde posadzone drzewo to gest troski, który wróci do nas wszystkich.",
    bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
    border: "#93c5fd",
    color: "#1e40af",
  },
];

const STEPS = [
  { emoji: "🎯", n: "01", title: "Wybierz kierunek", desc: "Zwierzęta, dzieci lub planeta" },
  { emoji: "📅", n: "02", title: "Zarezerwuj termin", desc: "Data, miasto, godzina" },
  { emoji: "🎁", n: "03", title: "Przygotuj gest", desc: "Karma, czas lub roślinka" },
  { emoji: "✨", n: "04", title: "Zostaw ślad dobra", desc: "Przyjdź i pobądź" },
];

export default function PodarujDobroPage() {
  return (
    <main style={{ background: "#f8f7ff", minHeight: "100svh", paddingBottom: 100, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

      {/* ══ HERO ══════════════════════════════════════════ */}
      <section style={{
        background: "linear-gradient(160deg,#1a0533 0%,#3b0764 50%,#831843 100%)",
        padding: "36px 20px 32px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Декоративні кола */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(236,72,153,.15)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(167,139,250,.12)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, background: "rgba(255,255,255,.1)", padding: "4px 12px", borderRadius: 20 }}>
            Podaruj Dobro
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 8px", lineHeight: 1.2, letterSpacing: "-0.5px" }}>
            Dobro ma wiele twarzy.
          </h1>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#f9a8d4", margin: "0 0 20px", lineHeight: 1.2 }}>
            Którą z nich pokażesz dzisiaj?
          </p>

          <p style={{ fontSize: 14, color: "rgba(255,255,255,.75)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto 24px" }}>
            Nie potrzebujesz wiele. Wystarczy obecność.
            <br /><strong style={{ color: "#fff" }}>Zostaw po sobie ślad dobra.</strong>
          </p>

          <a
            href="#form"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg,#ec4899,#f97316)",
              color: "#fff", borderRadius: 20,
              padding: "12px 28px",
              fontSize: 15, fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(236,72,153,.4)",
            }}
          >
            ❤️ Wybieram swoją drogę dobra
          </a>

          <div style={{ marginTop: 14 }}>
            <Link href="/services" style={{ fontSize: 12, color: "rgba(255,255,255,.5)", textDecoration: "none" }}>
              ← Wróć do Usługi
            </Link>
          </div>
        </div>
      </section>

      {/* ══ TRZY KIERUNKI ════════════════════════════════ */}
      <section style={{ padding: "24px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 14 }}>
          Wybierz swój kierunek
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DIRECTIONS.map(d => (
            <div key={d.title} style={{
              background: "#fff",
              borderRadius: 20,
              border: `1.5px solid ${d.border}`,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,.04)",
            }}>
              {/* Emoji blob */}
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: d.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, flexShrink: 0,
              }}>
                {d.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#1a1040" }}>{d.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: d.color, background: d.bg, padding: "2px 8px", borderRadius: 20 }}>{d.subtitle}</span>
                </div>
                <p style={{ fontSize: 12, color: "#7c6f9f", lineHeight: 1.5, margin: 0 }}>{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ KROKI ════════════════════════════════════════ */}
      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 14 }}>
          Jak to działa?
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{
              background: "#fff", borderRadius: 16,
              border: "1.5px solid #ede9f8",
              padding: "14px 12px",
              boxShadow: "0 1px 4px rgba(0,0,0,.03)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#c4b5f8", letterSpacing: "0.05em" }}>{s.n}</span>
                <span style={{ fontSize: 18 }}>{s.emoji}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: "#7c6f9f" }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ WIDEO ════════════════════════════════════════ */}
      <div style={{ marginTop: 16 }}>
        <YouTubeShowcase />
      </div>

      {/* ══ FORMULARZ ════════════════════════════════════ */}
      <section id="form" style={{ padding: "24px 16px 0" }}>
        <GoodDeedForm />
      </section>

    </main>
  );
}