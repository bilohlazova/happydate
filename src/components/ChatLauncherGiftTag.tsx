"use client";

export default function ChatLauncherGiftTag() {
  function handleClick() {
    window.dispatchEvent(new CustomEvent("happydate:open-chat"));
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Otwórz czat AI"
      className="
        fixed right-4 z-[60] group
        focus:outline-none
      "
      style={{
        bottom: "calc(80px + env(safe-area-inset-bottom))",
      }}
    >
      {/* FAB */}
      <span
        className="
          relative flex h-14 w-14 items-center justify-center rounded-full
          bg-white shadow-lg
          border border-slate-200
          backdrop-blur-md
          active:scale-95 transition
        "
      >
        {/* іконка */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-6 w-6 text-sky-700"
        >
          <path d="M4 3h12a1 1 0 011 1v8a1 1 0 01-1 1H8l-4 3V4a1 1 0 011-1z" />
        </svg>

        {/* online dot */}
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
      </span>

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
        AI-asystent
      </span>
    </button>
  );
}
