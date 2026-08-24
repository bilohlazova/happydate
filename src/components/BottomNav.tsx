"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BOTTOM_NAV_ITEMS, isAppShellPath } from "@/i18n/shellNavigation";

export default function BottomNav() {
  const translate = useTranslations("navigation");
  const pathname = usePathname();
  const router = useRouter();
  if (!isAppShellPath(pathname)) return null;

  return (
    <nav
      className="hd-bottom-nav"
      aria-label={translate("bottom.navigationLabel")}
    >
      <div className="hd-bottom-nav__inner">
        {BOTTOM_NAV_ITEMS.map((item) => {
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
                {translate(`bottom.${item.labelKey}`)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
