"use client";

import Link from "next/link";
import { useState } from "react";

/* ── Анімована банка ────────────────────────────────────── */
function MoneyJar({ percent }: { percent: number }) {
  const p = Math.min(100, Math.max(0, percent));
  // Колір рідини залежить від заповненості
  const color = p < 30 ? "#86efac" : p < 70 ? "#34d399" : "#10b981";
  const lightColor = p < 30 ? "#bbf7d0" : p < 70 ? "#6ee7b7" : "#6ee7b7";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width="120" height="150" viewBox="0 0 120 150">
        {/* Кришка */}
        <rect x="35" y="8" width="50" height="14" rx="6" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/>
        <rect x="30" y="18" width="60" height="8" rx="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>

        {/* Тіло банки */}
        <path d="M25 30 Q20 35 18 50 L18 128 Q18 140 30 142 L90 142 Q102 140 102 128 L102 50 Q100 35 95 30 Z"
          fill="white" stroke="#e5e7eb" strokeWidth="1.5"/>

        {/* Рідина (кліп по формі банки) */}
        <defs>
          <clipPath id="jar-clip">
            <path d="M25 30 Q20 35 18 50 L18 128 Q18 140 30 142 L90 142 Q102 140 102 128 L102 50 Q100 35 95 30 Z"/>
          </clipPath>
        </defs>

        {/* Рівень рідини */}
        <g clipPath="url(#jar-clip)">
          {/* Фон банки */}
          <rect x="18" y="30" width="84" height="112" fill="#f0fdf4"/>

          {/* Рідина */}
          <rect
            x="18"
            y={142 - (112 * p / 100)}
            width="84"
            height={112 * p / 100}
            fill={color}
            style={{ transition: "all 0.8s cubic-bezier(.4,0,.2,1)" }}
          />

          {/* Хвиля зверху рідини */}
          {p > 0 && (
            <ellipse
              cx="60"
              cy={142 - (112 * p / 100)}
              rx="42"
              ry="5"
              fill={lightColor}
              style={{ transition: "all 0.8s cubic-bezier(.4,0,.2,1)" }}
            />
          )}

          {/* Монетки */}
          {p > 10 && <ellipse cx="50" cy="135" rx="10" ry="4" fill="#fbbf24" opacity="0.8"/>}
          {p > 25 && <ellipse cx="70" cy="130" rx="8" ry="3" fill="#fbbf24" opacity="0.7"/>}
          {p > 40 && <ellipse cx="45" cy="125" rx="9" ry="3.5" fill="#fbbf24" opacity="0.7"/>}
          {p > 55 && <ellipse cx="68" cy="120" rx="10" ry="4" fill="#fbbf24" opacity="0.8"/>}
          {p > 70 && <ellipse cx="52" cy="115" rx="8" ry="3" fill="#fbbf24" opacity="0.6"/>}
        </g>

        {/* Блиск скла */}
        <path d="M30 40 Q28 70 30 100" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" fill="none"/>
        <path d="M36 36 Q34 50 36 65" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" fill="none"/>

        {/* Контур банки поверх */}
        <path d="M25 30 Q20 35 18 50 L18 128 Q18 140 30 142 L90 142 Q102 140 102 128 L102 50 Q100 35 95 30 Z"
          fill="none" stroke="#d1d5db" strokeWidth="1.5"/>

        {/* Відсоток всередині */}
        {p > 15 && (
          <text x="60" y={142 - (112 * p / 100) + 20}
            textAnchor="middle" fontSize="13" fontWeight="800"
            fill="white" style={{ transition: "all 0.8s" }}>
            {Math.round(p)}%
          </text>
        )}
      </svg>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>
        {p === 0 ? "Czeka na pierwszą wpłatę 🌱" :
         p < 50 ? "Zrzutka rośnie! 💪" :
         p < 100 ? "Prawie gotowe! 🎉" :
         "Zebrano! Czas na prezent! 🎁"}
      </div>
    </div>
  );
}

/* ── Головна сторінка ───────────────────────────────────── */
const FEATURES = [
  { emoji: "🔗", title: "Jeden link", desc: "Udostępnij znajomym przez WhatsApp, Messenger lub e-mail." },
  { emoji: "📊", title: "Transparentność", desc: "Każda wpłata widoczna, postęp w czasie rzeczywistym." },
  { emoji: "🤖", title: "Pomysły AI", desc: "Dobierzemy prezent do osoby, okazji i budżetu." },
  { emoji: "🎁", title: "Dostawa", desc: "Zamawiamy, pakujemy i dostarczamy z efektem wow." },
];

const STEPS = [
  { n: "01", emoji: "✨", title: "Utwórz zrzutkę", desc: "Okazja, termin i budżet — gotowe w 2 minuty." },
  { n: "02", emoji: "📤", title: "Udostępnij link", desc: "Każda wpłata jest zliczana automatycznie." },
  { n: "03", emoji: "🎯", title: "Finalizacja", desc: "Pomożemy wybrać i dostarczyć prezent na czas." },
];

const PACKAGES = [
  {
    name: "Starter", price: "0 zł", note: "Sam organizujesz",
    bullets: ["Link i strona zrzutki", "Podstawowe szablony"],
    highlight: false,
  },
  {
    name: "Concierge", price: "49 zł", note: "Z pomocą konsultanta",
    bullets: ["Pomysły AI + konsultant", "Wsparcie przy zamówieniu", "Dostawa"],
    highlight: true,
  },
  {
    name: "Premium", price: "od 199 zł", note: "Pełna koordynacja",
    bullets: ["Kompletna obsługa", "Pakowanie i kartka", "Foto potwierdzenie"],
    highlight: false,
  },
];

export default function ZrzutkaPage() {
  const [collected, setCollected] = useState(340);
  const goal = 500;
  const percent = Math.round((collected / goal) * 100);

  return (
    <main style={{ background: "#f8f7ff", minHeight: "100svh", paddingBottom: 100, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ══ HERO ══ */}
      <section style={{
        background: "linear-gradient(160deg,#fef3c7 0%,#fce7f3 50%,#ede9fe 100%)",
        padding: "28px 20px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, background: "rgba(251,191,36,.15)", display: "inline-block", padding: "4px 12px", borderRadius: 20 }}>
          Zrzutka na Prezent
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1040", margin: "0 0 8px", lineHeight: 1.2 }}>
          🤝 Wspólny prezent<br/>bez chaosu
        </h1>
        <p style={{ fontSize: 13, color: "#6b5e8a", margin: "0 0 20px", lineHeight: 1.5 }}>
          Jeden link, przejrzyste postępy i prezent dostarczony na czas.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="#start" style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff", borderRadius: 20, padding: "11px 22px", fontSize: 14, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 14px rgba(124,58,237,.3)" }}>
            Rozpocznij zrzutkę →
          </Link>
          <Link href="/services" style={{ background: "#fff", color: "#7c6f9f", borderRadius: 20, padding: "11px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none", border: "1.5px solid #ede9f8" }}>
            Inne usługi
          </Link>
        </div>
      </section>

      {/* ══ DEMO BANKI ══ */}
      <section style={{ padding: "24px 16px", background: "#fff", margin: "12px 16px", borderRadius: 24, border: "1.5px solid #ede9f8", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 16 }}>
          Podgląd zrzutki
        </div>

        <MoneyJar percent={percent} />

        <div style={{ marginTop: 16, background: "#f8f7ff", borderRadius: 14, padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 8 }}>
            <span>Zebrano</span>
            <span style={{ color: "#059669" }}>{collected} / {goal} zł</span>
          </div>
          {/* Pasek postępu */}
          <div style={{ height: 8, background: "#ede9f8", borderRadius: 20, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 20,
              background: "linear-gradient(90deg,#34d399,#10b981)",
              width: `${percent}%`,
              transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
            }}/>
          </div>
          <div style={{ fontSize: 11, color: "#b0a8cc", marginTop: 6, textAlign: "right" }}>
            Brakuje {goal - collected} zł do celu
          </div>
        </div>

        {/* Symulacja wpłat */}
        <div style={{ marginTop: 12, fontSize: 12, color: "#7c6f9f", textAlign: "center", marginBottom: 8 }}>
          Przetestuj — kliknij wpłatę:
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {[20, 50, 100].map(amount => (
            <button
              key={amount}
              onClick={() => setCollected(prev => Math.min(goal, prev + amount))}
              style={{
                background: "linear-gradient(135deg,#ede9fe,#fce7f3)",
                border: "1.5px solid #c4b5f8",
                borderRadius: 12, padding: "8px 16px",
                fontSize: 13, fontWeight: 700, color: "#7c3aed",
                cursor: "pointer",
              }}
            >
              +{amount} zł
            </button>
          ))}
          <button
            onClick={() => setCollected(0)}
            style={{
              background: "#fff5f5", border: "1.5px solid #fecaca",
              borderRadius: 12, padding: "8px 12px",
              fontSize: 12, fontWeight: 600, color: "#dc2626",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </section>

      {/* ══ JAK TO DZIAŁA ══ */}
      <section style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Jak to działa?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #ede9f8", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg,#ede9fe,#fce7f3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#c4b5f8" }}>{s.n}</span>
                <span style={{ fontSize: 16 }}>{s.emoji}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#7c6f9f" }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Dlaczego z HappyDate?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #ede9f8", padding: "12px" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{f.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: "#7c6f9f", lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PAKIETY ══ */}
      <section style={{ padding: "16px 16px 8px" }} id="start">
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Pakiety
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PACKAGES.map(p => (
            <div key={p.name} style={{
              background: p.highlight ? "linear-gradient(135deg,#fdf4ff,#fce7f3)" : "#fff",
              borderRadius: 16,
              border: p.highlight ? "2px solid #f9a8d4" : "1.5px solid #ede9f8",
              padding: "14px 16px",
              position: "relative",
            }}>
              {p.highlight && (
                <div style={{ position: "absolute", top: -10, right: 16, background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 20 }}>
                  POPULARNY
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1040" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#7c6f9f" }}>{p.note}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: p.highlight ? "#7c3aed" : "#1a1040" }}>{p.price}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                {p.bullets.map(b => (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b5e8a" }}>
                    <span style={{ color: "#10b981", fontSize: 14 }}>✓</span> {b}
                  </div>
                ))}
              </div>
              <Link href="/survey?flow=zrzutka" style={{
                display: "block", textAlign: "center",
                background: p.highlight ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "#f8f7ff",
                color: p.highlight ? "#fff" : "#7c3aed",
                borderRadius: 12, padding: "10px",
                fontSize: 13, fontWeight: 700,
                textDecoration: "none",
                border: p.highlight ? "none" : "1.5px solid #e8e3f5",
              }}>
                Wybierz pakiet →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Najczęstsze pytania
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { q: "Czy uczestnicy widzą kwoty wpłat?", a: "Domyślnie tylko organizator. Możesz włączyć widok postępu dla wszystkich." },
            { q: "Jak długo trwa zrzutka?", a: "Ustawiasz termin. Delikatnie przypominamy uczestnikom przed deadline." },
            { q: "Czy mogę zmienić prezent?", a: "Tak. Edytuj cel i listę pomysłów w dowolnym momencie." },
            { q: "Jak wygląda dostawa?", a: "Zamawiamy, pakujemy i dostarczamy w wybranym dniu — nawet dyskretnie." },
          ].map(f => (
            <details key={f.q} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #ede9f8", padding: "12px 14px" }}>
              <summary style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {f.q} <span style={{ color: "#c4b5f8", fontSize: 16 }}>›</span>
              </summary>
              <p style={{ fontSize: 12, color: "#7c6f9f", marginTop: 8, lineHeight: 1.5 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

    </main>
  );
}