const t = (key, values) => (values && values.name ? `${key}:${values.name}` : key);
export const useLocale = () => "uk";
export const useTranslations = () => t;
