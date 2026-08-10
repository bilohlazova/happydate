"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Download, FileJson2, LockKeyhole, ShieldCheck } from "lucide-react";
import { buildHappyDateAccountExport, downloadHappyDateAccountExport } from "@/lib/repositories/accountDataExport.repository";
import { SettingsPageShell, SettingsSection } from "@/components/ui/SettingsPageShell";

export default function AccountExportPage() {
  const t = useTranslations("profile.exportSettings");
  const [status, setStatus] = useState<"idle" | "preparing" | "done" | "error">("idle");

  async function download() {
    if (status === "preparing") return;
    setStatus("preparing");
    try {
      downloadHappyDateAccountExport(await buildHappyDateAccountExport());
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <SettingsPageShell backLabel={t("back")} title={t("title")} description={t("description")} icon={<Download size={22} />}>
      <SettingsSection>
        <div className="export-trust-hero">
          <span aria-hidden="true">💛</span>
          <div><strong>{t("ownershipTitle")}</strong><p>{t("ownershipDescription")}</p></div>
        </div>
        <div className="export-content-card rounded-2xl p-4 text-sm leading-6 text-slate-700">
          <p className="flex items-center gap-2 font-extrabold text-slate-900"><ShieldCheck size={18} className="text-sky-600" aria-hidden="true" />{t("includedTitle")}</p>
          <p className="mt-1">{t("included")}</p>
        </div>
        <div className="export-safety-grid">
          <div><FileJson2 aria-hidden="true" /><strong>{t("formatTitle")}</strong><span>{t("formatDescription")}</span></div>
          <div><LockKeyhole aria-hidden="true" /><strong>{t("safetyTitle")}</strong><span>{t("sensitiveNote")}</span></div>
        </div>
        <button type="button" onClick={() => void download()} disabled={status === "preparing"} aria-busy={status === "preparing"} className="hd-button export-download-button mt-6 min-h-12 w-full text-white disabled:opacity-50">
          {status === "preparing" ? t("preparing") : t("download")}
        </button>
        {status === "done" && <p role="status" className="mt-3 text-sm font-bold text-emerald-700">{t("done")}</p>}
        {status === "error" && <p role="alert" className="mt-3 text-sm font-bold text-rose-600">{t("error")}</p>}
      </SettingsSection>
    </SettingsPageShell>
  );
}
