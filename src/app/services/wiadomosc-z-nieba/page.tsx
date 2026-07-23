import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services.phase3b.heaven");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/services/wiadomosc-z-nieba" },
    openGraph: {
      title: t("metaTitle"),
      description: t("ogDescription"),
      type: "website",
      url: "https://happydate.pl/services/wiadomosc-z-nieba",
    },
    twitter: { card: "summary_large_image" },
  };
}

const STEPS = [
  { n: "01", emoji: "✍️", key: "s1" },
  { n: "02", emoji: "📅", key: "s2" },
  { n: "03", emoji: "🔒", key: "s3" },
  { n: "04", emoji: "💌", key: "s4" },
] as const;

const PLANS = [
  { type: "list_cyfrowy", price: "99 zł", slug: "list-cyfrowy", hot: false },
  { type: "list_drukowany", price: "179 zł", slug: "list-drukowany", hot: false },
  { type: "video_cyfrowe", price: "199 zł", slug: "wideo-cyfrowe", hot: true },
  { type: "video_premium", price: "299 zł", slug: "wideo-premium", hot: false },
] as const;

const TRUST = [
  { emoji: "🔐", key: "encryption" },
  { emoji: "🇪🇺", key: "eu" },
  { emoji: "🕐", key: "storage" },
  { emoji: "👤", key: "guardian" },
] as const;

const TAG_KEYS = ["t1", "t2", "t3"] as const;
const FEATURE_KEYS = ["f1", "f2", "f3"] as const;
const LEGAL_KEYS = ["l1", "l2", "l3", "l4"] as const;
const FAQ_KEYS = ["f1", "f2", "f3", "f4", "f5"] as const;

export default async function WiadomoscZNiebaPage() {
  const t = await getTranslations("static.services.phase3b.heaven");
  const commonT = await getTranslations("static.services.phase3b");

  return (
    <main style={{ background: "#f0f9ff", minHeight: "100svh", paddingBottom: 100, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <section style={{ background: "linear-gradient(160deg,#0369a1 0%,#0ea5e9 55%,#38bdf8 100%)", padding: "28px 20px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.1)" }} />
        <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,215,0,.08)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.85)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, background: "rgba(255,255,255,.15)", padding: "4px 14px", borderRadius: 20 }}>
            {t("badge")}
          </div>

          <h1 style={{ fontSize: 25, fontWeight: 800, color: "#fff", margin: "0 0 8px", lineHeight: 1.25 }}>
            {t("title")}<br />
            <span style={{ color: "#fde68a" }}>{t("titleAccent")}</span>
          </h1>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,.88)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto 18px" }}>
            {t("subtitle")}
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {TAG_KEYS.map((key) => (
              <span key={key} style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,.18)", padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,.25)" }}>{t(`tags.${key}`)}</span>
            ))}
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="#pakiety" style={{ background: "#fde68a", color: "#1a1040", borderRadius: 20, padding: "11px 24px", fontSize: 14, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 14px rgba(0,0,0,.2)" }}>
              {t("order")}
            </Link>
            <Link href="#jak-to-dziala" style={{ background: "rgba(255,255,255,.2)", color: "#fff", borderRadius: 20, padding: "11px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,.3)" }}>
              {t("how")}
            </Link>
          </div>

          <div style={{ marginTop: 12 }}>
            <Link href="/services" style={{ fontSize: 12, color: "rgba(255,255,255,.55)", textDecoration: "none" }}>{commonT("backToServices")}</Link>
          </div>
        </div>
      </section>

      <section id="jak-to-dziala" style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          {t("how")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STEPS.map((step) => (
            <div key={step.n} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #bae6fd", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#7dd3fc" }}>{step.n}</span>
                <span style={{ fontSize: 20 }}>{step.emoji}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{t(`steps.${step.key}.title`)}</div>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{t(`steps.${step.key}.desc`)}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="pakiety" style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          {t("packages")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PLANS.map((plan) => (
            <div key={plan.type} style={{ background: "#fff", borderRadius: 16, border: plan.hot ? "2px solid #0ea5e9" : "1.5px solid #bae6fd", padding: "14px 16px", position: "relative" }}>
              {plan.hot && (
                <div style={{ position: "absolute", top: -10, right: 14, background: "linear-gradient(135deg,#0369a1,#0ea5e9)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 20 }}>
                  {commonT("mostPopular")}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1040" }}>{t(`plans.${plan.type}.name`)}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0ea5e9" }}>{plan.price}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
                {FEATURE_KEYS.map((key) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                    <span style={{ color: "#0ea5e9", fontSize: 13, flexShrink: 0 }}>✓</span> {t(`plans.${plan.type}.features.${key}`)}
                  </div>
                ))}
              </div>
              <Link href={`/services/wiadomosc-z-nieba/plans/${plan.slug}`} style={{
                display: "block", textAlign: "center",
                background: plan.hot ? "linear-gradient(135deg,#0369a1,#0ea5e9)" : "#f0f9ff",
                color: plan.hot ? "#fff" : "#0369a1",
                borderRadius: 12, padding: "10px",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
                border: plan.hot ? "none" : "1.5px solid #bae6fd",
              }}>
                {t("planCta")}
              </Link>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          {t("pricesNote")}
        </p>
      </section>

      <section style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 12 }}>
          {t("trust")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {TRUST.map((item) => (
            <div key={item.key} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #bae6fd", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 5 }}>{item.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1040", marginBottom: 2 }}>{t(`trustItems.${item.key}.title`)}</div>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{t(`trustItems.${item.key}.desc`)}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, background: "#fefce8", borderRadius: 14, border: "1.5px solid #fde68a", padding: "12px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>{t("legalTitle")}</div>
          <div style={{ fontSize: 11, color: "#78350f", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 3 }}>
            {LEGAL_KEYS.map((key) => (
              <span key={key}>• {t(`legal.${key}`)}</span>
            ))}
          </div>
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
                {t(`faqs.${key}.q`)} <span style={{ color: "#38bdf8", fontSize: 16, flexShrink: 0, marginLeft: 8 }}>›</span>
              </summary>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.6 }}>{t(`faqs.${key}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      <section style={{ padding: "20px 16px 0" }}>
        <div style={{ background: "linear-gradient(135deg,#0369a1,#0ea5e9,#38bdf8)", borderRadius: 20, padding: "20px 16px", color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{t("finalTitle")}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16, lineHeight: 1.5 }}>
            {t("finalText")}
          </div>
          <Link href="#pakiety" style={{ display: "inline-block", background: "#fde68a", color: "#1a1040", borderRadius: 14, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
            {t("choosePlan")}
          </Link>
        </div>
      </section>
    </main>
  );
}
