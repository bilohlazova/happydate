"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Contact,
  Link as LinkIcon,
  Pencil,
  QrCode,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { createPerson } from "@/lib/repositories/personRepository";
import { MobileUI } from "@/lib/theme/mobile";

type AddMode = "contacts" | "manual" | "card" | "link";

type ContactPickerNavigator = Navigator & {
  contacts?: {
    select: (
      properties: string[],
      options?: { multiple?: boolean }
    ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
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
    description: "Wybierz kontakt z telefonu albo wpisz go ręcznie.",
    icon: Contact,
  },
  manual: {
    title: "Dodaj ręcznie",
    description: "Wpisz podstawowe dane ważnej osoby.",
    icon: Pencil,
  },
  card: {
    title: "Zeskanuj wizytówkę",
    description: "Dodaj zdjęcie wizytówki i uzupełnij rozpoznane dane.",
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
  const [authLoading, setAuthLoading] = useState(true);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthday, setBirthday] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
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

  const modeCopy = MODE_COPY[mode];
  const ModeIcon = modeCopy.icon;
  const canSave = Boolean(userId && name.trim() && !authLoading && !isSaving);

  const modeTabs = useMemo(
    () =>
      (Object.keys(MODE_COPY) as AddMode[]).map((item) => ({
        mode: item,
        label: MODE_COPY[item].title.replace("Importuj z ", ""),
      })),
    []
  );

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
        "Ten telefon nie udostępnia wyboru kontaktu w WebView. Możesz wpisać dane poniżej."
      );
      return;
    }

    try {
      const [contact] = await contactNavigator.contacts.select(["name"], {
        multiple: false,
      });
      const [contactName] = contact?.name ?? [];

      if (contactName) {
        setName(contactName);
        setStatus("Kontakt został wybrany. Uzupełnij relację i zapisz.");
      }
    } catch (pickError) {
      console.error("[AddPersonPage] contact pick failed:", pickError);
      setStatus("Nie wybrano kontaktu. Możesz wpisać dane ręcznie.");
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
            <h1 className="truncate text-[1.65rem] font-black leading-none text-slate-950">
              Dodaj osobę
            </h1>
            <p className="mt-0.5 truncate text-[0.82rem] font-semibold text-slate-500">
              {modeCopy.description}
            </p>
          </div>
        </header>

        <nav className="grid grid-cols-4 gap-1 rounded-[1rem] bg-white p-1 shadow-[0_6px_18px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
          {modeTabs.map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => {
                setMode(item.mode);
                window.history.replaceState(null, "", `/people/add?mode=${item.mode}`);
              }}
              className={`min-h-9 rounded-[0.75rem] px-1 text-[0.62rem] font-black leading-3 transition ${
                mode === item.mode
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-[0_6px_14px_rgba(14,165,233,0.22)]"
                  : "text-slate-500 hover:bg-sky-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="rounded-[1rem] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.055)] ring-1 ring-slate-100">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-sky-50 text-sky-600">
              <ModeIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-950">
                {modeCopy.title}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {getModeHint(mode)}
              </p>
            </div>
          </div>

          {mode === "contacts" && (
            <button
              type="button"
              onClick={handleContactPick}
              className="mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[0.9rem] bg-sky-50 text-sm font-black text-sky-700 transition active:scale-[0.98]"
            >
              <Contact className="h-4 w-4" />
              Wybierz kontakt z telefonu
            </button>
          )}

          {mode === "card" && (
            <div className="mb-3 grid gap-2">
              <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[0.9rem] bg-sky-50 text-sm font-black text-sky-700 transition active:scale-[0.98]">
                <Camera className="h-4 w-4" />
                Dodaj zdjęcie wizytówki
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCardImageChange}
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
                onChange={(event) => setSourceText(event.target.value)}
                rows={4}
                placeholder="Wklej vCard, MECARD, link z parametrami name/relationship/birthday albo tekst z QR..."
                className="w-full resize-none rounded-[0.9rem] border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-100"
              />
              <button
                type="button"
                onClick={handleParseSource}
                className="flex min-h-10 items-center justify-center gap-2 rounded-[0.9rem] bg-sky-50 text-sm font-black text-sky-700 transition active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                Uzupełnij z linku / QR
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Field label="Imię" htmlFor="name">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={MobileUI.input}
                autoComplete="name"
              />
            </Field>

            <Field label="Relacja" htmlFor="relationship">
              <input
                id="relationship"
                type="text"
                value={relationship}
                onChange={(event) => setRelationship(event.target.value)}
                className={MobileUI.input}
                placeholder="np. Przyjaciel, Rodzina, Praca"
              />
            </Field>

            <Field label="Urodziny" htmlFor="birthday">
              <input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(event) => setBirthday(event.target.value)}
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
      </div>
    </main>
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
  if (mode === "contacts") return "Najpierw kontakt, potem relacja.";
  if (mode === "card") return "Zdjęcie zostaje tylko podglądem na tym ekranie.";
  if (mode === "link") return "Obsługuje vCard, MECARD i proste linki.";

  return "Najprostsza ścieżka dodawania.";
}

function parseContactSource(source: string) {
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
    };
  } catch {
    return {};
  }
}

function getContactLine(text: string, key: string) {
  const line = text
    .split(/\r?\n/)
    .find((item) => item.toUpperCase().startsWith(`${key}:`));

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
