import { Globe2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SettingsPageShell } from "@/components/ui/SettingsPageShell";
import { OccasionCountrySettings } from "@/components/settings/OccasionCountrySettings";

export default function OccasionSettingsPage() {
  const t = useTranslations("profile");
  const locale = useLocale();
  const copy = ({ uk: ["Локальні події", "Оберіть країну для локальних подій Happy."], pl: ["Lokalne okazje", "Wybierz kraj dla lokalnych okazji Happy."], en: ["Local occasions", "Choose a country for Happy local occasions."], de: ["Lokale Anlässe", "Wähle ein Land für lokale Anlässe von Happy."], ru: ["Местные события", "Выберите страну для местных событий Happy."] } as const)[locale as "uk" | "pl" | "en" | "de" | "ru"] ?? ["Local occasions", "Choose a country for Happy local occasions."];
  return <SettingsPageShell backLabel={t("settings.title")} title={copy[0]} description={copy[1]} icon={<Globe2 size={22} />}><OccasionCountrySettings /></SettingsPageShell>;
}
