import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HappyDate – Wiadomość od Grupy",
  description: "Zbierz wideo od wszystkich — z całego świata. My montujemy w jedno wzruszające wideo.",
  alternates: { canonical: "/services/wiadomosc-grupowa" },
  robots: { index: true, follow: true },
};

const STYLES = [
  { emoji: "😂", name: "Humorystyczny",  desc: "Śmiech gwarantowany. Bloopers, żarty, wspólne wspomnienia.", color: "#fef3c7", border: "#fde68a", text: "#92400e" },
  { emoji: "😢", name: "Do łez",         desc: "Głęboko wzruszający. Słowa prosto z serca, które zostają na zawsze.", color: "#fce7f3", border: "#f9a8d4", text: "#9d174d" },
  { emoji: "🎉", name: "Celebracja",     desc: "Energia, radość i imprezowy vibe. Idealny na urodziny.", color: "#ede9fe", border: "#c4b5f8", text: "#5b21b6" },
  { emoji: "🎬", name: "Filmowy",        desc: "Profesjonalny montaż z muzyką, napisami i efektami.", color: "#dbeafe", border: "#93c5fd", text: "#1e40af" },
  { emoji: "🙏", name: "Podziękowanie",  desc: "Ciepłe, szczere słowa wdzięczności od całego zespołu.", color: "#dcfce7", border: "#86efac", text: "#065f46" },
  { emoji: "💼", name: "Pożegnanie",     desc: "Na odejście z pracy, przeprowadzkę lub koniec rozdziału.", color: "#f1f5f9", border: "#cbd5e1", text: "#334155" },
];

const STEPS = [
  { n: "01", emoji: "🎯", title: "Wybierz styl", desc: "Humorystyczny, do łez, filmowy — Ty decydujesz o klimacie." },
  { n: "02", emoji: "🔗", title: "Udostępnij link", desc: "Każdy nagrywa krótki klip ze swojego telefonu — z dowolnego miejsca na świecie." },
  { n: "03", emoji: "🎬", title: "My montujemy", desc: "Składamy wszystkie klipy w jedno spójne, piękne wideo z muzyką i napisami." },
  { n: "04", emoji: "🎁", title: "Wręczasz efekt WOW", desc: "Gotowy plik dostarczamy w 2–4 dni. Możesz puścić na żywo lub wysłać prywatnie." },
];

const PACKAGES = [
  { name: "Mini",     price: "49 zł",   clips: "do 10 klipów",   features: ["Podstawowy montaż", "Muzyka w tle", "Gotowy plik MP4"],              highlight: false },
  { name: "Standard", price: "99 zł",   clips: "do 25 klipów",   features: ["Montaż + napisy", "Muzyka dopasowana do stylu", "Intro z imieniem"], highlight: true  },
  { name: "Premium",  price: "199 zł",  clips: "do 60 klipów",   features: ["Pełny montaż filmowy", "Animacje i efekty", "Intro/Outro", "Ekspres 24h"], highlight: false },
];

const OCCASIONS = ["🎂 Urodziny", "👩‍🏫 Dzień Nauczyciela", "💼 Pożegnanie z pracy", "💍 Ślub", "🏫 Zakończenie roku", "🌍 Rozłąka z bliskim", "🎓 Dyplom", "💛 Dziękuję"];

export default function WiadomoscGrupowaPage() {
  return (
    <main style={{ background: "#f8f7ff", minHeight: "100svh", paddingBottom: 100, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ══ HERO ══ */}
      <section style={{
        background: "linear-gradient(160deg,#1a0533 0%,#3b0764 55%,#0c4a6e 100%)",
        padding: "32px 20px 28px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(99,102,241,.15)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(236,72,153,.12)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, background: "rgba(255,255,255,.1)", padding: "4px 12px", borderRadius: 20 }}>
            Wiadomość od Grupy
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 10px", lineHeight: 1.2 }}>
            🎬 Jedno wideo.<br/>Głosy z całego świata.
          </h1>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,.8)", lineHeight: 1.6, maxWidth: 320, margin: "0 auto 20px" }}>
            Zbieramy klipy od wszystkich — z każdego zakątka świata. Montujemy w jedno wzruszające wideo, które zostaje na zawsze.
          </p>

          {/* Аватари людей з різних країн */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            {["🇵🇱", "🇩🇪", "🇬🇧", "🇺🇸", "🇫🇷", "🇮🇹", "🇺🇦", "🇯🇵"].map(flag => (
              <div key={flag} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "2px solid rgba(255,255,255,.2)" }}>
                {flag}
              </div>
            ))}
          </div>

          <Link href="#start" style={{ display: "inline-block", background: "linear-gradient(135deg,#6366f1,#ec4899)", color: "#fff", borderRadius: 20, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 20px rgba(99,102,241,.4)" }}>
            Zamów wideo →
          </Link>

          <div style={{ marginTop: 12 }}>
            <Link href="/services" style={{ fontSize: 12, color: "rgba(255,255,255,.5)", textDecoration: "none" }}>
              ← Wróć do Usługi
            </Link>
          </div>
        </div>
      </section>

      {/* ══ OKAZJE ══ */}
      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Idealne na każdą okazję
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {OCCASIONS.map(o => (
            <div key={o} style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", background: "#ede9fe", border: "1.5px solid #c4b5f8", borderRadius: 20, padding: "5px 12px", whiteSpace: "nowrap" }}>
              {o}
            </div>
          ))}
        </div>
      </section>

      {/* ══ STYLE MONTAŻU ══ */}
      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Wybierz styl wideo
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STYLES.map(s => (
            <div key={s.name} style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${s.border}`, padding: "12px" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 3 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "#7c6f9f", lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ JAK TO DZIAŁA ══ */}
      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Jak to działa?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #ede9f8", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg,#ede9fe,#dbeafe)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#c4b5f8" }}>{s.n}</span>
                <span style={{ fontSize: 18 }}>{s.emoji}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#7c6f9f", lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PAKIETY ══ */}
      <section style={{ padding: "20px 16px 8px" }} id="start">
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Pakiety
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PACKAGES.map(p => (
            <div key={p.name} style={{
              background: p.highlight ? "linear-gradient(135deg,#fdf4ff,#ede9fe)" : "#fff",
              borderRadius: 16,
              border: p.highlight ? "2px solid #a78bfa" : "1.5px solid #ede9f8",
              padding: "14px 16px",
              position: "relative",
            }}>
              {p.highlight && (
                <div style={{ position: "absolute", top: -10, right: 16, background: "linear-gradient(135deg,#6366f1,#ec4899)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 20 }}>
                  POPULARNY
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1040" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#7c6f9f" }}>{p.clips}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: p.highlight ? "#6366f1" : "#1a1040" }}>{p.price}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b5e8a" }}>
                    <span style={{ color: "#6366f1", fontSize: 14 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <Link href="/survey?flow=group-message" style={{
                display: "block", textAlign: "center",
                background: p.highlight ? "linear-gradient(135deg,#6366f1,#ec4899)" : "#f8f7ff",
                color: p.highlight ? "#fff" : "#7c3aed",
                borderRadius: 12, padding: "10px",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
                border: p.highlight ? "none" : "1.5px solid #e8e3f5",
              }}>
                Zamów {p.name} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Najczęstsze pytania
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { q: "W jakich formatach można przysłać klip?", a: "MP4, MOV, nagrania z telefonu — cokolwiek. Dbamy o jakość podczas montażu." },
            { q: "Ile trwa realizacja?", a: "2–4 dni robocze od zebrania materiałów. Ekspres (24h) dostępny w pakiecie Premium." },
            { q: "Czy osoba obdarowana dowie się wcześniej?", a: "Nie — link jest dyskretny, a gotowe wideo dostarczamy tylko do zamawiającego." },
            { q: "Co jeśli ktoś nagra za długo?", a: "Przycinamy i dostosowujemy każdy klip — żeby całość była spójna i dynamiczna." },
          ].map(f => (
            <details key={f.q} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #ede9f8", padding: "12px 14px" }}>
              <summary style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {f.q} <span style={{ color: "#c4b5f8", fontSize: 16, flexShrink: 0, marginLeft: 8 }}>›</span>
              </summary>
              <p style={{ fontSize: 12, color: "#7c6f9f", marginTop: 8, lineHeight: 1.5 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding: "20px 16px 0" }}>
        <div style={{ background: "linear-gradient(135deg,#6366f1,#ec4899)", borderRadius: 20, padding: "20px 16px", color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Gotowy na efekt WOW? 🎬</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16, lineHeight: 1.5 }}>
            Zbierz klipy z całego świata. My zrobimy resztę.
          </div>
          <Link href="/survey?flow=group-message" style={{ display: "inline-block", background: "#fff", color: "#6366f1", borderRadius: 14, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
            Zamów wideo →
          </Link>
        </div>
      </section>

    </main>
  );
}