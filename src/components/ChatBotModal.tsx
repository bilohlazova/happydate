// src/components/ChatBotModal.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ChatBotModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean; // лишено для сумісності (не використовується тут)
  handleAskAI: (formData: FormData) => void; // лишено для сумісності
  initialPrompt?: string; // автопідстановка першого запиту
}

type Msg = { id: string; role: "user" | "assistant"; content: string };

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

export default function ChatBotModal({
  open,
  onClose,
  initialPrompt,
}: ChatBotModalProps) {
  const [minimized, setMinimized] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: "m1",
      role: "assistant",
      content:
        "Napisz, komu i z jakiej okazji chcesz zrobić prezent. AI podpowie 2–3 pomysły z opisem i budżetem.",
    },
  ]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // контроль стріму / відміни
  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // зберігаємо актуальне value в реф, щоб submit не залежав від value
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // focus + ESC + block body scroll
  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // focus-trap
  useEffect(() => {
    if (!open) return;
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !panelRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", trap);
    return () => window.removeEventListener("keydown", trap);
  }, [open]);

  // autosize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    const h = Math.min(160, el.scrollHeight);
    el.style.height = h + "px";
  }, [value]);

  // autoscroll
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, busy, minimized, open]);

  // чистка при закритті
  useEffect(() => {
    if (open) return;
    if (readerRef.current) {
      try { readerRef.current.cancel(); } catch {}
      readerRef.current = null;
    }
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
      abortRef.current = null;
    }
    setBusy(false);
  }, [open]);

  // ---- СТАБІЛЬНИЙ submit ---------------------------------
  const submit = useCallback(async (prefill?: string) => {
    const text = (prefill ?? valueRef.current).trim();
    if (!text || busy) return;

    setValue("");
    setBusy(true);

    // 1) user message
    setMsgs((m) => [...m, { id: uuid(), role: "user", content: text }]);

    // 2) empty assistant message to fill with stream
    const msgId = uuid();
    setMsgs((m) => [...m, { id: msgId, role: "assistant", content: "" }]);

    // якщо є попередній запит — скасувати
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch {}
      readerRef.current = null;
    }
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
      abortRef.current = null;
    }

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, content: x.content + chunk } : x)));
      }
    } catch {
      const fallback =
        "Ups, nie wyszło. Spróbuj proszę ponownie albo napisz prościej (np. „Dziewczyna, 20 lat, do 80 zł, lubi koty”).";
      setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, content: fallback } : x)));
    } finally {
      if (readerRef.current) {
        try { await readerRef.current.cancel(); } catch {}
        readerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current = null;
      }
      setBusy(false);
    }
  }, [busy]);
  // ---------------------------------------------------------

  // 🔥 автозапуск першого повідомлення, якщо переданий initialPrompt
  useEffect(() => {
    if (!open) return;
    if (initialPrompt && initialPrompt.trim()) {
      const t = setTimeout(() => { void submit(initialPrompt); }, 20);
      return () => clearTimeout(t);
    }
  }, [open, initialPrompt, submit]);

  if (!open) return null;

  function onBackdropClick(e: React.MouseEvent) {
    if (e.target instanceof Node && panelRef.current && !panelRef.current.contains(e.target)) {
      onClose();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const chips = [
    "Dziewczyna, 20 lat, 50 zł, lubi koty",
    "Tata, rocznica, 150–200 zł, majsterkowanie",
    "Koleżanka z pracy, do 80 zł, kawa i rośliny",
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
      onMouseDown={onBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="hd-ai-title"
    >
      <div
        ref={panelRef}
        className="fixed bottom-24 right-6 w-[min(94vw,420px)] max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 animate-[hd-pop_.18s_ease-out_both]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg">
              🎁
            </div>
            <div>
              <h3 id="hd-ai-title" className="text-sm font-semibold">HappyDate • AI-asystent</h3>
              <div className="flex items-center gap-1 text-[11px] opacity-90">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                online
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized((m) => !m)}
              className="rounded-lg px-2 py-1 text-sm/none hover:bg-white/15"
              aria-label={minimized ? "Rozwiń czat" : "Zminimalizuj czat"}
            >
              {minimized ? "▣" : "–"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm/none hover:bg-white/15"
              aria-label="Zamknij"
            >
              ✕
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="flex max-h-[70vh] flex-col bg-white">
            {/* Messages */}
            <div
              ref={listRef}
              id="hd-ai-output"
              aria-live="polite"
              className="flex-1 space-y-3 overflow-auto px-4 py-3 text-sm"
            >
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* avatar */}
                  <div
                    className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                      m.role === "user" ? "bg-sky-100" : "bg-amber-100"
                    }`}
                  >
                    {m.role === "user" ? "Ty" : "🎁"}
                  </div>
                  {/* bubble */}
                  <div
                    className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 shadow-sm ${
                      m.role === "user"
                        ? "bg-sky-100 text-sky-900"
                        : "bg-neutral-100 text-neutral-900"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex gap-2">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-amber-100 flex items-center justify-center">
                    🎁
                  </div>
                  <div className="rounded-2xl bg-neutral-100 px-3 py-2">
                    <span className="inline-flex gap-1 align-middle">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:0.2s]" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => submit(c)}
                  className="rounded-full border px-3 py-1.5 text-[12px] hover:bg-neutral-50 active:scale-95"
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Composer */}
            <div className="border-t bg-white/70 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  name="message"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder='Np. „Dziewczyna, 20 lat, 50 zł, lubi koty i lawendę”'
                  aria-label="Treść wiadomości dla AI"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none shadow-inner focus:ring-2 focus:ring-cyan-300"
                />
                <button
                  type="button"
                  onClick={() => submit()}
                  disabled={busy || !value.trim()}
                  className="rounded-xl bg-pink-500 px-4 py-2 text-xs font-semibold text-white shadow hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "…" : "Wyślij"}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-neutral-500">
                Enter — wyślij, Shift+Enter — nowa linia
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
