// src/components/FloatingActions.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function FloatingActions() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const phoneNumber = "+48123456789";

  /* Закриття при кліку поза панеллю */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Nie udało się skopiować numeru");
    }
  }

  return (
    <div
      ref={panelRef}
      className="fixed left-4 z-[60] flex flex-col gap-3"
      style={{
        /* 64px = BottomNav (h-16) + 16px відступ */
        bottom: "calc(80px + env(safe-area-inset-bottom))",
      }}
    >
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Kontakt HappyDate"
        className="
          flex h-14 w-14 items-center justify-center rounded-full
          bg-white shadow-lg
          border border-slate-200
          backdrop-blur-md
          active:scale-95 transition
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-7 w-7 text-emerald-600"
        >
          <path d="M2.003 5.884c-.06-1.09.78-2.02 1.87-2.02H6.2c.86 0 1.6.61 1.76 1.45l.36 1.93c.14.76-.26 1.52-.97 1.84l-.98.44a12.06 12.06 0 005.02 5.02l.44-.98c.32-.71 1.08-1.11 1.84-.97l1.93.36c.84.16 1.45.9 1.45 1.76v2.33c0 1.09-.93 1.93-2.02 1.87-8.77-.49-15.8-7.52-16.3-16.3z" />
        </svg>
      </button>

      {/* Панель */}
      {open && (
        <div
          role="dialog"
          className="
            absolute left-0 bottom-16 w-60
            rounded-2xl bg-white
            p-4 shadow-2xl
            ring-1 ring-black/5
            animate-[fadeIn_.2s_ease-out]
          "
        >
          <h4 className="mb-3 text-sm font-semibold text-slate-700">
            Kontakt HappyDate
          </h4>

          <div className="flex flex-col gap-1 text-sm">
            <a
              href={`tel:${phoneNumber}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 transition"
            >
              📞 <span>Zadzwoń</span>
            </a>

            <a
              href={`https://wa.me/${phoneNumber.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 transition"
            >
              💬 <span>WhatsApp</span>
            </a>

            <button
              onClick={copyNumber}
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 transition"
            >
              📋{" "}
              <span>
                {copied ? "Skopiowano! ✅" : "Skopiuj numer"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}