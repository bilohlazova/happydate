"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { PawPrint, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PetRow } from "@/lib/repositories/petRepository";
import { addPersonPet, editPersonPet, removePersonPet } from "@/lib/people/people.loaders";

export function PetsSection({ personId, pets, onChanged }: { personId: string; pets: PetRow[]; onChanged?: () => void | Promise<void> }) {
  const t = useTranslations("person.profileUi.pets");
  const [editor, setEditor] = useState<PetRow | "new" | null>(null);
  const [details, setDetails] = useState<PetRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get("name") ?? "").trim(),
      species: String(form.get("species") ?? "").trim(),
      breed: String(form.get("breed") ?? "").trim(),
      birthDate: String(form.get("birthDate") ?? ""),
      note: String(form.get("note") ?? "").trim(),
    };
    if (!values.name || !values.species) return;
    setBusy(true);
    setFailed(false);
    try {
      if (editor === "new") await addPersonPet({ personId, ...values });
      else if (editor) await editPersonPet({ petId: editor.id, ...values });
      setEditor(null);
      setDetails(null);
      await onChanged?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function unlink(pet: PetRow) {
    if (busy || !window.confirm(t("unlinkConfirm", { name: pet.name }))) return;
    setBusy(true);
    setFailed(false);
    try {
      await removePersonPet(personId, pet.id);
      setDetails(null);
      await onChanged?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.2rem] border border-white/80 bg-white/85 p-3.5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><PawPrint className="h-4 w-4" /></span>
          <h2 className="text-sm font-black text-slate-900 sm:text-base">{t("title")}</h2>
        </div>
        <button type="button" onClick={() => { setFailed(false); setEditor("new"); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-emerald-700">
          <Plus className="h-4 w-4" /> {t("add")}
        </button>
      </div>

      {pets.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {pets.map((pet) => (
            <li key={pet.id}>
              <button type="button" onClick={() => setDetails(pet)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-left ring-1 ring-slate-100">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-emerald-700">
                  {pet.photo_url ? <Image src={pet.photo_url} alt="" width={44} height={44} unoptimized className="h-full w-full object-cover" /> : <PawPrint className="h-5 w-5" />}
                </span>
                <span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{pet.name}</strong><span className="block truncate text-xs font-semibold text-slate-500">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {details && !editor && (
        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{details.name}</h3><p className="text-xs font-semibold text-slate-600">{details.species}{details.breed ? ` · ${details.breed}` : ""}</p></div><button type="button" aria-label={t("close")} onClick={() => setDetails(null)} className="flex h-11 w-11 items-center justify-center rounded-xl"><X className="h-4 w-4" /></button></div>
          {details.note && <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{details.note}</p>}
          <div className="mt-3 flex gap-2"><button type="button" onClick={() => setEditor(details)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-extrabold text-emerald-700"><Pencil className="h-3.5 w-3.5" />{t("edit")}</button><button type="button" disabled={busy} onClick={() => void unlink(details)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-rose-700"><Trash2 className="h-3.5 w-3.5" />{t("unlink")}</button></div>
        </div>
      )}

      {editor && (
        <form onSubmit={save} className="mt-3 space-y-3 rounded-2xl border border-emerald-100 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <PetField name="name" label={t("name")} defaultValue={editor === "new" ? "" : editor.name} required />
            <PetField name="species" label={t("species")} defaultValue={editor === "new" ? "" : editor.species} required />
            <PetField name="breed" label={t("breed")} defaultValue={editor === "new" ? "" : editor.breed ?? ""} />
            <PetField name="birthDate" label={t("birthDate")} type="date" defaultValue={editor === "new" ? "" : editor.birth_date ?? ""} />
          </div>
          <label className="block text-xs font-extrabold text-slate-600">{t("note")}<textarea name="note" maxLength={1000} defaultValue={editor === "new" ? "" : editor.note ?? ""} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-200" /></label>
          {failed && <p role="alert" className="text-xs font-bold text-rose-600">{t("error")}</p>}
          <div className="flex gap-2"><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white disabled:opacity-50">{busy ? t("saving") : t("save")}</button><button type="button" disabled={busy} onClick={() => setEditor(null)} className="min-h-11 rounded-xl px-4 text-xs font-extrabold text-slate-600">{t("cancel")}</button></div>
        </form>
      )}
    </section>
  );
}

function PetField({ name, label, defaultValue, type = "text", required = false }: { name: string; label: string; defaultValue: string; type?: string; required?: boolean }) {
  return <label className="block text-xs font-extrabold text-slate-600">{label}<input name={name} type={type} required={required} maxLength={120} defaultValue={defaultValue} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-200" /></label>;
}
