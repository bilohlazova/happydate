"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // функція для відкриття modal Add (через custom event)
  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // якщо ми вже на dashboard — відкриваємо modal
    if (pathname === "/dashboard") {
      window.dispatchEvent(new CustomEvent("happydate:add-event"));
    } else {
      // якщо не на dashboard — переходимо і відкриваємо modal
      router.push("/dashboard");

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("happydate:add-event"));
      }, 300);
    }
  };

  const items = [
    {
      href: "/dashboard",
      label: "Start",
      icon: "🏠",
      isActive: pathname === "/dashboard",
    },
    {
      href: "/dashboard#calendar",
      label: "Kalendarz",
      icon: "📅",
      isActive: pathname === "/dashboard",
    },
    {
      href: "#add",
      label: "Dodaj",
      icon: "➕",
      isActive: false,
      onClick: handleAddClick,
    },
    {
      href: "/ideas",
      label: "Pomysły",
      icon: "🎁",
      isActive: pathname.startsWith("/ideas"),
    },
    {
      href: "/profile",
      label: "Profil",
      icon: "👤",
      isActive: pathname.startsWith("/profile"),
    },
  ];

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0
        bg-white/95 backdrop-blur-md
        border-t border-slate-200
        flex justify-around items-center
        h-16
        z-50
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
                text-lg transition-colors
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

        if (item.onClick) {
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className="
                flex flex-col items-center justify-center
                flex-1 h-full
                active:scale-95 transition-transform
              "
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className="
              flex flex-col items-center justify-center
              flex-1 h-full
              active:scale-95 transition-transform
            "
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}