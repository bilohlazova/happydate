import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services.phase3b.groupMessage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/services/wiadomosc-grupowa" },
    robots: { index: true, follow: true },
  };
}

const STYLES = [
  { emoji: "😂", key: "humor", color: "#fef9c3", border: "#fde047", text: "#713f12" },
  { emoji: "😢", key: "tears", color: "#fce7f3", border: "#f9a8d4", text: "#9d174d" },
  { emoji: "🎉", key: "celebration", color: "#dbeafe", border: "#93c5fd", text: "#1e40af" },
  { emoji: "🎬", key: "film", color: "#e0f2fe", border: "#7dd3fc", text: "#075985" },
  { emoji: "🙏", key: "thanks", color: "#dcfce7", border: "#86efac", text: "#065f46" },
  { emoji: "💼", key: "farewell", color: "#f1f5f9", border: "#cbd5e1", text: "#334155" },
] as const;

const STEPS = [
  { n: "01", emoji: "🎯", key: "s1" },
  { n: "02", emoji: "🔗", key: "s2" },
  { n: "03", emoji: "✂️", key: "s3" },
  { n: "04", emoji: "🎁", key: "s4" },
] as const;

const PACKAGES = [
  { key: "mini", price: "79 zł", highlight: false },
  { key: "standard", price: "149 zł", highlight: true },
  { key: "premium", price: "279 zł", highlight: false },
] as const;

const OCCASIONS = ["o1", "o2", "o3", "o4", "o5", "o6", "o7", "o8"] as const;
const FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5"] as const;
const FAQ_KEYS = ["f1", "f2", "f3", "f4", "f5"] as const;

export default async function WiadomoscGrupowaPage() {
  const t = await getTranslations("static.services.phase3b.groupMessage");
  const commonT = await getTranslations("static.services.phase3b");

  return (
    <main style={{ background: "#f0f9ff", minHeight: "100svh", paddingBottom: 100, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <section style={{
        background: "linear-gradient(160deg,#1e6fa8 0%,#42a5e8 55%,#29b6f6 100%)",
        padding: "32px 20px 28px", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.1)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,215,0,.1)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.85)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, background: "rgba(255,255,255,.2)", padding: "4px 14px", borderRadius: 20 }}>
            {t("badge")}
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 10px", lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
            {t("title")}<br />{t("titleSecond")}
          </h1>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,.9)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto 18px" }}>
            {t("subtitle")}
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            {["🇵🇱", "🇩🇪", "🇬🇧", "🇺🇸", "🇫🇷", "🇮🇹", "🇺🇦", "🇯🇵"].map((flag) => (
              <div key={flag} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "2px solid rgba(255,255,255,.3)" }}>
                {flag}
              </div>
            ))}
          </div>

          <Link href="#pakiety" style={{ display: "inline-block", background: "#ffd600", color: "#1a1040", borderRadius: 20, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
            {t("orderVideo")}
          </Link>

          <div style={{ marginTop: 12 }}>
            <Link href="/services" style={{ fontSize: 12, color: "rgba(255,255,255,.6)", textDecoration: "none" }}>
              {commonT("backToServices")}
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          {t("occasionsTitle")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {OCCASIONS.map((key) => (
            <div key={key} style={{ fontSize: 12, fontWeight: 600, color: "#0369a1", background: "#e0f2fe", border: "1.5px solid #7dd3fc", borderRadius: 20, padding: "5px 12px", whiteSpace: "nowrap" }}>
              {t(`occasions.${key}`)}
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          {t("stylesTitle")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STYLES.map((style) => (
            <div key={style.key} style={{ background: style.color, borderRadius: 16, border: `1.5px solid ${style.border}`, padding: "12px" }}>
              <div style={{ fontSize: 24, marginBottom: 5 }}>{style.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: style.text, marginBottom: 3 }}>{t(`styles.${style.key}.name`)}</div>
              <div style={{ fontSize: 11, color: style.text, opacity: 0.8, lineHeight: 1.4 }}>{t(`styles.${style.key}.desc`)}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          {commonT("howItWorks")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STEPS.map((step) => (
            <div key={step.n} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #bae6fd", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg,#bae6fd,#fef08a)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#0369a1" }}>{step.n}</span>
                <span style={{ fontSize: 18 }}>{step.emoji}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{t(`steps.${step.key}.title`)}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{t(`steps.${step.key}.desc`)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "20px 16px 8px" }} id="pakiety">
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          {t("packagesTitle")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PACKAGES.map((pack) => (
            <div key={pack.key} style={{
              background: "#fff", borderRadius: 18,
              border: pack.highlight ? "2px solid #42a5e8" : "1.5px solid #bae6fd",
              padding: "16px", position: "relative",
            }}>
              {pack.highlight && (
                <div style={{ position: "absolute", top: -10, right: 16, background: "linear-gradient(135deg,#1e6fa8,#42a5e8)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 20 }}>
                  {commonT("mostPopular")}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1040" }}>{t(`packages.${pack.key}.name`)}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{t(`packages.${pack.key}.clips`)}{t("clipsSeparator")}{t(`packages.${pack.key}.time`)}</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#42a5e8" }}>{pack.price}</div>
              </div>
              <div style={{ height: 1, background: "#bae6fd", marginBottom: 10 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                {FEATURE_KEYS.map((key) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#475569" }}>
                    <span style={{ color: "#22c55e", fontSize: 14, flexShrink: 0 }}>✓</span> {t(`packages.${pack.key}.features.${key}`)}
                  </div>
                ))}
              </div>
              <Link href="/survey?flow=group-message" style={{
                display: "block", textAlign: "center",
                background: pack.highlight ? "linear-gradient(135deg,#1e6fa8,#42a5e8)" : "#e0f2fe",
                color: pack.highlight ? "#fff" : "#0369a1",
                borderRadius: 12, padding: "11px",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>
                {t("orderPackage", { name: t(`packages.${pack.key}.name`) })}
              </Link>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", textAlign: "center" }}>
          {t("quoteText")}{" "}
          <Link href="/survey?flow=group-message-custom" style={{ color: "#42a5e8", fontWeight: 700, textDecoration: "none" }}>
            {t("quoteCta")}
          </Link>
        </div>
      </section>

      <section style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          {commonT("faq")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ_KEYS.map((key) => (
            <details key={key} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #bae6fd", padding: "12px 14px" }}>
              <summary style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {t(`faqs.${key}.q`)} <span style={{ color: "#42a5e8", fontSize: 16, flexShrink: 0, marginLeft: 8 }}>›</span>
              </summary>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>{t(`faqs.${key}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      <section style={{ padding: "20px 16px 0" }}>
        <div style={{ background: "linear-gradient(135deg,#1e6fa8,#42a5e8,#29b6f6)", borderRadius: 20, padding: "22px 16px", color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>🎬</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{t("ctaTitle")}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16, lineHeight: 1.5 }}>
            {t("ctaText")}
          </div>
          <Link href="/survey?flow=group-message" style={{ display: "inline-block", background: "#ffd600", color: "#1a1040", borderRadius: 14, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>
            {t("orderVideo")}
          </Link>
        </div>
      </section>
    </main>
  );
}
