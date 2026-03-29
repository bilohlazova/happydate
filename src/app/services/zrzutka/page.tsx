"use client";

import Link from "next/link";
import { useState } from "react";

/* ══ Анімована банка ══ */
function MoneyJar({ percent }: { percent: number }) {
  const p = Math.min(100, Math.max(0, percent));
  const color = p < 30 ? "#86efac" : p < 70 ? "#34d399" : "#10b981";
  const lightColor = p < 30 ? "#bbf7d0" : "#6ee7b7";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width="110" height="140" viewBox="0 0 120 150">
        {/* Кришка */}
        <rect x="35" y="8" width="50" height="14" rx="6" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/>
        <rect x="30" y="18" width="60" height="8" rx="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>

        {/* Тіло */}
        <path d="M25 30 Q20 35 18 50 L18 128 Q18 140 30 142 L90 142 Q102 140 102 128 L102 50 Q100 35 95 30 Z"
          fill="white" stroke="#e5e7eb" strokeWidth="1.5"/>

        <defs>
          <clipPath id="jar-clip">
            <path d="M25 30 Q20 35 18 50 L18 128 Q18 140 30 142 L90 142 Q102 140 102 128 L102 50 Q100 35 95 30 Z"/>
          </clipPath>
        </defs>

        <g clipPath="url(#jar-clip)">
          <rect x="18" y="30" width="84" height="112" fill="#f0fdf4"/>
          <rect x="18" y={142 - (112 * p / 100)} width="84" height={112 * p / 100}
            fill={color} style={{ transition: "all 0.8s cubic-bezier(.4,0,.2,1)" }}/>
          {p > 0 && (
            <ellipse cx="60" cy={142 - (112 * p / 100)} rx="42" ry="5"
              fill={lightColor} style={{ transition: "all 0.8s cubic-bezier(.4,0,.2,1)" }}/>
          )}
          {p > 10 && <ellipse cx="50" cy="135" rx="10" ry="4" fill="#fbbf24" opacity="0.8"/>}
          {p > 30 && <ellipse cx="70" cy="128" rx="8" ry="3" fill="#fbbf24" opacity="0.7"/>}
          {p > 50 && <ellipse cx="46" cy="122" rx="9" ry="3.5" fill="#fbbf24" opacity="0.7"/>}
          {p > 70 && <ellipse cx="68" cy="116" rx="10" ry="4" fill="#fbbf24" opacity="0.8"/>}
          {p > 15 && (
            <text x="60" y={Math.max(55, 142 - (112 * p / 100) + 20)}
              textAnchor="middle" fontSize="13" fontWeight="800"
              fill="white" style={{ transition: "all 0.8s" }}>
              {Math.round(p)}%
            </text>
          )}
        </g>

        {/* Блиск */}
        <path d="M30 40 Q28 70 30 100" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" fill="none"/>
        <path d="M25 30 Q20 35 18 50 L18 128 Q18 140 30 142 L90 142 Q102 140 102 128 L102 50 Q100 35 95 30 Z"
          fill="none" stroke="#d1d5db" strokeWidth="1.5"/>
      </svg>

      <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", textAlign: "center" }}>
        {p === 0 ? "Czeka na pierwszą wpłatę 🌱" :
         p < 50 ? "Zrzutka rośnie! 💪" :
         p < 100 ? "Prawie gotowe! 🎉" :
         "Cel osiągnięty! 🎊"}
      </div>
    </div>
  );
}

/* ══ Головна сторінка ══ */
export default function ZrzutkaPage() {
  const [collected, setCollected] = useState(180);
  const goal = 500;
  const percent = Math.round((collected / goal) * 100);

  const PARTICIPANTS = [
    { name: "Kasia", amount: 80, avatar: "🙋‍♀️" },
    { name: "Marek", amount: 50, avatar: "🙋‍♂️" },
    { name: "Ola",   amount: 50, avatar: "🙋‍♀️" },
  ];

  return (
    <main style={{ background: "#f8f7ff", minHeight: "100svh", paddingBottom: 100, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ══ HERO ══ */}
      <section style={{
        background: "linear-gradient(160deg,#fef3c7 0%,#fce7f3 60%,#ede9fe 100%)",
        padding: "28px 20px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, background: "rgba(251,191,36,.15)", display: "inline-block", padding: "4px 12px", borderRadius: 20 }}>
          Zrzutka
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1040", margin: "0 0 8px", lineHeight: 1.2 }}>
          💸 Zbierz kasę<br/>od znajomych
        </h1>
        <p style={{ fontSize: 13, color: "#6b5e8a", margin: "0 0 6px", lineHeight: 1.5 }}>
          Stwórz zrzutkę, udostępnij link i zbieraj wpłaty. Wypłać w dowolnej chwili.
        </p>
        <p style={{ fontSize: 12, color: "#10b981", fontWeight: 700, marginBottom: 20 }}>
          Bierzemy tylko niewielki % od zebranej kwoty.
        </p>
        <Link href="#start" style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff", borderRadius: 20, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 14px rgba(124,58,237,.3)" }}>
          Utwórz zrzutkę →
        </Link>
        <div style={{ marginTop: 12 }}>
          <Link href="/services" style={{ fontSize: 12, color: "#b0a8cc", textDecoration: "none" }}>
            ← Wróć do Usługi
          </Link>
        </div>
      </section>

      {/* ══ DEMO BANKI ══ */}
      <section style={{ margin: "12px 16px 0", background: "#fff", borderRadius: 24, border: "1.5px solid #ede9f8", padding: "20px 16px", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 16 }}>
          Podgląd zrzutki — demo
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Банка */}
          <div style={{ flex: "0 0 auto" }}>
            <MoneyJar percent={percent} />
          </div>

          {/* Деталі */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1040", marginBottom: 4 }}>
              Urodziny Tomka 🎂
            </div>

            {/* Прогрес */}
            <div style={{ background: "#f8f7ff", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#1a1040", marginBottom: 6 }}>
                <span>Zebrano</span>
                <span style={{ color: "#059669" }}>{collected} zł</span>
              </div>
              <div style={{ height: 8, background: "#ede9f8", borderRadius: 20, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ height: "100%", borderRadius: 20, background: "linear-gradient(90deg,#34d399,#10b981)", width: `${percent}%`, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }}/>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#b0a8cc" }}>
                <span>Cel: {goal} zł</span>
                <span>Brakuje: {goal - collected} zł</span>
              </div>
            </div>

            {/* Учасники */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Uczestnicy
            </div>
            {PARTICIPANTS.map(p => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{p.avatar}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1040", flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>+{p.amount} zł</span>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопки симуляції */}
        <div style={{ borderTop: "1px solid #f5f3ff", marginTop: 14, paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: "#b0a8cc", textAlign: "center", marginBottom: 8 }}>
            Kliknij i zobacz jak baniak rośnie 👇
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[20, 50, 100].map(amount => (
              <button key={amount} onClick={() => setCollected(prev => Math.min(goal, prev + amount))}
                style={{ background: "linear-gradient(135deg,#ede9fe,#fce7f3)", border: "1.5px solid #c4b5f8", borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "#7c3aed", cursor: "pointer" }}>
                +{amount} zł
              </button>
            ))}
            <button onClick={() => setCollected(0)}
              style={{ background: "#fff5f5", border: "1.5px solid #fecaca", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>
              ↺
            </button>
          </div>
        </div>
      </section>

      {/* ══ JAK TO DZIAŁA ══ */}
      <section style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0a8cc", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          Jak to działa?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { n: "01", emoji: "✨", title: "Utwórz zrzutkę", desc: "Podaj nazwę i cel. Gotowe w 1 minutę." },
            { n: "02", emoji: "🔗", title: "Udostępnij link", desc: "Każdy wpłaca ile chce — przez link lub kod QR." },
            { n: "03", emoji: "💳", title: "Wypłać kiedy chcesz", desc: "Pieniądze dostępne od razu. Wypłacasz w dowolnej chwili." },
          ].map(s => (
            <div key={s.n} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #ede9f8", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg,#ede9fe,#fce7f3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#c4b5f8" }}>{s.n}</span>
                <span style={{ fontSize: 18 }}>{s.emoji}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#7c6f9f" }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ OPŁATY ══ */}
      <section style={{ margin: "8px 16px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderRadius: 20, border: "1.5px solid #86efac", padding: "16px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#065f46", marginBottom: 6 }}>💚 Przejrzyste opłaty</div>
        <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.5, marginBottom: 10 }}>
          Bierzemy tylko <strong>niewielki procent</strong> od zebranej kwoty. Bez ukrytych kosztów, bez abonamentów.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Tworzenie", value: "0 zł" },
            { label: "Prowizja", value: "2–4%" },
            { label: "Wypłata", value: "0 zł" },
          ].map(f => (
            <div key={f.label} style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "10px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#065f46" }}>{f.value}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding: "16px", textAlign: "center" }} id="start">
        <div style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", borderRadius: 20, padding: "20px 16px", color: "#fff" }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Gotowy na zrzutkę? 🚀</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16, lineHeight: 1.5 }}>
            Stwórz i udostępnij link w mniej niż minutę.
          </div>
          <Link href="/survey?flow=zrzutka" style={{ display: "inline-block", background: "#fff", color: "#7c3aed", borderRadius: 14, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
            Utwórz zrzutkę →
          </Link>
        </div>
      </section>

    </main>
  );
}