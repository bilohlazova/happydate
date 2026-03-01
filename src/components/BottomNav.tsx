"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleAddNoteClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (pathname === "/dashboard") {
      window.dispatchEvent(new CustomEvent("happydate:add-note"));
    } else {
      router.push("/dashboard");

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("happydate:add-note"));
      }, 250);
    }
  };

  const items = [
    {
      type: "link",
      href: "/dashboard",
      label: "Start",
      icon: "🏠",
      isActive: pathname === "/dashboard",
    },
    {
      type: "link",
      href: "/people",
      label: "Osoby",
      icon: "👥",
      isActive: pathname.startsWith("/people"),
    },
    {
      type: "action",
      label: "Notatka",
      icon: "➕",
      onClick: handleAddNoteClick,
      isActive: false,
    },
    {
      type: "link",
      href: "/dashboard#calendar",
      label: "Kalendarz",
      icon: "📅",
      isActive: pathname === "/dashboard",
    },
    {
      type: "link",
      href: "/profile",
      label: "Profil",
      icon: "👤",
      isActive: pathname.startsWith("/profile"),
    },
  ];

  return (
    <nav
      className="
        bg-white border-t border-slate-200
        flex justify-around items-center
        h-16
        shadow-[0_-4px_20px_rgba(0,0,0,0.05)]
      "
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map((item) => {
        const active = item.isActive;

        const content = (
          <>
            <span
              className={`
                text-xl transition-colors
                ${active ? "text-pink-600" : "text-slate-400"}
              `}
            >
              {item.icon}
            </span>

            <span
              className={`
                text-[11px] mt-0.5 transition-colors
                ${active ? "text-pink-600 font-medium" : "text-slate-400"}
              `}
            >
              {item.label}
            </span>
          </>
        );

        if (item.type === "action") {
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center flex-1 h-full active:scale-95 transition-transform"
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href!}
            className="flex flex-col items-center justify-center flex-1 h-full active:scale-95 transition-transform"
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}