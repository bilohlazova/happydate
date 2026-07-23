"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type FormData = {
  type: "zwierzaki" | "dzieci" | "planeta";
  city: string;
  date: string;
  time: string;
  message: string;
  email: string;
  consent: boolean;
};

const TYPES = [
  { id: "zwierzaki", key: "animals", emoji: "🐾", bg: "#d1fae5", color: "#065f46" },
  { id: "dzieci", key: "children", emoji: "👶", bg: "#fce7f3", color: "#9d174d" },
  { id: "planeta", key: "planet", emoji: "🌍", bg: "#dbeafe", color: "#1e40af" },
] as const;

export default function GoodDeedForm() {
  const t = useTranslations("static.services.phase3b.goodDeed");
  const [form, setForm] = useState<FormData>({
    type: "zwierzaki", city: "", date: "", time: "",
    message: "", email: "", consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function handleText(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.currentTarget;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(false);
    try {
      const res  = await fetch("/api/good-deed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess(true);
        setForm(f => ({ ...f, city: "", date: "", time: "", message: "", email: "", consent: false }));
      } else {
        setError(t("genericError"));
      }
    } catch {
      setError(t("sendError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .gdf-root { font-family:'Plus Jakarta Sans',sans-serif; max-width:480px; margin:0 auto; }
        .gdf-label { font-size:11px; font-weight:700; color:#b0a8cc; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; display:block; }
        .gdf-input { width:100%; border:1.5px solid #e8e3f5; border-radius:12px; padding:10px 14px; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; color:#1a1040; background:#f8f7ff; outline:none; box-sizing:border-box; transition:border-color .15s; }
        .gdf-input:focus { border-color:#7c3aed; background:#fff; }
        .gdf-field { margin-bottom:12px; }
      `}</style>

      <form onSubmit={handleSubmit} className="gdf-root">

        {/* Заголовок */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1040", marginBottom: 4 }}>{t("formTitle")}</div>
          <div style={{ fontSize: 13, color: "#7c6f9f" }}>{t("formSubtitle")}</div>
        </div>

        {/* Вибір типу */}
        <div className="gdf-field">
          <span className="gdf-label">{t("typeLabel")}</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: type.id }))}
                style={{
                  border: form.type === type.id ? `2px solid ${type.color}` : "1.5px solid #e8e3f5",
                  background: form.type === type.id ? type.bg : "#f8f7ff",
                  borderRadius: 12, padding: "10px 4px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: 22 }}>{type.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: form.type === type.id ? type.color : "#7c6f9f" }}>{t(`directions.${type.key}.label`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Місто */}
        <div className="gdf-field">
          <label className="gdf-label">{t("city")}</label>
          <input className="gdf-input" type="text" name="city" value={form.city} onChange={handleText} placeholder={t("cityPlaceholder")} required />
        </div>

        {/* Дата + час в одному рядку */}
        <div className="gdf-field" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label className="gdf-label">{t("date")}</label>
            <input className="gdf-input" type="date" name="date" value={form.date} onChange={handleText} required />
          </div>
          <div>
            <label className="gdf-label">{t("time")}</label>
            <input className="gdf-input" type="time" name="time" value={form.time} onChange={handleText} />
          </div>
        </div>

        {/* Повідомлення */}
        <div className="gdf-field">
          <label className="gdf-label">{t("message")}</label>
          <textarea
            className="gdf-input"
            name="message" value={form.message} onChange={handleText}
            rows={3} placeholder={t("messagePlaceholder")}
            style={{ resize: "none", minHeight: 80 }}
          />
        </div>

        {/* Email */}
        <div className="gdf-field">
          <label className="gdf-label">{t("email")}</label>
          <input className="gdf-input" type="email" name="email" value={form.email} onChange={handleText} placeholder={t("emailPlaceholder")} required />
        </div>

        {/* Zgoda RODO */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, consent: !f.consent }))}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: form.consent ? "2px solid #7c3aed" : "1.5px solid #e8e3f5",
              background: form.consent ? "#7c3aed" : "#f8f7ff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 12, color: "#fff",
            }}
          >
            {form.consent ? "✓" : ""}
          </button>
          <input type="checkbox" checked={form.consent} onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))} required style={{ display: "none" }} />
          <span style={{ fontSize: 12, color: "#7c6f9f", lineHeight: 1.4 }}>
            {t("consent")}
          </span>
        </div>

        {/* Przycisk */}
        <button
          type="submit"
          disabled={loading || !form.consent}
          style={{
            width: "100%", border: "none",
            background: loading || !form.consent
              ? "#e8e3f5"
              : "linear-gradient(135deg,#ec4899,#f97316)",
            color: loading || !form.consent ? "#b0a8cc" : "#fff",
            borderRadius: 14, padding: "13px",
            fontSize: 15, fontWeight: 700,
            cursor: loading || !form.consent ? "not-allowed" : "pointer",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            transition: "all .15s",
          }}
        >
          {loading ? t("sending") : t("submit")}
        </button>

        {/* Feedback */}
        {success && (
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#15803d", background: "#dcfce7", borderRadius: 12, padding: "10px" }}>
            {t("success")}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 14, color: "#dc2626", background: "#fee2e2", borderRadius: 12, padding: "10px" }}>
            {error}
          </div>
        )}
      </form>
    </>
  );
}
