"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Home", icon: "🏠" },
    { href: "/calendar", label: "Calendar", icon: "📅" },
    { href: "/add", label: "Add", icon: "➕" },
    { href: "/ideas", label: "Ideas", icon: "🎁" },
    { href: "/profile", label: "Profile", icon: "👤" },
  ];

  return (
    <nav className="
      fixed bottom-0 left-0 right-0
      bg-white border-t border-slate-200
      flex justify-around items-center
      h-16
      z-50
    ">
      {items.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="
              flex flex-col items-center justify-center
              text-xs
              flex-1
            "
          >
            <span className={active ? "text-pink-600" : "text-slate-400"}>
              {item.icon}
            </span>

            <span
              className={
                active
                  ? "text-pink-600 font-medium"
                  : "text-slate-400"
              }
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}