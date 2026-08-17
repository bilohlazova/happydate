"use client";

import { Clock3, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SettingsPageShell, SettingsSection } from "@/components/ui/SettingsPageShell";
import { isSupportedLocale } from "@/i18n/config";
import { supabase } from "@/lib/supabaseClient";

type PageState = "loading" | "ready" | "revoking" | "done" | "error";

export default function SessionsSettingsPage() {
  const t = useTranslations("profile.sessionSettings");
  const localeValue = useLocale();
  const locale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const [state, setState] = useState<PageState>("loading");
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setState("error");
        return;
      }
      setLastSignInAt(data.user.last_sign_in_at ?? null);
      setState("ready");
    });
    return () => { active = false; };
  }, []);

  async function revokeOtherSessions() {
    if (state === "revoking") return;
    setState("revoking");
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setState(error ? "error" : "done");
  }

  const formattedLastSignIn = lastSignInAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastSignInAt))
    : t("unknownTime");

  return (
    <SettingsPageShell
      backLabel={t("back")}
      title={t("title")}
      description={t("description")}
      icon={<MonitorSmartphone size={22} />}
    >
      <SettingsSection>
        <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm" aria-hidden="true"><ShieldCheck size={22} /></span>
            <div>
              <h2 className="font-extrabold text-slate-900">{t("currentTitle")}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{t("currentDescription")}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
            <Clock3 size={17} className="text-sky-600" aria-hidden="true" />
            <span>{t("lastSignIn", { date: formattedLastSignIn })}</span>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-extrabold text-slate-900">{t("othersTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("othersDescription")}</p>
          <button
            type="button"
            onClick={() => void revokeOtherSessions()}
            disabled={state === "loading" || state === "revoking"}
            aria-busy={state === "revoking"}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={18} aria-hidden="true" />
            {state === "revoking" ? t("revoking") : t("revokeOthers")}
          </button>
          {state === "done" && <p role="status" className="mt-3 text-sm font-bold text-emerald-700">{t("done")}</p>}
          {state === "error" && <p role="alert" className="mt-3 text-sm font-bold text-rose-600">{t("error")}</p>}
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">{t("tokenNote")}</p>
      </SettingsSection>
    </SettingsPageShell>
  );
}
