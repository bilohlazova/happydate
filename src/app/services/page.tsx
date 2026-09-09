import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Gift, Heart, Lock, MessageCircle, MessagesSquare, Moon, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { heart: Heart, message: MessageCircle, messages: MessagesSquare, users: Users, gift: Gift, moon: Moon, lock: Lock };
const getServicesTranslations = getTranslations as unknown as (namespace: string) => Promise<(key: string) => string>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServicesTranslations("services");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: true, follow: true },
    alternates: { canonical: "/services" },
  };
}

export default async function ServicesPage() {
  const t = await getServicesTranslations("services");
  const futureServices = ["listen", "groupMessage", "sharedGift", "kindness", "heavenMessage"] as const;
  return (
    <main className="services-page">
      <section className="services-soul__hero">
        <p className="services-soul__eyebrow">{t("hero.eyebrow")}</p>
        <h1>{t("hero.title")}</h1>
        <p>{t("hero.description")}</p>
      </section>

      <section className="services-soul__current" aria-labelledby="current-care-title">
        <div className="services-soul__care-copy">
          <span className="services-soul__status">{t("current.badge")}</span>
          <p className="services-soul__eyebrow">{t("current.eyebrow")}</p>
          <h2 id="current-care-title">{t("current.title")}</h2>
          <p>{t("current.description")}</p>
          <div className="services-soul__features">
            {(["people", "dates", "memories", "happy"] as const).map((key) => <span key={key}>✓ {t(`current.features.${key}`)}</span>)}
          </div>
          <Link href="/">{t("current.cta")}</Link>
        </div>
        <div className="services-soul__care-heart" aria-hidden="true">
          <Heart aria-hidden="true" size={54} strokeWidth={1.5} />
          <small>{t("current.visualLabel")}</small>
        </div>
      </section>

      <section className="services-soul__future" aria-labelledby="future-services-title">
        <div className="services-soul__section-heading">
          <p className="services-soul__eyebrow">{t("future.eyebrow")}</p>
          <h2 id="future-services-title">{t("future.title")}</h2>
          <p>{t("future.description")}</p>
        </div>

        <div className="services-soul__future-grid">
          {futureServices.map((key) => {
            const Icon = ICONS[t(`icons.${key}`)];
            return <article key={key}>
              <span className="services-soul__future-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
              <div>
                <span className="services-soul__soon-badge">{t("future.status")}</span>
                <h3>{t(`future.${key}.title`)}</h3>
                <p>{t(`future.${key}.description`)}</p>
              </div>
            </article>;
          })}
        </div>
      </section>

      <section className="services-soul__principle">
        <Lock aria-hidden="true" size={24} strokeWidth={1.8} />
        <div>
          <p className="services-soul__eyebrow">{t("privacy.eyebrow")}</p>
          <h2>{t("privacy.title")}</h2>
          <p>{t("privacy.description")}</p>
          <div className="services-soul__trust">{(["control", "private", "context"] as const).map((key) => <span key={key}>{t(`privacy.points.${key}`)}</span>)}</div>
        </div>
      </section>
    </main>
  );
}
