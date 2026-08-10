import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function SettingsPageShell({ backLabel, title, description, icon, children }: { backLabel: string; title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return (
    <main className="hd-page-shell">
      <span className="hd-page-shell__orb" aria-hidden="true" />
      <div className="hd-page-shell__container">
        <section className="hd-page-card">
          <header className="hd-page-card__header">
            <Link href="/profile" className="hd-page-back"><ArrowLeft size={15} aria-hidden="true" />{backLabel}</Link>
            <div className="hd-page-heading">
              <span className="hd-page-heading__icon" aria-hidden="true">{icon}</span>
              <div><h1>{title}</h1><p>{description}</p></div>
            </div>
          </header>
          <div className="hd-page-card__body">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function SettingsSection({ title, description, children }: { title?: string; description?: string; children: ReactNode }) {
  return (
    <section className="hd-settings-section">
      {title && <h2 className="hd-settings-section__title">{title}</h2>}
      {description && <p className="hd-settings-section__description">{description}</p>}
      {children}
    </section>
  );
}
