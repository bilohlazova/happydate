"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FOOTER_LINKS } from "@/i18n/shellNavigation";

const linkCls =
  "underline underline-offset-2 decoration-white/70 hover:text-white hover:decoration-white transition-colors duration-200";

export default function Footer() {
  const translate = useTranslations("navigation");

  return (
    <footer
      className="bg-gradient-to-r from-sky-400 to-cyan-400 text-white text-xs"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="px-4 py-4 text-center">

        {/* Copyright */}
        <p className="opacity-90">
          {translate("footer.copyright", { year: new Date().getFullYear() })}
        </p>

        {/* Legal links */}
        <nav
          className="mt-2 flex justify-center gap-3 flex-wrap opacity-90"
          aria-label={translate("footer.navigationLabel")}
        >
          {FOOTER_LINKS.map((item, index) => (
            <span key={item.href} className="contents">
              {index > 0 && <span aria-hidden="true">·</span>}
              <Link href={item.href} className={linkCls}>
                {translate(`footer.${item.labelKey}`)}
              </Link>
            </span>
          ))}
        </nav>

      </div>
    </footer>
  );
}
