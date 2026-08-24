"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BOTTOM_NAV_ITEMS, isAppShellPath } from "@/i18n/shellNavigation";

export default function DesktopAppNav() {
  const translate = useTranslations("navigation");
  const pathname = usePathname();
  if (!isAppShellPath(pathname)) return null;

  return (
    <nav
      className="hidden border-b border-slate-200/70 bg-white/75 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl md:flex"
      aria-label={translate("bottom.navigationLabel")}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2 px-6 py-2.5">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                active
                  ? "bg-sky-100 text-sky-700 shadow-sm ring-1 ring-sky-200/80"
                  : "text-slate-600 hover:bg-white hover:text-sky-700"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{translate(`bottom.${item.labelKey}`)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
