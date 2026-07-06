"use client";

import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    { href: "/",          label: "Start",    icon: "🏠" },
    { href: "/people",    label: "Osoby",    icon: "👥" },
    { href: "/notes",     label: "Notatki",  icon: "📝" },
    { href: "/dashboard", label: "Kalendarz", icon: "📅" },
    { href: "/profile",   label: "Profil",   icon: "👤" },
  ];

  return (
    <nav className="hd-bottom-nav" aria-label="Główna nawigacja">
      <div className="hd-bottom-nav__inner">
        {items.map((item) => {
          // Точне порівняння для "/" щоб не підсвічувати все підряд
          const active = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`hd-bottom-nav__item${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="hd-bottom-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="hd-bottom-nav__label">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
