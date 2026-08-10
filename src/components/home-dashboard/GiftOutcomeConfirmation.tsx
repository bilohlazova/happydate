"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

interface GiftOutcomeConfirmationProps {
  message: string;
  labels: {
    undo: string;
    undoing: string;
    undoError: string;
    addNote: string;
    noteLabel: string;
    notePlaceholder: string;
    saveNote: string;
    savingNote: string;
    skipNote: string;
    noteError: string;
    noteCount: (count: number) => string;
  };
  undoBusy: boolean;
  undoError: boolean;
  onUndo: () => Promise<void>;
  onStartNote: () => void;
  onSaveNote: (note: string) => Promise<void>;
  onSkipNote: () => void;
}

export default function GiftOutcomeConfirmation({
  message,
  labels,
  undoBusy,
  undoError,
  onUndo,
  onStartNote,
  onSaveNote,
  onSkipNote,
}: GiftOutcomeConfirmationProps) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState(false);
  const normalizedNote = note.replace(/\s+/g, " ").trim();

  function startNote() {
    onStartNote();
    setEditing(true);
  }

  async function saveNote() {
    if (!normalizedNote || noteBusy) return;
    setNoteBusy(true);
    setNoteError(false);
    try {
      await onSaveNote(normalizedNote);
    } catch {
      setNoteError(true);
      setNoteBusy(false);
    }
  }

  return (
    <div className="fixed inset-x-4 bottom-[calc(var(--hd-nav-height)+env(safe-area-inset-bottom)+16px)] z-[60] mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.2)] md:bottom-6" aria-live="polite">
      <p className="text-sm font-bold text-slate-800">{message}</p>
      {!editing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={startNote} className="min-h-10 rounded-xl bg-emerald-50 px-4 text-sm font-extrabold text-emerald-700">{labels.addNote}</button>
          <button type="button" disabled={undoBusy} onClick={() => void onUndo()} className="min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white disabled:opacity-50">{undoBusy ? labels.undoing : labels.undo}</button>
        </div>
      ) : (
        <div className="mt-3">
          <label htmlFor="gift-outcome-note" className="block text-xs font-extrabold text-slate-700">{labels.noteLabel}</label>
          <textarea id="gift-outcome-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} autoFocus placeholder={labels.notePlaceholder} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          <p className="mt-1 text-right text-[11px] font-medium text-slate-500">{labels.noteCount(note.length)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={!normalizedNote || noteBusy} onClick={() => void saveNote()} className="min-h-10 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white disabled:opacity-50">{noteBusy ? <span className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />{labels.savingNote}</span> : labels.saveNote}</button>
            <button type="button" disabled={noteBusy} onClick={onSkipNote} className="min-h-10 rounded-xl bg-slate-100 px-4 text-sm font-extrabold text-slate-700 disabled:opacity-50">{labels.skipNote}</button>
          </div>
          {noteError && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{labels.noteError}</p>}
        </div>
      )}
      {undoError && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{labels.undoError}</p>}
    </div>
  );
}
