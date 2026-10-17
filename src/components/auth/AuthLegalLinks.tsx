"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function AuthLegalLinks() {
  const translate = useTranslations("navigation.footer");

  return (
    <p className="mt-5 text-center text-xs leading-5 text-slate-500">
      <Link href="/regulamin" className="ml-1 text-sky-700 underline-offset-2 hover:underline">
        {translate("terms")}
      </Link>
      <span aria-hidden="true"> · </span>
      <Link href="/privacy" className="text-sky-700 underline-offset-2 hover:underline">
        {translate("privacy")}
      </Link>
    </p>
  );
}
