"use client";

import Link from "next/link";
import { ChevronDown, Gift, Heart, Lock, MessagesSquare, MoonStar, Sparkles, UsersRound } from "lucide-react";
import { useState } from "react";
import { useLocale } from "next-intl";
import { isSupportedLocale } from "@/i18n/config";
import { premiumServices } from "@/i18n/premiumServices";

const services = [
  { key: "listen", icon: Heart, tone: "coral" },
  { key: "groupMessage", icon: MessagesSquare, tone: "sky" },
  { key: "sharedGift", icon: UsersRound, tone: "mint" },
  { key: "kindness", icon: Gift, tone: "gold" },
  { key: "heavenMessage", icon: MoonStar, tone: "lavender" },
] as const;

export default function PremiumServices() {
  const localeValue = useLocale();
  const locale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const copy = premiumServices[locale];
  const [openKey, setOpenKey] = useState<(typeof services)[number]["key"] | null>(null);

  return <main className="premium-services">
    <section className="premium-services__hero">
      <span className="premium-services__hero-glow premium-services__hero-glow--one" aria-hidden="true" />
      <span className="premium-services__hero-glow premium-services__hero-glow--two" aria-hidden="true" />
      <p className="premium-services__eyebrow">HappyDate</p>
      <h1>{copy.heroTitle}</h1>
      <p>{copy.heroDescription}</p>
    </section>

    <section className="premium-services__available" aria-labelledby="happydate-service-title">
      <div className="premium-services__available-orb" aria-hidden="true"><Sparkles /></div>
      <div className="premium-services__available-copy"><span>{copy.available}</span><h2 id="happydate-service-title">HappyDate</h2><h3>{copy.currentLead}</h3><p>{copy.currentDescription}</p></div>
      <Link href="/" className="premium-services__available-link">{copy.open}<span aria-hidden="true">→</span></Link>
    </section>

    <section className="premium-services__grid" aria-label="HappyDate services">
      {services.map(({ key, icon: Icon, tone }) => {
        const item = copy.services[key];
        const open = openKey === key;
        const id = `premium-service-${key}`;
        return <article key={key} className={`premium-service-card premium-service-card--${tone}${open ? " is-open" : ""}`}>
          <button type="button" className="premium-service-card__trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpenKey((value) => value === key ? null : key)}>
            <span className="premium-service-card__icon" aria-hidden="true"><Icon size={21} strokeWidth={1.9} /></span>
            <span className="premium-service-card__main"><span className="premium-service-card__topline"><strong>{item.title}</strong><em>{copy.soon}</em></span><span className="premium-service-card__lead">{item.lead}</span><span className="premium-service-card__description">{item.description}</span></span>
            <span className="premium-service-card__chevron" aria-label={open ? copy.collapse : copy.expand}><ChevronDown size={19} /></span>
          </button>
          <div id={id} className="premium-service-card__details" hidden={!open}><p>{item.detail}</p><span aria-hidden="true" /></div>
        </article>;
      })}
    </section>

    <section className="premium-services__privacy"><Lock size={20} aria-hidden="true" /><p>{copy.privacy} <Link href="/privacy">{copy.privacyLink}</Link></p></section>
  </main>;
}
