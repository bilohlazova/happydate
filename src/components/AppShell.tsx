"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const APP_ROUTES = ["/people", "/notes", "/dashboard", "/profile"];

const APP_NAV_ITEMS = [
  { href: "/", label: "Start", icon: "🏠" },
  { href: "/people", label: "Osoby", icon: "👥" },
  { href: "/notes", label: "Notatki", icon: "📝" },
  { href: "/dashboard", label: "Kalendarz", icon: "📅" },
  { href: "/profile", label: "Profil", icon: "👤" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppRoute = APP_ROUTES.some((route) => pathname.startsWith(route));

  if (isAppRoute) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <DesktopAppNav pathname={pathname} />
        <main className="flex-1 overflow-x-clip pb-[calc(var(--hd-nav-height)+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-x-clip">{children}</main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}

function DesktopAppNav({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-slate-200/80 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl md:block">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-black text-slate-950">
          🎁 HappyDate
        </Link>
        <nav className="flex items-center gap-1" aria-label="Nawigacja aplikacji">
          {APP_NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition ${
                  active
                    ? "bg-sky-500 text-white shadow-[0_8px_20px_rgba(14,165,233,0.22)]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
