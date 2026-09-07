"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useLocale } from "next-intl";
import Image from "next/image";
import { ImagePlus, Palette, Pencil, Sparkles, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { deletePersonSymbol, savePersonSymbol, updatePersonSymbolInterpretation, updatePersonSymbolMeaning, type PersonSymbolRow } from "@/lib/repositories/personSymbolRepository";
import { gentleSymbolInterpretation } from "@/lib/memory-engine";

const PRESETS = [
  ["heart", "♥"], ["sun", "☀"], ["flower", "✿"], ["stars", "✦"], ["wave", "〰"], ["infinity", "∞"],
] as const;
const copy = {
  uk: { title: "Наш символ", add: "Додати наш символ", choose: "Обрати готовий символ", happy: "Створити з Happy", draw: "Намалювати самостійно", upload: "Завантажити зображення", hint: "Намалюйте символ, який асоціюється з вашими стосунками", name: "Назва символу (необов’язково)", prompt: "Що вас об’єднує? Наприклад: море, подорожі й тепло", meaning: "Що цей символ означає для вас?", meaningHint: "Ваш сенс — головний. Happy не буде його замінювати.", clear: "Очистити", save: "Зберегти як наш символ", saveMeaning: "Зберегти мій сенс", cancel: "Скасувати", replace: "Змінити", remove: "Видалити", describe: "Отримати м’яку інтерпретацію", inspiration: "Це лише творче натхнення, а не істина про вас чи ваші стосунки.", generated: "Цей символ може нагадувати про цілісність або ваш маленький захищений простір — якщо тобі це відгукується.", error: "Не вдалося зберегти символ. Спробуйте ще раз." },
  en: { title: "Our symbol", add: "Add our symbol", choose: "Choose a symbol", happy: "Create with Happy", draw: "Draw it yourself", upload: "Upload an image", hint: "Draw a symbol that reminds you of your relationship", name: "Symbol name (optional)", prompt: "What connects you? For example: sea, travel and warmth", meaning: "What does this symbol mean to you?", meaningHint: "Your meaning comes first. Happy will not replace it.", clear: "Clear", save: "Save as our symbol", saveMeaning: "Save my meaning", cancel: "Cancel", replace: "Change", remove: "Delete", describe: "Get a gentle interpretation", inspiration: "This is creative inspiration only, not a truth about you or your relationship.", generated: "This symbol may evoke wholeness or a small protected space of your own — if that resonates with you.", error: "Could not save the symbol. Try again." },
} as const;

function dataUrlBlob(value: string): Blob {
  const [header, body] = value.split(",");
  const type = /data:([^;]+)/.exec(header)?.[1] ?? "image/png";
  const bytes = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type });
}

export function PersonSymbolSection({ personId, personName, symbol, onChanged }: { personId: string; personName: string; symbol: PersonSymbolRow | null; onChanged?: () => void | Promise<void> }) {
  const locale = useLocale();
  const t = locale === "uk" ? copy.uk : copy.en;
  const [mode, setMode] = useState<null | "menu" | "preset" | "happy" | "draw" | "upload" | "meaning">(null);
  const [name, setName] = useState(symbol?.name ?? "");
  const [prompt, setPrompt] = useState("");
  const [chosen, setChosen] = useState("heart");
  const [description, setDescription] = useState(symbol?.happy_interpretation ?? symbol?.description ?? "");
  const [userMeaning, setUserMeaning] = useState(symbol?.user_meaning ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [penColor, setPenColor] = useState("#0ea5e9");
  const [penWidth, setPenWidth] = useState(5);
  const [hasDrawing, setHasDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const draftKey = `happydate:symbol-draft:${personId}`;

  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = width * ratio; canvas.height = 260 * ratio;
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);
    const draft = localStorage.getItem(draftKey);
    if (draft) { const image = new window.Image(); image.onload = () => { context?.drawImage(image, 0, 0, width, 260); setHasDrawing(true); }; image.src = draft; }
  }, [draftKey, mode]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget; const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function start(event: PointerEvent<HTMLCanvasElement>) { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); const p = point(event); const ctx = event.currentTarget.getContext("2d"); ctx?.beginPath(); ctx?.moveTo(p.x, p.y); }
  function move(event: PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const p = point(event); const ctx = event.currentTarget.getContext("2d"); if (!ctx) return; ctx.strokeStyle = penColor; ctx.lineWidth = penWidth; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineTo(p.x, p.y); ctx.stroke(); setHasDrawing(true); localStorage.setItem(draftKey, event.currentTarget.toDataURL("image/png")); }

  async function persist(kind: "preset" | "happy" | "drawing" | "upload") {
    setBusy(true); setError(false);
    try {
      const auth = await supabase.auth.getUser(); const userId = auth.data.user?.id;
      if (!userId) throw new Error("Authentication required");
      let image: Blob | undefined;
      if (kind === "drawing") image = dataUrlBlob(canvasRef.current!.toDataURL("image/png"));
      if (kind === "upload") image = file ?? undefined;
      const presetKey = kind === "preset" ? chosen : kind === "happy" ? PRESETS[Math.abs([...prompt].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % PRESETS.length][0] : undefined;
      await savePersonSymbol({ userId, personId, kind, name, presetKey, image, prompt });
      if (userMeaning.trim()) await updatePersonSymbolMeaning(userId, personId, userMeaning);
      if (description.trim()) await updatePersonSymbolInterpretation(userId, personId, description);
      localStorage.removeItem(draftKey); setMode(null); await onChanged?.();
    } catch { setError(true); } finally { setBusy(false); }
  }

  const glyph = PRESETS.find(([key]) => key === symbol?.preset_key)?.[1];
  return <section className="rounded-[2rem] bg-white/90 p-5 shadow-sm sm:p-7" aria-labelledby="person-symbol-title">
    <div className="flex items-center justify-between gap-3"><h2 id="person-symbol-title" className="text-xl font-extrabold text-slate-900">{t.title}</h2>
      {symbol && <div className="flex gap-1"><button type="button" className="min-h-11 min-w-11 rounded-full text-sky-700 hover:bg-sky-50" aria-label={t.replace} onClick={() => setMode("menu")}><Pencil className="mx-auto h-5 w-5" /></button><button type="button" className="min-h-11 min-w-11 rounded-full text-rose-600 hover:bg-rose-50" aria-label={t.remove} onClick={async () => { const auth = await supabase.auth.getUser(); if (auth.data.user && confirm(`${t.remove} «${symbol.name ?? t.title}»?`)) { await deletePersonSymbol(auth.data.user.id, personId); await onChanged?.(); } }}><Trash2 className="mx-auto h-5 w-5" /></button></div>}
    </div>
    {symbol ? <div className="mt-4 flex items-start gap-5"><div className="relative grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-50 to-violet-50 text-7xl text-sky-500">{symbol.image_url ? <Image unoptimized fill sizes="128px" src={symbol.image_url} alt={symbol.name ?? t.title} className="object-contain" /> : glyph}</div><div className="min-w-0 flex-1"><p className="font-bold text-slate-900">{symbol.name || t.title}</p>{symbol.user_meaning ? <div className="mt-3 rounded-xl bg-sky-50 p-3"><p className="text-xs font-extrabold uppercase tracking-wide text-sky-700">{t.meaning}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{symbol.user_meaning}</p><button className="mt-2 text-xs font-bold text-sky-700" onClick={() => setMode("meaning")}>{t.replace}</button></div> : <button className="mt-3 text-sm font-bold text-sky-700" onClick={() => setMode("meaning")}>+ {t.meaning}</button>}{symbol.happy_interpretation && <div className="mt-3"><p className="text-sm leading-6 text-violet-800">{symbol.happy_interpretation}</p><p className="mt-1 text-xs text-slate-500">{t.inspiration}</p></div>}{!symbol.happy_interpretation && <button className="mt-3 text-sm font-semibold text-violet-700" onClick={async () => { const auth = await supabase.auth.getUser(); if (!auth.data.user) return; const interpretation = gentleSymbolInterpretation({ locale, kind: symbol.kind, presetKey: symbol.preset_key, prompt: symbol.prompt }); await updatePersonSymbolInterpretation(auth.data.user.id, personId, interpretation.text); setDescription(interpretation.text); await onChanged?.(); }}>{t.describe}</button>}</div></div>
    : <button type="button" onClick={() => setMode("menu")} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-300 bg-sky-50 font-bold text-sky-700"><ImagePlus className="h-5 w-5" />{t.add}</button>}

    {mode && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) setMode(null); }}><div role="dialog" aria-modal="true" aria-label={t.title} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-7"><div className="flex items-center justify-between"><h3 className="text-xl font-extrabold">{mode === "draw" ? t.hint : t.add}</h3><button className="min-h-11 min-w-11 rounded-full hover:bg-slate-100" onClick={() => setMode(null)}><X className="mx-auto" /></button></div>
      {mode === "menu" && <div className="mt-5 grid gap-3 sm:grid-cols-2">{([["preset", Palette, t.choose], ["happy", Sparkles, t.happy], ["draw", Pencil, t.draw], ["upload", Upload, t.upload]] as const).map(([value, Icon, label]) => <button key={value} onClick={() => setMode(value)} className="flex min-h-20 items-center gap-3 rounded-2xl bg-slate-50 p-4 text-left font-bold hover:bg-sky-50"><Icon className="h-6 w-6 text-sky-600" />{label}</button>)}</div>}
      {mode === "preset" && <div className="mt-5 grid grid-cols-3 gap-3">{PRESETS.map(([key, icon]) => <button key={key} aria-pressed={chosen === key} onClick={() => setChosen(key)} className={`h-20 rounded-2xl text-4xl ${chosen === key ? "bg-sky-100 ring-2 ring-sky-500" : "bg-slate-50"}`}>{icon}</button>)}</div>}
      {mode === "happy" && <textarea className="mt-5 min-h-28 w-full rounded-2xl border border-slate-200 p-4" placeholder={t.prompt} value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={500} />}
      {mode === "draw" && <><p className="mt-2 text-sm text-slate-500">{personName}</p><canvas aria-label={t.hint} ref={canvasRef} className="mt-4 h-[260px] w-full touch-none rounded-2xl border-2 border-dashed border-sky-200 bg-transparent" onPointerDown={start} onPointerMove={move} onPointerUp={() => drawing.current = false} onPointerCancel={() => drawing.current = false} /><div className="mt-3 flex flex-wrap items-center gap-4"><label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600"><span>{ukLabel(locale, "Колір", "Color")}</span><input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg" /></label><label className="flex min-h-11 flex-1 items-center gap-2 text-sm font-bold text-slate-600"><span>{ukLabel(locale, "Товщина", "Width")}</span><input aria-label={ukLabel(locale, "Товщина лінії", "Line width")} type="range" min="2" max="14" value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} className="min-w-24 flex-1" /></label><button className="min-h-11 text-sm font-bold text-slate-600" onClick={() => { const c = canvasRef.current; c?.getContext("2d")?.clearRect(0, 0, c.width, c.height); localStorage.removeItem(draftKey); setHasDrawing(false); }}>{t.clear}</button></div></>}
      {mode === "upload" && <label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50"><Upload className="mb-2 text-sky-600" />{file?.name ?? t.upload}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>}
      {mode === "meaning" ? <><p className="mt-2 text-sm text-slate-500">{t.meaningHint}</p><textarea autoFocus className="mt-4 min-h-32 w-full rounded-2xl border border-slate-200 p-4" placeholder={t.meaning} value={userMeaning} onChange={(e) => setUserMeaning(e.target.value)} maxLength={2000} /><button className="mt-4 min-h-12 w-full rounded-xl bg-sky-600 font-bold text-white" onClick={async () => { const auth = await supabase.auth.getUser(); if (!auth.data.user) return; await updatePersonSymbolMeaning(auth.data.user.id, personId, userMeaning); setMode(null); await onChanged?.(); }}>{t.saveMeaning}</button></> : mode !== "menu" && <><input className="mt-4 min-h-12 w-full rounded-xl border border-slate-200 px-4" placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /><textarea className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 p-4" placeholder={t.meaning} value={userMeaning} onChange={(e) => setUserMeaning(e.target.value)} maxLength={2000} /><p className="mt-1 text-xs text-slate-500">{t.meaningHint}</p>{mode === "happy" && <label className="mt-4 block text-sm font-semibold"><input type="checkbox" className="mr-2" checked={Boolean(description)} onChange={(e) => setDescription(e.target.checked ? gentleSymbolInterpretation({ locale, kind: "happy", presetKey: chosen, prompt }).text : "")} />{t.describe}<span className="mt-1 block pl-5 text-xs font-normal text-slate-500">{t.inspiration}</span></label>}{error && <p className="mt-3 text-sm text-rose-600">{t.error}</p>}<div className="mt-5 flex gap-3"><button className="min-h-12 flex-1 rounded-xl bg-slate-100 font-bold" onClick={() => setMode(null)}>{t.cancel}</button><button disabled={busy || (mode === "upload" && !file) || (mode === "happy" && !prompt.trim()) || (mode === "draw" && !hasDrawing)} className="min-h-12 flex-1 rounded-xl bg-sky-600 font-bold text-white disabled:opacity-50" onClick={() => persist(mode === "draw" ? "drawing" : mode)}>{busy ? "…" : t.save}</button></div></>}
    </div></div>}
  </section>;
}

function ukLabel(locale: string, uk: string, fallback: string): string {
  return locale === "uk" ? uk : fallback;
}
