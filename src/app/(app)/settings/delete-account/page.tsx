"use client";

import { Download, HeartHandshake, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SettingsPageShell, SettingsSection } from "@/components/ui/SettingsPageShell";
import { supabase } from "@/lib/supabaseClient";

type DeleteState = "loading" | "ready" | "deleting" | "reauthentication" | "error";

export default function DeleteAccountPage() {
  const t = useTranslations("profile.deleteAccountSettings");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [state, setState] = useState<DeleteState>("loading");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user?.email) {
        setState("error");
        return;
      }
      setEmail(data.user.email);
      setState("ready");
    });
    return () => { active = false; };
  }, []);

  const confirmationMatches = confirmation.trim().toLocaleLowerCase() === email.toLocaleLowerCase();
  const canDelete = state === "ready" && understood && confirmationMatches;

  async function deleteAccount() {
    if (!canDelete) return;
    setState("deleting");
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setState("error");
      return;
    }

    try {
      const result = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation }),
      });
      if (!result.ok) {
        const body: unknown = await result.json().catch(() => null);
        if (body && typeof body === "object" && "error" in body && (body as { error?: unknown }).error === "reauthentication_required") {
          setState("reauthentication");
          return;
        }
        throw new Error("delete_failed");
      }
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  async function reauthenticate() {
    await supabase.auth.signOut({ scope: "local" });
    router.push("/auth/login?redirectTo=/settings/delete-account");
  }

  return (
    <SettingsPageShell
      backLabel={t("back")}
      title={t("title")}
      description={t("description")}
      icon={<Trash2 size={22} />}
    >
      <SettingsSection>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm" aria-hidden="true"><HeartHandshake size={22} /></span>
            <div><h2 className="font-extrabold text-slate-900">{t("pauseTitle")}</h2><p className="mt-1 text-sm leading-6 text-slate-700">{t("pauseDescription")}</p></div>
          </div>
          <Link href="/settings/export" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white px-4 text-sm font-extrabold text-amber-900">
            <Download size={17} aria-hidden="true" />{t("exportFirst")}
          </Link>
        </div>

        <div className="mt-5 rounded-3xl border border-rose-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 shrink-0 text-rose-600" size={21} aria-hidden="true" />
            <div><h2 className="font-extrabold text-slate-900">{t("permanentTitle")}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t("permanentDescription")}</p></div>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>{t("items.people")}</li><li>{t("items.memory")}</li><li>{t("items.files")}</li><li>{t("items.account")}</li>
          </ul>

          <label className="mt-5 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-950">
            <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-rose-600" />
            <span>{t("understand")}</span>
          </label>

          <label className="mt-5 block text-sm font-bold text-slate-800" htmlFor="delete-account-confirmation">{t("confirmLabel", { email })}</label>
          <input
            id="delete-account-confirmation"
            type="email"
            autoComplete="off"
            spellCheck={false}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={email || t("emailPlaceholder")}
            className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          />

          <button
            type="button"
            onClick={() => void deleteAccount()}
            disabled={!canDelete}
            aria-busy={state === "deleting"}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-extrabold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={18} aria-hidden="true" />{state === "deleting" ? t("deleting") : t("delete")}
          </button>
          {state === "reauthentication" && (
            <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-bold">{t("reauthTitle")}</p>
              <p>{t("reauthDescription")}</p>
              <button type="button" onClick={() => void reauthenticate()} className="mt-3 min-h-11 w-full rounded-xl bg-amber-900 px-4 font-extrabold text-white">{t("reauthAction")}</button>
            </div>
          )}
          {state === "error" && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{t("error")}</p>}
        </div>
      </SettingsSection>
    </SettingsPageShell>
  );
}
