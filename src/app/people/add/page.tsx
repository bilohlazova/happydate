"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Contact,
  Link as LinkIcon,
  Pencil,
  QrCode,
  Settings,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import {
  createPerson,
  getPeople,
} from "@/lib/repositories/personRepository";
import type { PersonRow } from "@/lib/repositories/person.types";
import { MobileUI } from "@/lib/theme/mobile";

type AddMode = "contacts" | "manual" | "card" | "link";
type ContactStep = "intro" | "confirm" | "success";

interface ContactDraft {
  key: string;
  name: string;
  relationship?: string;
  birthday?: string;
  phone?: string;
  email?: string;
  externalContactId?: string;
}

interface ParsedContact {
  name?: string;
  relationship?: string;
  birthday?: string;
  phone?: string;
  email?: string;
  externalContactId?: string;
}

type ContactPickerNavigator = Navigator & {
  contacts?: {
    select: (
      properties: string[],
      options?: { multiple?: boolean }
    ) => Promise<
      Array<{
        id?: string;
        name?: string[];
        tel?: string[];
        email?: string[];
      }>
    >;
  };
};

const MODE_COPY: Record<
  AddMode,
  {
    title: string;
    description: string;
    icon: typeof Contact;
  }
> = {
  contacts: {
    title: "Importuj z kontaktów",
    description: "Wybierz tylko osoby, które są dla Ciebie ważne.",
    icon: Contact,
  },
  manual: {
    title: "Dodaj ręcznie",
    description: "Wpisz podstawowe dane ważnej osoby.",
    icon: Pencil,
  },
  card: {
    title: "Zeskanuj wizytówkę",
    description: "Dodaj zdjęcie wizytówki i uzupełnij dane.",
    icon: QrCode,
  },
  link: {
    title: "Link / QR",
    description: "Wklej vCard, MECARD, link lub tekst z QR.",
    icon: LinkIcon,
  },
};

export default function AddPersonPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AddMode>("manual");
  const [userId, setUserId] = useState<string | null>(null);
  const [existingPeople, setExistingPeople] = useState<PersonRow[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [externalContactId, setExternalContactId] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [contactStep, setContactStep] = useState<ContactStep>("intro");
  const [selectedContacts, setSelectedContacts] = useState<ContactDraft[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedDuplicateCount, setSkippedDuplicateCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get("mode");

    if (
      nextMode === "contacts" ||
      nextMode === "manual" ||
      nextMode === "card" ||
      nextMode === "link"
    ) {
      setMode(nextMode);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;

      setUserId(user?.id ?? null);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setExistingPeople([]);
      return;
    }

    let isMounted = true;

    getPeople(userId)
      .then((people) => {
        if (isMounted) {
          setExistingPeople(people);
        }
      })
      .catch((loadError) => {
        console.error("[AddPersonPage] getPeople failed:", loadError);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const modeCopy = MODE_COPY[mode];
  const ModeIcon = modeCopy.icon;
  const canSave = Boolean(userId && name.trim() && !authLoading && !isSaving);
  const existingNames = useMemo(
    () => new Set(existingPeople.map((person) => normalizeName(person.name))),
    [existingPeople]
  );
  const contactsToImport = selectedContacts.filter(
    (contact) => !isDuplicateContact(contact, existingPeople, existingNames)
  );
  const duplicateContacts = selectedContacts.filter((contact) =>
    isDuplicateContact(contact, existingPeople, existingNames)
  );
  const missingBirthdayCount = contactsToImport.filter(
    (contact) => !contact.birthday
  ).length;
  const missingRelationCount = contactsToImport.filter(
    (contact) => !contact.relationship
  ).length;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setError("Musisz być zalogowany, aby dodać osobę.");
      return;
    }

    if (!name.trim()) {
      setError("Imię jest wymagane.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await createPerson({
        userId,
        name: name.trim(),
        relationship: relationship.trim() || undefined,
        birthday: birthday || undefined,
        phone: normalizePhone(phone),
        email: normalizeEmail(email),
        externalContactId: externalContactId.trim() || undefined,
        contactSource: mode,
      });

      router.push("/people");
    } catch (submitError) {
      console.error("[AddPersonPage] createPerson failed:", submitError);
      setError("Nie udało się zapisać osoby. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleContactPick() {
    setError(null);
    setStatus(null);

    const contactNavigator = navigator as ContactPickerNavigator;

    if (!contactNavigator.contacts?.select) {
      setStatus(
        "Brak dostępu do kontaktów. Ten WebView nie udostępnia wyboru kontaktów, ale możesz dodać osobę ręcznie."
      );
      return;
    }

    try {
      const contacts = await contactNavigator.contacts.select(
        ["name", "tel", "email"],
        { multiple: true }
      );
      const drafts = contacts.reduce<ContactDraft[]>((drafts, contact, index) => {
          const [contactName] = contact.name ?? [];

          if (!contactName?.trim()) {
            return drafts;
          }

          drafts.push({
            key: `${contactName}-${contact.id ?? contact.tel?.[0] ?? contact.email?.[0] ?? index}`,
            name: contactName.trim(),
            phone: normalizePhone(contact.tel?.[0]),
            email: normalizeEmail(contact.email?.[0]),
            externalContactId: contact.id,
          });

          return drafts;
        }, []);

      if (drafts.length === 0) {
        setStatus("Nie wybrano żadnej osoby. Możesz spróbować ponownie.");
        return;
      }

      setSelectedContacts(drafts);
      setContactStep("confirm");
    } catch (pickError) {
      console.error("[AddPersonPage] contact pick failed:", pickError);
      setStatus(
        "Brak dostępu do kontaktów. Zezwól HappyDate na dostęp w ustawieniach albo dodaj osobę ręcznie."
      );
    }
  }

  async function handleImportContacts() {
    if (!userId) {
      setError("Musisz być zalogowany, aby importować kontakty.");
      return;
    }

    if (contactsToImport.length === 0) {
      setError("Nie ma nowych osób do importu.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await Promise.all(
        contactsToImport.map((contact) =>
          createPerson({
            userId,
            name: contact.name,
            relationship: contact.relationship,
            birthday: contact.birthday,
            phone: contact.phone,
            email: contact.email,
            externalContactId: contact.externalContactId,
            contactSource: "contacts",
          })
        )
      );

      setImportedCount(contactsToImport.length);
      setSkippedDuplicateCount(duplicateContacts.length);
      setContactStep("success");
    } catch (importError) {
      console.error("[AddPersonPage] import contacts failed:", importError);
      setError("Nie udało się zaimportować osób. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCardImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setCardImageUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return URL.createObjectURL(file);
    });
    setStatus("Zdjęcie dodane. Uzupełnij dane z wizytówki i zapisz osobę.");
  }

  function handleParseSource() {
    const parsed = parseContactSource(sourceText);

    if (!parsed.name && !parsed.relationship && !parsed.birthday) {
      setStatus("Nie udało się rozpoznać danych. Wpisz je w polach poniżej.");
      return;
    }

    if (parsed.name) setName(parsed.name);
    if (parsed.relationship) setRelationship(parsed.relationship);
    if (parsed.birthday) setBirthday(parsed.birthday);
    if (parsed.phone) setPhone(parsed.phone);
    if (parsed.email) setEmail(parsed.email);
    if (parsed.externalContactId) setExternalContactId(parsed.externalContactId);
    setStatus("Dane zostały uzupełnione z linku / QR.");
  }

  return (
    <main className={`${MobileUI.screen} ${MobileUI.contentBottom} pt-2.5`}>
      <div className={`${MobileUI.container} flex flex-col gap-2.5`}>
        <header className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.06)] ring-1 ring-slate-100"
            aria-label="Wróć"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[1.5rem] font-black leading-none text-slate-950">
              {modeCopy.title}
            </h1>
            <p className="mt-0.5 text-[0.82rem] font-semibold leading-4 text-slate-500">
              {modeCopy.description}
            </p>
          </div>
        </header>

        {mode === "contacts" ? (
          <ContactsFlow
            contactStep={contactStep}
            selectedContacts={selectedContacts}
            contactsToImport={contactsToImport}
            duplicateContacts={duplicateContacts}
            importedCount={importedCount}
            skippedDuplicateCount={skippedDuplicateCount}
            missingBirthdayCount={missingBirthdayCount}
            missingRelationCount={missingRelationCount}
            status={status}
            error={error}
            isSaving={isSaving}
            onPickContacts={handleContactPick}
            onImportContacts={handleImportContacts}
            onManualMode={() => {
              setMode("manual");
              window.history.replaceState(null, "", "/people/add?mode=manual");
            }}
            onChangeChoice={() => {
              setSelectedContacts([]);
              setContactStep("intro");
              setError(null);
              setStatus(null);
            }}
            onPeople={() => router.push("/people")}
            onSettings={() => {
              window.location.href = "app-settings:";
            }}
          />
        ) : (
          <SinglePersonFlow
            mode={mode}
            ModeIcon={ModeIcon}
            name={name}
            relationship={relationship}
            birthday={birthday}
            sourceText={sourceText}
            cardImageUrl={cardImageUrl}
            status={status}
            error={error}
            canSave={canSave}
            isSaving={isSaving}
            onNameChange={setName}
            onRelationshipChange={setRelationship}
            onBirthdayChange={setBirthday}
            onSourceTextChange={setSourceText}
            onParseSource={handleParseSource}
            onCardImageChange={handleCardImageChange}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </main>
  );
}

function ContactsFlow({
  contactStep,
  selectedContacts,
  contactsToImport,
  duplicateContacts,
  importedCount,
  skippedDuplicateCount,
  missingBirthdayCount,
  missingRelationCount,
  status,
  error,
  isSaving,
  onPickContacts,
  onImportContacts,
  onManualMode,
  onChangeChoice,
  onPeople,
  onSettings,
}: {
  contactStep: ContactStep;
  selectedContacts: ContactDraft[];
  contactsToImport: ContactDraft[];
  duplicateContacts: ContactDraft[];
  importedCount: number;
  skippedDuplicateCount: number;
  missingBirthdayCount: number;
  missingRelationCount: number;
  status: string | null;
  error: string | null;
  isSaving: boolean;
  onPickContacts: () => void;
  onImportContacts: () => void;
  onManualMode: () => void;
  onChangeChoice: () => void;
  onPeople: () => void;
  onSettings: () => void;
}) {
  if (contactStep === "success") {
    return (
      <section className="rounded-[1rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Gotowe! Dodano {importedCount} {getPeopleWord(importedCount)} 🎉
            </h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {missingBirthdayCount} {getPeopleWord(missingBirthdayCount)} nie
              ma daty urodzin, a {missingRelationCount} nie ma określonej relacji.
            </p>
          </div>
        </div>

        {skippedDuplicateCount > 0 && (
          <p className="mt-3 rounded-[0.8rem] bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
            {skippedDuplicateCount} {getPeopleWord(skippedDuplicateCount)} już
            istnieje w HappyDate i nie została dodana ponownie.
          </p>
        )}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={onPeople}
            className="min-h-11 rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)]"
          >
            Uzupełnij dane
          </button>
          <button
            type="button"
            onClick={onPeople}
            className="min-h-10 rounded-[0.9rem] bg-slate-50 px-4 text-sm font-black text-slate-600"
          >
            Przejdź do osób
          </button>
        </div>
      </section>
    );
  }

  if (contactStep === "confirm") {
    const previewContacts = selectedContacts.slice(0, 4);
    const hiddenCount = Math.max(0, selectedContacts.length - previewContacts.length);

    return (
      <section className="rounded-[1rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] ring-1 ring-slate-100">
        <h2 className="text-lg font-black text-slate-950">
          Wybrano {selectedContacts.length} {getPeopleWord(selectedContacts.length)}
        </h2>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          Sprawdź listę przed importem. Nic nie zapisujemy bez Twojego potwierdzenia.
        </p>

        <div className="mt-3 grid gap-1">
          {previewContacts.map((contact) => (
            <div
              key={contact.key}
              className="flex min-h-10 items-center justify-between rounded-[0.8rem] bg-slate-50 px-3"
            >
              <span className="truncate text-sm font-black text-slate-950">
                {contact.name}
              </span>
              {duplicateContacts.some((duplicate) => duplicate.key === contact.key) && (
                <span className="ml-2 shrink-0 text-[0.65rem] font-black text-slate-400">
                  Już istnieje
                </span>
              )}
            </div>
          ))}
          {hiddenCount > 0 && (
            <p className="px-3 py-1 text-xs font-black text-slate-400">
              +{hiddenCount} osoby
            </p>
          )}
        </div>

        <div className="mt-3 grid gap-1.5 rounded-[0.9rem] bg-sky-50 px-3 py-2 text-xs font-bold leading-5 text-sky-700">
          <p>{contactsToImport.length} osób zostanie dodanych.</p>
          {duplicateContacts.length > 0 && (
            <p>{duplicateContacts.length} osób już istnieje w HappyDate.</p>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-[0.8rem] bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-600">
            {error}
          </p>
        )}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={onImportContacts}
            disabled={contactsToImport.length === 0 || isSaving}
            className="min-h-11 rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)] disabled:opacity-50"
          >
            {isSaving
              ? "Importowanie..."
              : `Importuj ${contactsToImport.length} ${getPeopleWord(
                  contactsToImport.length
                )}`}
          </button>
          <button
            type="button"
            onClick={onChangeChoice}
            className="min-h-10 rounded-[0.9rem] bg-slate-50 px-4 text-sm font-black text-slate-600"
          >
            Zmień wybór
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[1rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] ring-1 ring-slate-100">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-sky-50 text-sky-600">
          <Contact className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-slate-950">
            Wybierz ważne kontakty
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Importujemy tylko wybrane osoby. Pozostałe kontakty nie zostaną
            zapisane w HappyDate.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onPickContacts}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)] transition active:scale-[0.98]"
      >
        <Contact className="h-4 w-4" />
        Wybierz ważne kontakty
      </button>

      {status && (
        <div className="mt-3 rounded-[0.9rem] bg-slate-50 px-3 py-2">
          <p className="text-xs font-bold leading-5 text-slate-600">{status}</p>
          {status.startsWith("Brak dostępu") && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSettings}
                className="flex min-h-9 items-center justify-center gap-1 rounded-[0.75rem] bg-white px-2 text-xs font-black text-sky-700 ring-1 ring-sky-100"
              >
                <Settings className="h-3.5 w-3.5" />
                Ustawienia
              </button>
              <button
                type="button"
                onClick={onManualMode}
                className="min-h-9 rounded-[0.75rem] bg-white px-2 text-xs font-black text-slate-600 ring-1 ring-slate-100"
              >
                Dodaj ręcznie
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SinglePersonFlow({
  mode,
  ModeIcon,
  name,
  relationship,
  birthday,
  sourceText,
  cardImageUrl,
  status,
  error,
  canSave,
  isSaving,
  onNameChange,
  onRelationshipChange,
  onBirthdayChange,
  onSourceTextChange,
  onParseSource,
  onCardImageChange,
  onSubmit,
}: {
  mode: AddMode;
  ModeIcon: typeof Contact;
  name: string;
  relationship: string;
  birthday: string;
  sourceText: string;
  cardImageUrl: string | null;
  status: string | null;
  error: string | null;
  canSave: boolean;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onRelationshipChange: (value: string) => void;
  onBirthdayChange: (value: string) => void;
  onSourceTextChange: (value: string) => void;
  onParseSource: () => void;
  onCardImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-[1rem] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.055)] ring-1 ring-slate-100">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-sky-50 text-sky-600">
          <ModeIcon className="h-5 w-5" />
        </span>
        <p className="text-xs font-semibold leading-5 text-slate-500">
          {getModeHint(mode)}
        </p>
      </div>

      {mode === "card" && (
        <div className="mb-3 grid gap-2">
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[0.9rem] bg-sky-50 text-sm font-black text-sky-700 transition active:scale-[0.98]">
            <Camera className="h-4 w-4" />
            Dodaj zdjęcie wizytówki
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onCardImageChange}
              className="sr-only"
            />
          </label>
          {cardImageUrl && (
            <div className="relative h-28 overflow-hidden rounded-[0.9rem] bg-slate-100">
              <Image
                src={cardImageUrl}
                alt="Podgląd wizytówki"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
        </div>
      )}

      {mode === "link" && (
        <div className="mb-3 grid gap-2">
          <textarea
            value={sourceText}
            onChange={(event) => onSourceTextChange(event.target.value)}
            rows={4}
            placeholder="Wklej vCard, MECARD, link z parametrami name/relationship/birthday albo tekst z QR..."
            className="w-full resize-none rounded-[0.9rem] border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={onParseSource}
            className="flex min-h-10 items-center justify-center gap-2 rounded-[0.9rem] bg-sky-50 text-sm font-black text-sky-700 transition active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            Uzupełnij z linku / QR
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field label="Imię" htmlFor="name">
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className={MobileUI.input}
            autoComplete="name"
          />
        </Field>

        <Field label="Relacja" htmlFor="relationship">
          <input
            id="relationship"
            type="text"
            value={relationship}
            onChange={(event) => onRelationshipChange(event.target.value)}
            className={MobileUI.input}
            placeholder="np. Przyjaciel, Rodzina, Praca"
          />
        </Field>

        <Field label="Urodziny" htmlFor="birthday">
          <input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(event) => onBirthdayChange(event.target.value)}
            className={MobileUI.input}
          />
        </Field>

        {status && (
          <p className="rounded-[0.8rem] bg-sky-50 px-3 py-2 text-xs font-bold leading-5 text-sky-700">
            {status}
          </p>
        )}

        {error && (
          <p className="rounded-[0.8rem] bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSave}
          className="min-h-11 rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)] transition active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? "Zapisywanie..." : "Zapisz osobę"}
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-black text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function getModeHint(mode: AddMode) {
  if (mode === "card") return "Zdjęcie jest tylko podglądem. Dane zapisujesz po uzupełnieniu pól.";
  if (mode === "link") return "Obsługuje vCard, MECARD i proste linki.";

  return "Najprostsza ścieżka dodawania.";
}

function getPeopleWord(count: number) {
  if (count === 1) return "osoba";

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return "osoby";
  }

  return "osób";
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase();

  return normalized || undefined;
}

function normalizePhone(value?: string | null) {
  const normalized = value?.replace(/[^\d+]/g, "");

  return normalized || undefined;
}

function isDuplicateContact(
  contact: ContactDraft,
  existingPeople: PersonRow[],
  existingNames: Set<string>
) {
  const phone = normalizePhone(contact.phone);
  const email = normalizeEmail(contact.email);
  const externalContactId = contact.externalContactId?.trim();

  if (
    phone &&
    existingPeople.some((person) => normalizePhone(person.phone) === phone)
  ) {
    return true;
  }

  if (
    email &&
    existingPeople.some((person) => normalizeEmail(person.email) === email)
  ) {
    return true;
  }

  if (
    externalContactId &&
    existingPeople.some(
      (person) => person.external_contact_id === externalContactId
    )
  ) {
    return true;
  }

  return existingNames.has(normalizeName(contact.name));
}

function parseContactSource(source: string): ParsedContact {
  const text = source.trim();

  if (!text) {
    return {};
  }

  const vCard = parseVCard(text);

  if (Object.keys(vCard).length > 0) {
    return vCard;
  }

  const meCard = parseMeCard(text);

  if (Object.keys(meCard).length > 0) {
    return meCard;
  }

  const urlFields = parseContactUrl(text);

  if (Object.keys(urlFields).length > 0) {
    return urlFields;
  }

  const lines = text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
  const birthday = text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];

  return {
    name: lines[0],
    relationship: lines[1],
    birthday,
    phone: extractPhone(text),
    email: extractEmail(text),
  };
}

function parseVCard(text: string) {
  if (!text.toUpperCase().includes("BEGIN:VCARD")) {
    return {};
  }

  return {
    name: getContactLine(text, "FN") ?? getContactLine(text, "N"),
    relationship: getContactLine(text, "TITLE") ?? getContactLine(text, "ROLE"),
    birthday: normalizeBirthday(getContactLine(text, "BDAY")),
    phone: normalizePhone(getContactLine(text, "TEL")),
    email: normalizeEmail(getContactLine(text, "EMAIL")),
    externalContactId: getContactLine(text, "UID"),
  };
}

function parseMeCard(text: string) {
  if (!text.toUpperCase().startsWith("MECARD:")) {
    return {};
  }

  return {
    name: getMeCardValue(text, "N"),
    relationship: getMeCardValue(text, "ORG"),
    birthday: normalizeBirthday(getMeCardValue(text, "BDAY")),
    phone: normalizePhone(getMeCardValue(text, "TEL")),
    email: normalizeEmail(getMeCardValue(text, "EMAIL")),
  };
}

function parseContactUrl(text: string) {
  try {
    const url = new URL(text);

    return {
      name:
        url.searchParams.get("name") ??
        url.searchParams.get("n") ??
        url.searchParams.get("imie") ??
        undefined,
      relationship:
        url.searchParams.get("relationship") ??
        url.searchParams.get("relacja") ??
        undefined,
      birthday: normalizeBirthday(
        url.searchParams.get("birthday") ??
          url.searchParams.get("bday") ??
          url.searchParams.get("urodziny")
      ),
      phone: normalizePhone(
        url.searchParams.get("phone") ??
          url.searchParams.get("tel") ??
          url.searchParams.get("telefon")
      ),
      email: normalizeEmail(url.searchParams.get("email")),
      externalContactId:
        url.searchParams.get("external_contact_id") ??
        url.searchParams.get("contact_id") ??
        undefined,
    };
  } catch {
    return {};
  }
}

function getContactLine(text: string, key: string) {
  const normalizedKey = key.toUpperCase();
  const line = text
    .split(/\r?\n/)
    .find((item) => {
      const normalizedLine = item.toUpperCase();

      return (
        normalizedLine.startsWith(`${normalizedKey}:`) ||
        normalizedLine.startsWith(`${normalizedKey};`)
      );
    });

  return line?.split(":").slice(1).join(":").replaceAll(";", " ").trim();
}

function getMeCardValue(text: string, key: string) {
  const match = text.match(new RegExp(`${key}:([^;]+)`, "i"));

  return match?.[1]?.replaceAll(",", " ").trim();
}

function normalizeBirthday(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  return undefined;
}

function extractEmail(text: string) {
  return normalizeEmail(text.match(/[^\s;]+@[^\s;]+\.[^\s;]+/)?.[0]);
}

function extractPhone(text: string) {
  return normalizePhone(
    text.match(/(?:\+\d[\d\s().-]{6,}|\b\d[\d\s().-]{7,}\b)/)?.[0]
  );
}
