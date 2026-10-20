import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SettingsPageShell } from "@/components/ui/SettingsPageShell";
import { ProactivitySettings } from "@/components/settings/ProactivitySettings";

export default function ProactivitySettingsPage() {
  const t = useTranslations("profile");
  const locale = useLocale();
  const copy = ({ uk: ["Проактивність", "Оберіть, коли Happy може нагадувати про важливе."], pl: ["Proaktywność", "Wybierz, kiedy Happy może przypominać o ważnych sprawach."], en: ["Proactivity", "Choose when Happy should proactively reach out."], de: ["Proaktivität", "Wähle, wann Happy dich proaktiv an Wichtiges erinnern darf."], ru: ["Проактивность", "Выберите, когда Happy может напомнить о важном."] } as const)[locale as "uk" | "pl" | "en" | "de" | "ru"] ?? ["Proactivity", "Choose when Happy should proactively reach out."];
  return <SettingsPageShell backLabel={t("settings.title")} title={copy[0]} description={copy[1]} icon={<Sparkles size={22} />}><ProactivitySettings /></SettingsPageShell>;
}
