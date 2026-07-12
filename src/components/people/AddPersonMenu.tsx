"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Contact,
  Link as LinkIcon,
  Pencil,
  QrCode,
  UserRoundPlus,
} from "lucide-react";

const MENU_ITEMS = [
  {
    icon: Contact,
    title: "Importuj z kontaktów",
    description: "Wybierz osoby z telefonu",
    href: "/people/add?mode=contacts",
  },
  {
    icon: Pencil,
    title: "Dodaj ręcznie",
    description: "Wpisz dane samodzielnie",
    href: "/people/add?mode=manual",
  },
  {
    icon: QrCode,
    title: "Zeskanuj wizytówkę",
    description: "Dodaj zdjęcie i dane",
    href: "/people/add?mode=card",
  },
  {
    icon: LinkIcon,
    title: "Link / QR",
    description: "Dodaj z linku lub QR",
    href: "/people/add?mode=link",
  },
];

export function AddPersonMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(14,165,233,0.24)] transition hover:from-sky-400 hover:to-cyan-400 active:scale-[0.98] sm:h-11 sm:px-3.5"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserRoundPlus className="h-[18px] w-[18px]" strokeWidth={2.6} />
        Dodaj osobę
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-30 w-[min(18.5rem,calc(100vw-2rem))] overflow-hidden rounded-[1.15rem] border border-sky-100 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.16)]"
        >
          <AddPersonMenuItems />
        </div>
      )}
    </div>
  );
}

export function AddPersonMenuItems() {
  return (
    <div className="grid gap-0.5">
      {MENU_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.title}
            href={item.href}
            className="flex min-h-14 w-full items-center gap-3 rounded-[0.9rem] px-2.5 py-2 text-left transition hover:bg-sky-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] bg-sky-50 text-sky-600">
              <Icon className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.82rem] font-extrabold leading-4 text-slate-950">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-[0.7rem] font-semibold leading-3.5 text-slate-500">
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
