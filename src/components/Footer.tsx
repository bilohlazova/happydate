"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FOOTER_LINKS } from "@/i18n/shellNavigation";

const linkCls =
  "underline underline-offset-2 decoration-slate-300 hover:text-cyan-700 hover:decoration-cyan-500 transition-colors duration-200";

export default function Footer() {
  const translate = useTranslations("navigation");
  return (
    <footer
      className="border-t border-slate-200/80 bg-white text-slate-500 text-xs"
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
                {translate(`footer.${item.labelKey}` as never)}
              </Link>
            </span>
          ))}
        </nav>

      </div>
    </footer>
  );
}
