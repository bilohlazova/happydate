export const HEADER_NAV_ITEMS = [
  { href: "/services", labelKey: "services" },
  { href: "/about", labelKey: "about" },
] as const;

export const BOTTOM_NAV_ITEMS = [
  { href: "/", labelKey: "home", icon: "🏠" },
  { href: "/people", labelKey: "people", icon: "👥" },
  { href: "/notes", labelKey: "notes", icon: "📝" },
  { href: "/dashboard", labelKey: "calendar", icon: "📅" },
] as const;

export const FOOTER_LINKS = [
  { href: "/about", labelKey: "about" },
  { href: "/contact", labelKey: "contact" },
  { href: "/regulamin", labelKey: "terms" },
  { href: "/privacy", labelKey: "privacy" },
  { href: "/regulamin-zwrotow", labelKey: "returns" },
] as const;

const APP_SHELL_PREFIXES = [
  "/people",
  "/notes",
  "/dashboard",
  "/profile",
  "/care",
  "/gift",
  "/settings",
  "/survey",
  "/services",
] as const;

export function isAppShellPath(pathname: string): boolean {
  return pathname === "/" || APP_SHELL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
