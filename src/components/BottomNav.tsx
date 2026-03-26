"use client";

import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    { href: "/dashboard", label: "Start", icon: "🏠" },
    { href: "/people", label: "Osoby", icon: "👥" },
    { href: "/notes", label: "Notatki", icon: "📝" },
    { href: "/dashboard#calendar", label: "Kalendarz", icon: "📅" },
    { href: "/profile", label: "Profil", icon: "👤" },
  ];

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0
        bg-white border-t border-slate-200
        flex justify-around items-center
        h-16 z-50
      "
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="flex flex-col items-center justify-center flex-1 h-full active:scale-95 transition-transform"
          >
            <span className={active ? "text-pink-600 text-xl" : "text-slate-400 text-xl"}>
              {item.icon}
            </span>

            <span
              className={
                active
                  ? "text-pink-600 text-[11px] font-medium"
                  : "text-slate-400 text-[11px]"
              }
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}