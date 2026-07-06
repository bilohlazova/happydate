import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HappyDate – Usługi",
  description: "HappyDate Care i rytuały online. Pamięć, emocje i wsparcie.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/services" },
};

const SERVICES = [
  {
    emoji: "💬",
    title: "Wysłuchaj mnie",
    description: "Anonimowa rozmowa z kimś, kto naprawdę słucha.",
    href: "/services/wysluchaj-mnie",
    color: "#e0f2fe",
    textColor: "#0369a1",
  },
  {
    emoji: "🌙",
    title: "Wiadomość z Nieba",
    description: "Słowa, których nigdy nie udało się wypowiedzieć.",
    href: "/services/wiadomosc-z-nieba",
    color: "#ede9fe",
    textColor: "#6d28d9",
  },
  {
    emoji: "🎥",
    title: "Wiadomość od Grupy",
    description: "Jedna wiadomość z głosów wielu bliskich osób.",
    href: "/services/wiadomosc-grupowa",
    color: "#dbeafe",
    textColor: "#1d4ed8",
  },
  {
    emoji: "💸",
    title: "Zrzutka",
    description: "Wspólny gest i emocje — bez produktów.",
    href: "/services/zrzutka",
    color: "#dcfce7",
    textColor: "#15803d",
  },
  {
    emoji: "🕊️",
    title: "Podaruj Dobro",
    description: "Zrób coś dobrego dla innych i dla siebie.",
    href: "/services/podaruj-dobro",
    color: "#fce7f3",
    textColor: "#be185d",
  },
];

export default function ServicesPage() {
  return (
    <main style={{ background: "#f8f7ff", minHeight: "100svh", paddingBottom: "calc(var(--hd-nav-height) + 24px + env(safe-area-inset-bottom))", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── HERO — компактний ── */}
      <section style={{ background: "linear-gradient(135deg,#fce7f3,#fef9c3,#dbeafe)", padding: "22px 16px 18px", textAlign: "center" }}>
        <div style={{ maxWidth: "var(--hd-screen-max)", margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1040", margin: "0 0 8px", lineHeight: 1.3 }}>
          Jedna usługa.<br />Wiele spokojnych chwil.
        </h1>
        <p style={{ fontSize: 13, color: "#6b5e8a", margin: "0 0 14px", lineHeight: 1.5 }}>
          HappyDate pamięta za Ciebie — bez stresu i zapominania.
        </p>
        <a
          href="#care"
          style={{ display: "inline-block", background: "linear-gradient(135deg,#ec4899,#f59e0b)", color: "#fff", borderRadius: 20, padding: "9px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
        >
          Zobacz HappyDate Care ↓
        </a>
        </div>
      </section>

      <div style={{ maxWidth: "var(--hd-screen-max)", margin: "0 auto", padding: "16px 16px 0" }}>

        {/* ── HAPPYDATE CARE — kompaktna karta ── */}
        <section id="care" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #ede9f8", padding: "18px 16px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 28 }}>💛</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1040" }}>HappyDate Care</div>
              <div style={{ fontSize: 11, color: "#7c6f9f" }}>od 29 zł / miesiąc</div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#6b5e8a", margin: "0 0 12px", lineHeight: 1.5 }}>
            Subskrypcja, która przejmuje pamiętanie i delikatne przypominanie — za Ciebie.
          </p>

          {/* 3 featury w rzędzie */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[
              { icon: "📅", text: "Daty" },
              { icon: "📝", text: "Notatki" },
              { icon: "🔔", text: "AI" },
            ].map(f => (
              <div key={f.text} style={{ flex: 1, background: "#f8f7ff", borderRadius: 10, padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#7c6f9f" }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{f.icon}</div>
                {f.text}
              </div>
            ))}
          </div>

          <Link
            href="/care"
            style={{ display: "block", background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff", borderRadius: 14, padding: "11px", textAlign: "center", fontSize: 14, fontWeight: 700, textDecoration: "none" }}
          >
            Zobacz HappyDate Care →
          </Link>
        </section>

        {/* ── RYTUAŁY — nagłówek ── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          ❤️ Dodatkowe rytuały online
        </div>

        {/* ── SERWISY — kompaktna lista ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SERVICES.map(s => (
            <Link
              key={s.href}
              href={s.href}
              style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 16, border: "1.5px solid #ede9f8", padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}
            >
              {/* Emoji w kolorowym kółku */}
              <div style={{ width: 44, height: 44, borderRadius: 14, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {s.emoji}
              </div>

              {/* Tekst */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#7c6f9f", lineHeight: 1.4 }}>{s.description}</div>
              </div>

              {/* Strzałka */}
              <div style={{ fontSize: 16, color: "#c4b5f8", flexShrink: 0 }}>›</div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
