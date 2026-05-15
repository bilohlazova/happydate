import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HappyDate – Wiadomość z Nieba",
  description: "Zostaw list lub wideo dla bliskiej osoby – bezpiecznie przechowamy i dostarczymy w wybranym dniu.",
  alternates: { canonical: "/services/wiadomosc-z-nieba" },
  openGraph: {
    title: "HappyDate – Wiadomość z Nieba",
    description: "Twoje słowa mogą dotrzeć nawet po latach.",
    type: "website",
    url: "https://happydate.pl/services/wiadomosc-z-nieba",
  },
  twitter: { card: "summary_large_image" },
};

/* ── Dані ── */
const STEPS = [
  { n: "01", emoji: "✍️", title: "Napisz lub nagraj",   desc: "List tekstowy lub wideo do 10 min." },
  { n: "02", emoji: "📅", title: "Wybierz datę",        desc: "Nawet za wiele lat — Ty decydujesz." },
  { n: "03", emoji: "🔒", title: "My przechowujemy",    desc: "Szyfrowanie, serwery UE, 12 miesięcy." },
  { n: "04", emoji: "💌", title: "Dostarczamy",         desc: "Dokładnie w wybranym dniu." },
];

const PLANS = [
  { name: "List cyfrowy",    price: "99 zł",  slug: "list-cyfrowy",    features: ["E-mail lub SMS", "12 mies. przechowywania", "Przedłużenie 9 zł/rok"], hot: false },
  { name: "List drukowany",  price: "179 zł", slug: "list-drukowany",  features: ["Druk premium + koperta", "Dostawa kurierem", "Kopia cyfrowa"],         hot: false },
  { name: "Wideo cyfrowe",   price: "199 zł", slug: "wideo-cyfrowe",   features: ["Do 10 min nagrania", "Bezpieczny link", "Powiadomienie odbiorcy"],      hot: true  },
  { name: "Wideo premium",   price: "299 zł", slug: "wideo-premium",   features: ["Pendrive + pudełko", "Dostawa kurierem", "Kopia cyfrowa"],              hot: false },
];

const TRUST = [
  { emoji: "🔐", title: "Szyfrowanie",        desc: "Wiadomość widzi tylko odbiorca." },
  { emoji: "🇪🇺", title: "Serwery UE (RODO)", desc: "Dane w niezależnych centrach danych." },
  { emoji: "🕐", title: "12 miesięcy",         desc: "Przedłużenie za 9 zł/rok." },
  { emoji: "👤", title: "Strażnik",            desc: "Zaufana osoba potwierdza wysyłkę." },
];

const FAQS = [
  { q: "Czy ktoś inny zobaczy moją wiadomość?",        a: "Nie. Szyfrujemy end-to-end — nawet my nie mamy dostępu. Tylko wskazany odbiorca w wybranym dniu." },
  { q: "Co jeśli nie odnowię przechowywania?",         a: "Na 30 dni przed końcem wysyłamy przypomnienie. Po tym czasie wiadomość jest bezpowrotnie usuwana." },
  { q: "Czy mogę zmienić datę lub odbiorcę?",          a: "Tak — do 24h przed wysyłką w panelu klienta." },
  { q: "Co jeśli odbiorca nie odbierze wiadomości?",   a: "Powiadamiamy Cię i dajesz 7 dni na podanie poprawnych danych. W przeciwnym razie zwracamy środki." },
  { q: "Czy mam prawo do zwrotu?",                     a: "Możesz anulować przed wysłaniem treści i otrzymać pełny zwrot. Po rozpoczęciu realizacji prawo odstąpienia nie przysługuje (art. 38 pkt 3)." },
];

export default function WiadomoscZNiebaPage() {
  return (
    <main style={{ background: "#f0f9ff", minHeight: "100svh", paddingBottom: 100, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ══ HERO ══ */}
      <section style={{ background: "linear-gradient(160deg,#0369a1 0%,#0ea5e9 55%,#38bdf8 100%)", padding: "28px 20px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.1)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,215,0,.08)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.85)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, background: "rgba(255,255,255,.15)", padding: "4px 14px", borderRadius: 20 }}>
            🌙 Wiadomość z Nieba
          </div>

          <h1 style={{ fontSize: 25, fontWeight: 800, color: "#fff", margin: "0 0 8px", lineHeight: 1.25 }}>
            Twoje słowa mogą dotrzeć<br />
            <span style={{ color: "#fde68a" }}>nawet po latach</span>
          </h1>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,.88)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto 18px" }}>
            Napisz list lub nagraj wideo. Bezpiecznie przechowamy i dostarczymy dokładnie w wybranym dniu.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {["Dla bliskich", "Na ważny dzień", "Z sercem"].map(t => (
              <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,.18)", padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,.25)" }}>{t}</span>
            ))}
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="#pakiety" style={{ background: "#fde68a", color: "#1a1040", borderRadius: 20, padding: "11px 24px", fontSize: 14, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 14px rgba(0,0,0,.2)" }}>
              Zamów wiadomość →
            </Link>
            <Link href="#jak-to-dziala" style={{ background: "rgba(255,255,255,.2)", color: "#fff", borderRadius: 20, padding: "11px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,.3)" }}>
              Jak to działa?
            </Link>
          </div>

          <div style={{ marginTop: 12 }}>
            <Link href="/services" style={{ fontSize: 12, color: "rgba(255,255,255,.55)", textDecoration: "none" }}>← Wróć do Usługi</Link>
          </div>
        </div>
      </section>

      {/* ══ JAK TO DZIAŁA ══ */}
      <section id="jak-to-dziala" style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Jak to działa?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #bae6fd", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#7dd3fc" }}>{s.n}</span>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PAKIETY ══ */}
      <section id="pakiety" style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Pakiety i ceny
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PLANS.map(p => (
            <div key={p.name} style={{ background: "#fff", borderRadius: 16, border: p.hot ? "2px solid #0ea5e9" : "1.5px solid #bae6fd", padding: "14px 16px", position: "relative" }}>
              {p.hot && (
                <div style={{ position: "absolute", top: -10, right: 14, background: "linear-gradient(135deg,#0369a1,#0ea5e9)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 20 }}>
                  NAJPOPULARNIEJSZY
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1040" }}>{p.name}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0ea5e9" }}>{p.price}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                    <span style={{ color: "#0ea5e9", fontSize: 13, flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <Link href={`/services/wiadomosc-z-nieba/plans/${p.slug}`} style={{
                display: "block", textAlign: "center",
                background: p.hot ? "linear-gradient(135deg,#0369a1,#0ea5e9)" : "#f0f9ff",
                color: p.hot ? "#fff" : "#0369a1",
                borderRadius: 12, padding: "10px",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
                border: p.hot ? "none" : "1.5px solid #bae6fd",
              }}>
                Szczegóły i zamów →
              </Link>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          Ceny brutto. Po rozpoczęciu realizacji prawo odstąpienia nie przysługuje (art. 38 pkt 3).
        </p>
      </section>

      {/* ══ BEZPIECZEŃSTWO ══ */}
      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Bezpieczeństwo i zaufanie
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {TRUST.map(t => (
            <div key={t.title} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #bae6fd", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 5 }}>{t.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {/* Юридичний блок */}
        <div style={{ marginTop: 10, background: "#fefce8", borderRadius: 14, border: "1.5px solid #fde68a", padding: "12px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>⚖️ Ważne informacje prawne</div>
          <div style={{ fontSize: 11, color: "#78350f", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 3 }}>
            <span>• Usługa spersonalizowana — brak prawa odstąpienia po realizacji.</span>
            <span>• HappyDate jest przechowawcą, nie weryfikuje treści.</span>
            <span>• Dane przetwarzane zgodnie z RODO, serwery UE.</span>
            <span>• W przypadku śmierci nadawcy — wiadomość dostarczana wg instrukcji.</span>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Pytania i odpowiedzi
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map(f => (
            <details key={f.q} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #bae6fd", padding: "12px 14px" }}>
              <summary style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {f.q} <span style={{ color: "#38bdf8", fontSize: 16, flexShrink: 0, marginLeft: 8 }}>›</span>
              </summary>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding: "20px 16px 0" }}>
        <div style={{ background: "linear-gradient(135deg,#0369a1,#0ea5e9,#38bdf8)", borderRadius: 20, padding: "20px 16px", color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>🌙 Gotowy zostawić wiadomość?</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16, lineHeight: 1.5 }}>
            Twoje słowa będą czekać — dokładnie tyle, ile potrzeba.
          </div>
          <Link href="#pakiety" style={{ display: "inline-block", background: "#fde68a", color: "#1a1040", borderRadius: 14, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
            Wybierz pakiet →
          </Link>
        </div>
      </section>

    </main>
  );
}