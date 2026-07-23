"use client";

import { useTranslations } from "next-intl";

const STEPS = [
  { emoji: "🎯", key: "s1" },
  { emoji: "📅", key: "s2" },
  { emoji: "🎁", key: "s3" },
  { emoji: "✨", key: "s4" },
] as const;

export default function GoodDeedSteps() {
  const t = useTranslations("static.services.phase3b.goodDeed");

  return (
    <section style={{ background: "#fff", padding: "24px 16px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1040", textAlign: "center", marginBottom: 16 }}>
        {t("stepsTitle")}
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
                <span style={{ color: "#b0a8cc", marginRight: 6 }}>{i + 1}.</span>{t(`steps.${s.key}.title`)}
              </div>
              <div style={{ fontSize: 12, color: "#7c6f9f", lineHeight: 1.4 }}>{t(`steps.${s.key}.desc`)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
