import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HappyDate – Wiadomość od Grupy",
  description: "Zbierz wideo od wszystkich — z całego świata. My montujemy w jedno wzruszające wideo.",
  alternates: { canonical: "/services/wiadomosc-grupowa" },
  robots: { index: true, follow: true },
};

const STYLES = [
  { emoji: "😂", name: "Humorystyczny",  desc: "Śmiech gwarantowany. Bloopers i żarty.", color: "#fef9c3", border: "#fde047", text: "#713f12" },
  { emoji: "😢", name: "Do łez",         desc: "Słowa prosto z serca, które zostają na zawsze.", color: "#fce7f3", border: "#f9a8d4", text: "#9d174d" },
  { emoji: "🎉", name: "Celebracja",     desc: "Energia i radość. Idealny na urodziny.", color: "#dbeafe", border: "#93c5fd", text: "#1e40af" },
  { emoji: "🎬", name: "Filmowy",        desc: "Profesjonalny montaż z efektami i muzyką.", color: "#e0f2fe", border: "#7dd3fc", text: "#075985" },
  { emoji: "🙏", name: "Podziękowanie",  desc: "Ciepłe słowa wdzięczności od całego zespołu.", color: "#dcfce7", border: "#86efac", text: "#065f46" },
  { emoji: "💼", name: "Pożegnanie",     desc: "Na odejście z pracy lub koniec rozdziału.", color: "#f1f5f9", border: "#cbd5e1", text: "#334155" },
];

const STEPS = [
  { n: "01", emoji: "🎯", title: "Wybierz styl",    desc: "Humorystyczny, do łez, filmowy — Ty decydujesz o klimacie." },
  { n: "02", emoji: "🔗", title: "Udostępnij link", desc: "Każdy nagrywa klip ze swojego telefonu — z dowolnego miejsca na świecie." },
  { n: "03", emoji: "✂️", title: "My montujemy",    desc: "Składamy wszystkie klipy w jedno spójne wideo z muzyką i napisami." },
  { n: "04", emoji: "🎁", title: "Efekt WOW",       desc: "Gotowy plik w 2–4 dni. Puść na żywo lub wyślij prywatnie." },
];

const PACKAGES = [
  {
    name: "Mini",     price: "79 zł",
    clips: "do 10 klipów", time: "3–4 dni robocze",
    features: ["Montaż podstawowy", "Muzyka w tle", "Napisy z imionami", "Plik MP4"],
    highlight: false, accent: "#42a5e8",
  },
  {
    name: "Standard", price: "149 zł",
    clips: "do 25 klipów", time: "2–3 dni robocze",
    features: ["Montaż dynamiczny", "Muzyka dopasowana do stylu", "Intro z imieniem i datą", "Napisy i przejścia", "Link do streamingu"],
    highlight: true,  accent: "#42a5e8",
  },
  {
    name: "Premium",  price: "279 zł",
    clips: "do 60 klipów", time: "ekspres 24h możliwy",
    features: ["Pełny montaż filmowy", "Animacje i efekty", "Profesjonalne intro/outro", "Korekcja kolorów", "Wersja pionowa i pozioma"],
    highlight: false, accent: "#42a5e8",
  },
];

const OCCASIONS = ["🎂 Urodziny","👩‍🏫 Dzień Nauczyciela","💼 Pożegnanie z pracy","💍 Ślub","🏫 Zakończenie roku","🌍 Rozłąka","🎓 Dyplom","💛 Dziękuję"];

export default function WiadomoscGrupowaPage() {
  return (
    <main style={{ background: "#f0f9ff", minHeight: "100svh", paddingBottom: 100, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ══ HERO — блакитний фірмовий ══ */}
      <section style={{
        background: "linear-gradient(160deg,#1e6fa8 0%,#42a5e8 55%,#29b6f6 100%)",
        padding: "32px 20px 28px", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.1)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,215,0,.1)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.85)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, background: "rgba(255,255,255,.2)", padding: "4px 14px", borderRadius: 20 }}>
            Wiadomość od Grupy
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 10px", lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
            🎬 Jedno wideo.<br/>Głosy z całego świata.
          </h1>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,.9)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto 18px" }}>
            Zbieramy klipy od każdego — z każdego zakątka świata. Montujemy w jedno wzruszające wideo, które zostaje na zawsze.
          </p>

          {/* Прапори */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            {["🇵🇱","🇩🇪","🇬🇧","🇺🇸","🇫🇷","🇮🇹","🇺🇦","🇯🇵"].map(f => (
              <div key={f} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "2px solid rgba(255,255,255,.3)" }}>
                {f}
              </div>
            ))}
          </div>

          <Link href="#pakiety" style={{ display: "inline-block", background: "#ffd600", color: "#1a1040", borderRadius: 20, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
            Zamów wideo →
          </Link>

          <div style={{ marginTop: 12 }}>
            <Link href="/services" style={{ fontSize: 12, color: "rgba(255,255,255,.6)", textDecoration: "none" }}>
              ← Wróć do Usługi
            </Link>
          </div>
        </div>
      </section>

      {/* ══ OKAZJE ══ */}
      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Idealne na każdą okazję
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {OCCASIONS.map(o => (
            <div key={o} style={{ fontSize: 12, fontWeight: 600, color: "#0369a1", background: "#e0f2fe", border: "1.5px solid #7dd3fc", borderRadius: 20, padding: "5px 12px", whiteSpace: "nowrap" }}>
              {o}
            </div>
          ))}
        </div>
      </section>

      {/* ══ STYLE ══ */}
      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Wybierz styl wideo
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STYLES.map(s => (
            <div key={s.name} style={{ background: s.color, borderRadius: 16, border: `1.5px solid ${s.border}`, padding: "12px" }}>
              <div style={{ fontSize: 24, marginBottom: 5 }}>{s.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.text, marginBottom: 3 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: s.text, opacity: 0.8, lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ KROKI ══ */}
      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Jak to działa?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #bae6fd", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg,#bae6fd,#fef08a)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#0369a1" }}>{s.n}</span>
                <span style={{ fontSize: 18 }}>{s.emoji}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PAKIETY ══ */}
      <section style={{ padding: "20px 16px 8px" }} id="pakiety">
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Pakiety i ceny
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PACKAGES.map(p => (
            <div key={p.name} style={{
              background: "#fff", borderRadius: 18,
              border: p.highlight ? "2px solid #42a5e8" : "1.5px solid #bae6fd",
              padding: "16px", position: "relative",
            }}>
              {p.highlight && (
                <div style={{ position: "absolute", top: -10, right: 16, background: "linear-gradient(135deg,#1e6fa8,#42a5e8)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 20 }}>
                  NAJPOPULARNIEJSZY
                </div>
              )}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1040" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{p.clips} · {p.time}</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#42a5e8" }}>{p.price}</div>
              </div>
              <div style={{ height: 1, background: "#bae6fd", marginBottom: 10 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#475569" }}>
                    <span style={{ color: "#22c55e", fontSize: 14, flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <Link href="/survey?flow=group-message" style={{
                display: "block", textAlign: "center",
                background: p.highlight ? "linear-gradient(135deg,#1e6fa8,#42a5e8)" : "#e0f2fe",
                color: p.highlight ? "#fff" : "#0369a1",
                borderRadius: 12, padding: "11px",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>
                Zamów {p.name} →
              </Link>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", textAlign: "center" }}>
          Duża grupa lub specjalne wymagania?{" "}
          <Link href="/survey?flow=group-message-custom" style={{ color: "#42a5e8", fontWeight: 700, textDecoration: "none" }}>
            Zapytaj o wycenę →
          </Link>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Najczęstsze pytania
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { q: "W jakich formatach można przysłać klip?",  a: "MP4, MOV, nagrania z telefonu. Maksymalnie 2 minuty na osobę." },
            { q: "Ile trwa realizacja?",                     a: "Mini i Standard: 2–4 dni robocze. Premium z opcją ekspres 24h." },
            { q: "Czy osoba obdarowana dowie się wcześniej?", a: "Nie — link jest dyskretny. Gotowe wideo tylko dla zamawiającego." },
            { q: "Co jeśli ktoś nagra za długo?",            a: "Przycinamy i dostosowujemy każdy klip — całość jest spójna." },
            { q: "Czy mogę wybrać muzykę?",                  a: "Tak! W ankiecie podajesz preferencje lub zostawiasz to nam." },
          ].map(f => (
            <details key={f.q} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #bae6fd", padding: "12px 14px" }}>
              <summary style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {f.q} <span style={{ color: "#42a5e8", fontSize: 16, flexShrink: 0, marginLeft: 8 }}>›</span>
              </summary>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding: "20px 16px 0" }}>
        <div style={{ background: "linear-gradient(135deg,#1e6fa8,#42a5e8,#29b6f6)", borderRadius: 20, padding: "22px 16px", color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>🎬</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Gotowy na efekt WOW?</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16, lineHeight: 1.5 }}>
            Zbierz klipy z całego świata. My zrobimy resztę — już od 79 zł.
          </div>
          <Link href="/survey?flow=group-message" style={{ display: "inline-block", background: "#ffd600", color: "#1a1040", borderRadius: 14, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>
            Zamów wideo →
          </Link>
        </div>
      </section>

    </main>
  );
}