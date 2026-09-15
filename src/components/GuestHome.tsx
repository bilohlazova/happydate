"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** Guest-only presentation. It has no repository or persistence access. */
export default function GuestHome() {
  const t = useTranslations("home.guest");
  return <div className="hd-screen"><div className="mx-auto w-full max-w-[760px] px-4 pb-8 pt-8 sm:px-6 sm:pt-12"><section className="rounded-[1.5rem] border border-sky-100 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,.06)] sm:p-10"><p className="text-xs font-black uppercase tracking-[.16em] text-sky-600">HappyDate</p><h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-5xl">{t("title")}</h1><p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{t("description")}</p><div className="mt-6 flex flex-col gap-2 sm:flex-row"><Link href="/auth/register" className="hd-button hd-button-primary justify-center">{t("register")}</Link><Link href="/auth/login" className="hd-button justify-center border border-slate-200 bg-white text-slate-700">{t("login")}</Link></div></section><section className="mt-5 rounded-[1.25rem] border border-dashed border-sky-200 bg-sky-50/70 p-5"><h2 className="text-lg font-black text-slate-900">{t("previewTitle")}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t("previewDescription")}</p></section></div></div>;
}
