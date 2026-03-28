"use client";

const STEPS = [
  { emoji: "🎯", title: "Wybierz kierunek", text: "Zwierzęta, dzieci lub planeta — co porusza Twoje serce?" },
  { emoji: "📅", title: "Zarezerwuj termin", text: "Podaj datę i miejsce. Pomożemy skoordynować wizytę." },
  { emoji: "🎁", title: "Przygotuj gest", text: "Karma, książeczki, roślinka — lub po prostu Twój czas." },
  { emoji: "✨", title: "Zostaw ślad dobra", text: "Przyjdź, poznaj, pobądź. To wystarczy." },
];

export default function GoodDeedSteps() {
  return (
    <section style={{ background: "#fff", padding: "24px 16px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1040", textAlign: "center", marginBottom: 16 }}>
        Jak to działa?
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480, margin: "0 auto" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            background: "#f8f7ff", borderRadius: 14,
            border: "1.5px solid #ede9f8", padding: "12px 14px",
          }}>
            {/* Numer + emoji */}
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(135deg,#ede9fe,#fce7f3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>
              {s.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>
                <span style={{ color: "#b0a8cc", marginRight: 6 }}>{i + 1}.</span>{s.title}
              </div>
              <div style={{ fontSize: 12, color: "#7c6f9f", lineHeight: 1.4 }}>{s.text}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}