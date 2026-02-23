// src/components/FloatingActions.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function FloatingActions() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const phoneNumber = "+48123456789";

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) window.addEventListener("mousedown", onDocDown);
    return () => window.removeEventListener("mousedown", onDocDown);
  }, [open]);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      alert("Nie udało się skopiować numeru");
    }
  }

  return (
    <div
      ref={panelRef}
      className="fixed left-5 z-40 flex flex-col gap-3 bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
    >
      {/* FAB контакту — ті ж габарити, що й чат: 56x56 */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Kontakt HappyDate"
        className="
          group relative flex h-14 w-14 items-center justify-center rounded-full
          bg-white/80 backdrop-blur-lg
          border border-white/70 ring-1 ring-black/5
          shadow-[0_6px_24px_rgba(0,0,0,0.08)]
          transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300
        "
        title="Kontakt"
      >
        {/* іконка трохи більша, щоб не здавалася легшою */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
             fill="currentColor" className="h-7 w-7 text-emerald-600">
          <path d="M2.003 5.884c-.06-1.09.78-2.02 1.87-2.02H6.2c.86 0 1.6.61 1.76 1.45l.36 1.93c.14.76-.26 1.52-.97 1.84l-.98.44a12.06 12.06 0 005.02 5.02l.44-.98c.32-.71 1.08-1.11 1.84-.97l1.93.36c.84.16 1.45.9 1.45 1.76v2.33c0 1.09-.93 1.93-2.02 1.87-8.77-.49-15.8-7.52-16.3-16.3z"/>
        </svg>

        {/* tooltip (desktop) */}
        <span
          className="
            pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2
            rounded-md bg-neutral-900/90 px-2 py-1 text-[11px] text-white
            opacity-0 translate-y-1 transition
            group-hover:opacity-100 group-hover:translate-y-0
            sm:block
          "
        >
          Kontakt
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Kontakt HappyDate"
          className="
            absolute bottom-16 left-0 w-56 rounded-2xl
            bg-white/70 backdrop-blur-md p-4
            shadow-xl ring-1 ring-black/10
            animate-[hd-slide-up_.25s_ease-out_both]
          "
        >
          <h4 className="mb-3 text-sm font-semibold text-neutral-700">Kontakt HappyDate</h4>

          <div className="flex flex-col gap-1 text-sm">
            <a href={`tel:${phoneNumber}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/40">
              📞 <span>Zadzwoń</span>
            </a>
            <a href={`https://wa.me/${phoneNumber.replace("+", "")}`} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/40">
              💬 <span>WhatsApp</span>
            </a>
            <button onClick={copyNumber} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/40">
              📋 <span>{copied ? "Skopiowano! ✅" : "Skopiuj numer"}</span>
            </button>
          </div>

          <span aria-hidden className="absolute -bottom-2 left-6 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white/70 drop-shadow" />
        </div>
      )}
    </div>
  );
}
