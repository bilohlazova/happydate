export const HEADER_NAV_ITEMS = [
  { href: "/services", labelKey: "services" },
  { href: "/reviews", labelKey: "reviews" },
  { href: "/about", labelKey: "about" },
] as const;

export const BOTTOM_NAV_ITEMS = [
  { href: "/", labelKey: "home", icon: "🏠" },
  { href: "/people", labelKey: "people", icon: "👥" },
  { href: "/notes", labelKey: "notes", icon: "📝" },
  { href: "/dashboard", labelKey: "calendar", icon: "📅" },
  { href: "/profile", labelKey: "profile", icon: "👤" },
] as const;

export const FOOTER_LINKS = [
  { href: "/regulamin", labelKey: "terms" },
  { href: "/privacy", labelKey: "privacy" },
  { href: "/regulamin-zwrotow", labelKey: "returns" },
] as const;
