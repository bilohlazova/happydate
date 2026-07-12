"use client";

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
  },
  {
    icon: Pencil,
    title: "Dodaj ręcznie",
    description: "Wpisz dane samodzielnie",
  },
  {
    icon: QrCode,
    title: "Zeskanuj wizytówkę",
    description: "AI odczyta dane",
  },
  {
    icon: LinkIcon,
    title: "Link / QR",
    description: "Dodaj z linku lub QR",
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
        className="inline-flex h-10 items-center gap-2 rounded-[0.9rem] bg-blue-600 px-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 active:scale-[0.98] sm:h-11 sm:px-3.5"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserRoundPlus className="h-[18px] w-[18px]" strokeWidth={2.6} />
        Dodaj osobę
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-14 z-30 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
        >
          <AddPersonMenuItems />
        </div>
      )}
    </div>
  );
}

export function AddPersonMenuItems() {
  return (
    <div className="grid gap-1">
      {MENU_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.title}
            type="button"
            className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-blue-50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Icon className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <span>
              <span className="block text-sm font-extrabold text-slate-950">
                {item.title}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-slate-500">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
