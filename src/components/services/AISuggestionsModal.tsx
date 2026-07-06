"use client";

import React, { useEffect, useRef, useState } from "react";

/* ---------- Типи ---------- */
type Msg = { id: string; role: "user" | "assistant"; content: string };
type Idea = {
  title: string;
  desc?: string;
  reason?: string;
  price?: string;
  links?: string[];
};

interface Props { open: boolean; onClose: () => void; }

/* ---------- Утіліти ---------- */
function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

const URL_RE = /\bhttps?:\/\/[^\s)]+/gi;
function linkify(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  text.replace(URL_RE, (match, offset) => {
    if (offset > lastIndex) parts.push(text.slice(lastIndex, offset));
    parts.push(
      <a
        key={match + offset}
        href={match}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-sky-700 hover:text-sky-800 break-words"
      >
        {match}
      </a>
    );
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/** Парсер форматованих відповідей */
function parseIdeas(raw: string): Idea[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  const lines = text.split("\n");

  const ideas: Idea[] = [];
  let cur: Idea | null = null;

  const commit = () => {
    if (!cur) return;
    const hasContent = cur.title || cur.desc || cur.reason || cur.price || (cur.links && cur.links.length);
    if (hasContent) ideas.push({ ...cur, links: cur.links?.filter(Boolean) || [] });
    cur = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const mIdea = line.match(/^(?:\d+[\)\.\:]\s*)?(?:Pomysł|Propozycja)\s*\d*\s*[:\-]?\s*(.*)$/i);
    if (mIdea) {
      commit();
      cur = { title: mIdea[1]?.trim() || "", links: [] };
      continue;
    }
    if (!cur) cur = { title: "", links: [] };

    const mDesc = line.match(/^(?:Opis)\s*[:\-]\s*(.*)$/i);
    if (mDesc) { cur.desc = (cur.desc ? cur.desc + "\n" : "") + mDesc[1]; continue; }

    const mReason = line.match(/^(?:Uzasadnienie|Dlaczego)\s*[:\-]\s*(.*)$/i);
    if (mReason) { cur.reason = (cur.reason ? cur.reason + "\n" : "") + mReason[1]; continue; }

    const mPrice = line.match(/^(?:Budżet|Cena|Widełki)\s*[:\-]\s*(.*)$/i);
    if (mPrice) { cur.price = mPrice[1]; continue; }

    const mLinks = line.match(/^(?:Linki|Sklepy?)\s*[:\-]\s*(.*)$/i);
    if (mLinks) {
      const urls = (mLinks[1] || "").match(URL_RE) || [];
      cur.links = [...(cur.links || []), ...urls];
      continue;
    }

    const urls = line.match(URL_RE);
    if (urls?.length) {
      cur.links = [...(cur.links || []), ...urls];
      continue;
    }

    if (line) cur.desc = (cur.desc ? cur.desc + "\n" : "") + rawLine.trim();
  }
  commit();

  if (ideas.length === 0) {
    const anyUrls = text.match(URL_RE) || [];
    if (anyUrls.length) {
      ideas.push({ title: "Pomysł", desc: text, links: anyUrls });
    }
  }
  return ideas;
}

/* ---------- Компонент ---------- */
export default function AISuggestionsModal({ open, onClose }: Props) {
  const [minimized, setMinimized] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: "m1", role: "assistant", content: "Napisz, komu i z jakiej okazji chcesz zrobić prezent. Otrzymasz 2–3 pomysły z opisem, uzasadnieniem i widełkami cenowymi." },
  ]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    const h = Math.min(160, el.scrollHeight);
    el.style.height = h + "px";
  }, [value]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, minimized, open]);

  if (!open) return null;

  async function submit(prefill?: string) {
    const text = (prefill ?? value).trim();
    if (!text || busy) return;
    setValue("");
    setBusy(true);

    setMsgs((m) => [...m, { id: uuid(), role: "user", content: text }]);
    const msgId = uuid();
    setMsgs((m) => [...m, { id: msgId, role: "assistant", content: "" }]);

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
      const fallback = "Ups, nie wyszło. Spróbuj ponownie albo napisz prościej (np. „Dziewczyna, 20 lat, do 80 zł, lubi koty”).";
      setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, content: fallback } : x)));
    } finally {
      setBusy(false);
      readerRef.current = null;
      abortRef.current = null;
    }
  }

  const chips = [
    "Dziewczyna, 20 lat, 50 zł, lubi koty",
    "Tata, rocznica, 150–200 zł, majsterkowanie",
    "Koleżanka z pracy, do 80 zł, kawa i rośliny",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" aria-modal="true" role="dialog" aria-labelledby="hd-ai-title">
      <div
        className="flex h-full items-end justify-center p-0 sm:items-center sm:p-4"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          ref={panelRef}
          className="flex max-h-[92dvh] w-full flex-col rounded-t-[1.5rem] bg-white shadow-2xl ring-1 ring-black/10 animate-[hd-pop_.18s_ease-out_both] sm:w-[min(94vw,520px)] sm:rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-3 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg">🤖</div>
              <h3 id="hd-ai-title" className="text-sm font-semibold">HappyDate • AI-asystent</h3>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized((m) => !m)} className="rounded-lg px-2 py-1 text-sm/none hover:bg-white/15">
                {minimized ? "▣" : "–"}
              </button>
              <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm/none hover:bg-white/15">✕</button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div ref={listRef} id="hd-ai-output" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-sky-100" : "bg-amber-100"}`}>
                      {m.role === "user" ? "Ty" : "🎁"}
                    </div>
                    {m.role === "assistant" ? (
                      <AssistantMessage content={m.content} />
                    ) : (
                      <div className="max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 shadow-sm bg-sky-100 text-sky-900">
                        {m.content}
                      </div>
                    )}
                  </div>
                ))}

                {busy && (
                  <div className="flex gap-2">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-amber-100 flex items-center justify-center">🎁</div>
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
              <div className="flex flex-wrap gap-2 px-4 pb-2 shrink-0">
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => submit(c)} className="rounded-full border px-3 py-1.5 text-[12px] hover:bg-neutral-50 active:scale-95">
                    {c}
                  </button>
                ))}
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t bg-white/70 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    name="message"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
                    placeholder='Np. „Dziewczyna, 20 lat, 50 zł, lubi koty i lawendę”'
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2 text-[16px] outline-none shadow-inner focus:ring-2 focus:ring-cyan-300"
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
                <div className="mt-1 text-[11px] text-neutral-500">Enter — wyślij, Shift+Enter — nowa linia</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Відповідь асистента ---------- */
function AssistantMessage({ content }: { content: string }) {
  const ideas = parseIdeas(content);
  if (ideas.length === 0) {
    return <div className="max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 shadow-sm bg-neutral-100 text-neutral-900">{linkify(content)}</div>;
  }
  return (
    <div className="max-w-[75%] space-y-3">
      {ideas.map((it, idx) => (
        <div key={idx} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3 shadow-sm">
          {it.title && <p className="font-semibold text-rose-900">🎁 {it.title}</p>}
          {it.price && <p className="mt-0.5 text-[12px] text-rose-800/80">Budżet: <span className="font-medium">{it.price}</span></p>}
          {it.desc && <p className="mt-2 text-[13px] text-slate-800 whitespace-pre-wrap">{linkify(it.desc)}</p>}
          {it.reason && <p className="mt-2 text-[12px] text-slate-600 whitespace-pre-wrap"><span className="font-semibold">Dlaczego:</span> {linkify(it.reason)}</p>}
          {it.links && it.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {it.links.slice(0, 4).map((u, i) => (
                <a key={u + i} href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-1.5 text-[12px] text-sky-700 hover:bg-sky-50">🔗 Link {i + 1}</a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
