"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function AuthLegalLinks({ consent = false }: { consent?: boolean }) {
  const translate = useTranslations("navigation.footer");
  const authTranslate = useTranslations("auth.register");

  if (consent) {
    return (
      <p className="auth-legal-consent text-xs leading-5 text-slate-500">
        {authTranslate("legalPrefix")} {" "}
        <Link href="/regulamin" className="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
          {authTranslate("legalTerms")}
        </Link>{" "}
        {authTranslate("legalMiddle")} {" "}
        <Link href="/privacy" className="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
          {authTranslate("legalPrivacy")}
        </Link>.
      </p>
    );
  }

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
