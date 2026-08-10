"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { createPerson, getPeople } from "@/lib/repositories/personRepository";
import type {
  PersonGender,
  PersonRelationKey,
  PersonRow,
} from "@/lib/repositories/person.types";
import { GenderSelectField } from "@/components/people/GenderSelectField";
import { RelationPickerField } from "@/components/people/RelationPickerField";
import {
  getRelationCategoryForKey,
  getRelationLabel,
  inferRelationKeyFromLabel,
  type RelationCategory,
} from "@/components/people/peopleRelations";
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
    titleKey: "importTitle" | "manualTitle" | "cardTitle" | "linkTitle";
    descriptionKey:
      | "importDescription"
      | "manualDescription"
      | "cardDescription"
      | "linkDescription";
    icon: typeof Contact;
  }
> = {
  contacts: {
    titleKey: "importTitle",
    descriptionKey: "importDescription",
    icon: Contact,
  },
  manual: {
    titleKey: "manualTitle",
    descriptionKey: "manualDescription",
    icon: Pencil,
  },
  card: {
    titleKey: "cardTitle",
    descriptionKey: "cardDescription",
    icon: QrCode,
  },
  link: {
    titleKey: "linkTitle",
    descriptionKey: "linkDescription",
    icon: LinkIcon,
  },
};

export default function AddPersonPage() {
  const t = useTranslations("personForm");
  const peopleT = useTranslations("people");
  const router = useRouter();
  const [mode, setMode] = useState<AddMode>("manual");
  const [userId, setUserId] = useState<string | null>(null);
  const [existingPeople, setExistingPeople] = useState<PersonRow[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [relationKey, setRelationKey] = useState<PersonRelationKey | null>(
    null
  );
  const [relationCategory, setRelationCategory] =
    useState<RelationCategory | null>(null);
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<PersonGender>("unspecified");
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
  const [showContactSettings, setShowContactSettings] = useState(false);
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
      setError(
        mode === "manual"
          ? t("validation.unauthorized")
          : t("contact.unauthorizedAdd")
      );
      return;
    }

    if (!name.trim()) {
      setError(
        mode === "manual"
          ? t("validation.nameRequired")
          : t("contact.nameRequired")
      );
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const resolvedRelation = getRelationLabel(
        relationKey,
        gender,
        relationship
      );

      await createPerson({
        userId,
        name: name.trim(),
        relationship: resolvedRelation || undefined,
        relationLabel: resolvedRelation || undefined,
        relationKey,
        relationCategory:
          getRelationCategoryForKey(relationKey) ?? relationCategory,
        birthday: birthday || undefined,
        phone: normalizePhone(phone),
        email: normalizeEmail(email),
        externalContactId: externalContactId.trim() || undefined,
        contactSource: mode,
        gender,
      });

      router.push("/people");
    } catch (submitError) {
      console.error("[AddPersonPage] createPerson failed:", submitError);
      setError(
        mode === "manual" ? t("states.saveError") : t("contact.saveError")
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleContactPick() {
    setError(null);
    setStatus(null);
    setShowContactSettings(false);

    const contactNavigator = navigator as ContactPickerNavigator;

    if (!contactNavigator.contacts?.select) {
      setStatus(t("contact.unsupported"));
      setShowContactSettings(true);
      return;
    }

    try {
      const contacts = await contactNavigator.contacts.select(
        ["name", "tel", "email"],
        { multiple: true }
      );
      const drafts = contacts.reduce<ContactDraft[]>(
        (drafts, contact, index) => {
          const [contactName] = contact.name ?? [];

          if (!contactName?.trim()) {
            return drafts;
          }

          drafts.push({
            key: `${contactName}-${
              contact.id ?? contact.tel?.[0] ?? contact.email?.[0] ?? index
            }`,
            name: contactName.trim(),
            phone: normalizePhone(contact.tel?.[0]),
            email: normalizeEmail(contact.email?.[0]),
            externalContactId: contact.id,
          });

          return drafts;
        },
        []
      );

      if (drafts.length === 0) {
        setStatus(t("contact.noneSelected"));
        return;
      }

      setSelectedContacts(drafts);
      setContactStep("confirm");
    } catch (pickError) {
      console.error("[AddPersonPage] contact pick failed:", pickError);
      setStatus(t("contact.denied"));
      setShowContactSettings(true);
    }
  }

  async function handleImportContacts() {
    if (!userId) {
      setError(t("contact.unauthorizedImport"));
      return;
    }

    if (contactsToImport.length === 0) {
      setError(t("contact.noNew"));
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
            relationLabel: contact.relationship,
            relationKey: contact.relationship
              ? inferRelationKeyFromLabel(contact.relationship)
              : null,
            relationCategory: contact.relationship
              ? getRelationCategoryForKey(
                  inferRelationKeyFromLabel(contact.relationship)
                )
              : null,
            birthday: contact.birthday,
            gender: "unspecified",
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
      setError(t("contact.importError"));
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
    setStatus(t("contact.imageAdded"));
  }

  function handleParseSource() {
    const parsed = parseContactSource(sourceText);

    if (!parsed.name && !parsed.relationship && !parsed.birthday) {
      setStatus(t("contact.parseFailed"));
      return;
    }

    if (parsed.name) setName(parsed.name);
    if (parsed.relationship) {
      const nextRelationKey = inferRelationKeyFromLabel(parsed.relationship);

      setRelationship(
        getRelationLabel(nextRelationKey, gender, parsed.relationship)
      );
      setRelationKey(nextRelationKey);
      setRelationCategory(getRelationCategoryForKey(nextRelationKey));
    }
    if (parsed.birthday) setBirthday(parsed.birthday);
    if (parsed.phone) setPhone(parsed.phone);
    if (parsed.email) setEmail(parsed.email);
    if (parsed.externalContactId)
      setExternalContactId(parsed.externalContactId);
    setStatus(t("contact.parsed"));
  }

  return (
    <main className={`add-person-page ${MobileUI.screen} ${MobileUI.contentBottom}`}>
      <div className="add-person-layout mx-auto flex w-full flex-col gap-3 px-4 sm:px-5">
        <header className="add-person-header flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="add-person-back flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.06)] ring-1 ring-slate-100"
            aria-label={t("actions.back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="add-person-header__title truncate text-[1.7rem] font-black leading-none text-slate-950">
              {mode === "manual"
                ? t("title.add")
                : peopleT(`actions.${modeCopy.titleKey}`)}
            </h1>
            <p className="mt-0.5 text-[0.82rem] font-semibold leading-4 text-slate-500">
              {mode === "manual"
                ? t("subtitle.add")
                : peopleT(`actions.${modeCopy.descriptionKey}`)}
            </p>
          </div>
        </header>

        <ModeSwitcher
          activeMode={mode}
          peopleT={peopleT}
          onChange={(nextMode) => {
            setMode(nextMode);
            setError(null);
            setStatus(null);
            router.replace(`/people/add?mode=${nextMode}`);
          }}
        />

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
            showContactSettings={showContactSettings}
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
              setShowContactSettings(false);
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
            relationKey={relationKey}
            birthday={birthday}
            gender={gender}
            sourceText={sourceText}
            cardImageUrl={cardImageUrl}
            status={status}
            error={error}
            canSave={canSave}
            isSaving={isSaving}
            onNameChange={setName}
            onRelationshipChange={(value, category) => {
              setRelationship(value);
              setRelationCategory(category);
            }}
            onRelationKeyChange={setRelationKey}
            onBirthdayChange={setBirthday}
            onGenderChange={(value) => {
              setGender(value);

              if (relationKey && relationKey !== "other") {
                setRelationship(getRelationLabel(relationKey, value));
              }
            }}
            onSourceTextChange={setSourceText}
            onParseSource={handleParseSource}
            onCardImageChange={handleCardImageChange}
            onSubmit={handleSubmit}
            localized={mode === "manual"}
          />
        )}
      </div>
    </main>
  );
}

function ModeSwitcher({
  activeMode,
  peopleT,
  onChange,
}: {
  activeMode: AddMode;
  peopleT: ReturnType<typeof useTranslations<"people">>;
  onChange: (mode: AddMode) => void;
}) {
  return (
    <nav className="add-person-modes" aria-label={peopleT("actions.addPerson")}>
      {(Object.keys(MODE_COPY) as AddMode[]).map((mode) => {
        const copy = MODE_COPY[mode];
        const Icon = copy.icon;
        const selected = activeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-current={selected ? "step" : undefined}
            onClick={() => onChange(mode)}
            className={`add-person-mode ${selected ? "add-person-mode--active" : ""}`}
          >
            <span className="add-person-mode__icon"><Icon aria-hidden="true" /></span>
            <span className="min-w-0">
              <strong>{peopleT(`actions.${copy.titleKey}`)}</strong>
              <small>{peopleT(`actions.${copy.descriptionKey}`)}</small>
            </span>
          </button>
        );
      })}
    </nav>
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
  showContactSettings,
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
  showContactSettings: boolean;
  error: string | null;
  isSaving: boolean;
  onPickContacts: () => void;
  onImportContacts: () => void;
  onManualMode: () => void;
  onChangeChoice: () => void;
  onPeople: () => void;
  onSettings: () => void;
}) {
  const t = useTranslations("personForm.contact");
  if (contactStep === "success") {
    return (
      <section className="add-person-card rounded-[1rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">
              {t("success", { count: importedCount })}
            </h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {t("missing", {
                birthdays: missingBirthdayCount,
                relations: missingRelationCount,
              })}
            </p>
          </div>
        </div>

        {skippedDuplicateCount > 0 && (
          <p className="mt-3 rounded-[0.8rem] bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
            {t("duplicatesSkipped", { count: skippedDuplicateCount })}
          </p>
        )}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={onPeople}
            className="min-h-11 rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)]"
          >
            {t("completeData")}
          </button>
          <button
            type="button"
            onClick={onPeople}
            className="min-h-10 rounded-[0.9rem] bg-slate-50 px-4 text-sm font-black text-slate-600"
          >
            {t("goPeople")}
          </button>
        </div>
      </section>
    );
  }

  if (contactStep === "confirm") {
    const previewContacts = selectedContacts.slice(0, 4);
    const hiddenCount = Math.max(
      0,
      selectedContacts.length - previewContacts.length
    );

    return (
      <section className="add-person-card rounded-[1rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] ring-1 ring-slate-100">
        <h2 className="text-lg font-black text-slate-950">
          {t("selected", { count: selectedContacts.length })}
        </h2>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          {t("review")}
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
              {duplicateContacts.some(
                (duplicate) => duplicate.key === contact.key
              ) && (
                <span className="ml-2 shrink-0 text-[0.65rem] font-black text-slate-400">
                  {t("exists")}
                </span>
              )}
            </div>
          ))}
          {hiddenCount > 0 && (
            <p className="px-3 py-1 text-xs font-black text-slate-400">
              {t("hidden", { count: hiddenCount })}
            </p>
          )}
        </div>

        <div className="mt-3 grid gap-1.5 rounded-[0.9rem] bg-sky-50 px-3 py-2 text-xs font-bold leading-5 text-sky-700">
          <p>{t("willAdd", { count: contactsToImport.length })}</p>
          {duplicateContacts.length > 0 && (
            <p>{t("alreadyExists", { count: duplicateContacts.length })}</p>
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
              ? t("importing")
              : t("import", { count: contactsToImport.length })}
          </button>
          <button
            type="button"
            onClick={onChangeChoice}
            className="min-h-10 rounded-[0.9rem] bg-slate-50 px-4 text-sm font-black text-slate-600"
          >
            {t("change")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="add-person-card add-person-contact-card rounded-[1rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] ring-1 ring-slate-100">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-sky-50 text-sky-600">
          <Contact className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-slate-950">
            {t("chooseTitle")}
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {t("privacy")}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onPickContacts}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)] transition active:scale-[0.98]"
      >
        <Contact className="h-4 w-4" />
        {t("chooseTitle")}
      </button>

      {status && (
        <div className="mt-3 rounded-[0.9rem] bg-slate-50 px-3 py-2">
          <p className="text-xs font-bold leading-5 text-slate-600">{status}</p>
          {showContactSettings && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSettings}
                className="flex min-h-9 items-center justify-center gap-1 rounded-[0.75rem] bg-white px-2 text-xs font-black text-sky-700 ring-1 ring-sky-100"
              >
                <Settings className="h-3.5 w-3.5" />
                {t("settings")}
              </button>
              <button
                type="button"
                onClick={onManualMode}
                className="min-h-9 rounded-[0.75rem] bg-white px-2 text-xs font-black text-slate-600 ring-1 ring-slate-100"
              >
                {t("manual")}
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
  relationKey,
  birthday,
  gender,
  sourceText,
  cardImageUrl,
  status,
  error,
  canSave,
  isSaving,
  onNameChange,
  onRelationshipChange,
  onRelationKeyChange,
  onBirthdayChange,
  onGenderChange,
  onSourceTextChange,
  onParseSource,
  onCardImageChange,
  onSubmit,
  localized,
}: {
  mode: AddMode;
  ModeIcon: typeof Contact;
  name: string;
  relationship: string;
  relationKey: PersonRelationKey | null;
  birthday: string;
  gender: PersonGender;
  sourceText: string;
  cardImageUrl: string | null;
  status: string | null;
  error: string | null;
  canSave: boolean;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onRelationshipChange: (
    value: string,
    category: RelationCategory | null
  ) => void;
  onRelationKeyChange: (value: PersonRelationKey | null) => void;
  onBirthdayChange: (value: string) => void;
  onGenderChange: (value: PersonGender) => void;
  onSourceTextChange: (value: string) => void;
  onParseSource: () => void;
  onCardImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  localized: boolean;
}) {
  const t = useTranslations("personForm");
  return (
    <section className="add-person-card add-person-form-card rounded-[1rem] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)] ring-1 ring-slate-100 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-sky-50 text-sky-600">
          <ModeIcon className="h-5 w-5" />
        </span>
        <p className="text-xs font-semibold leading-5 text-slate-500">
          {t("hint")}
        </p>
      </div>

      {mode === "card" && (
        <div className="mb-3 grid gap-2">
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[0.9rem] bg-sky-50 text-sm font-black text-sky-700 transition active:scale-[0.98]">
            <Camera className="h-4 w-4" />
            {t("capture.addCardImage")}
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
                alt={t("capture.cardPreview")}
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
            placeholder={t("capture.linkPlaceholder")}
            className="w-full resize-none rounded-[0.9rem] border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={onParseSource}
            className="flex min-h-10 items-center justify-center gap-2 rounded-[0.9rem] bg-sky-50 text-sm font-black text-sky-700 transition active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            {t("capture.parseLink")}
          </button>
        </div>
      )}

      <form
        aria-label={t("accessibility.form")}
        onSubmit={onSubmit}
        className="add-person-form flex flex-col gap-4"
      >
        <Field label={t("fields.name")} htmlFor="name">
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className={MobileUI.input}
            autoComplete="name"
          />
        </Field>

        <GenderSelectField
          value={gender}
          onChange={onGenderChange}
          localized={localized}
        />

        <RelationPickerField
          value={relationship}
          valueKey={relationKey}
          gender={gender}
          localized={localized}
          onChange={(value, category, key) => {
            onRelationshipChange(value, category);
            onRelationKeyChange(key);
          }}
        />

        <Field label={t("fields.birthday")} htmlFor="birthday">
          <input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(event) => onBirthdayChange(event.target.value)}
            className={MobileUI.input}
            aria-label={t("accessibility.birthdayInput")}
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
          {t(isSaving ? "states.saving" : "actions.save")}
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
    <div className="add-person-field flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-black text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
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
  const line = text.split(/\r?\n/).find((item) => {
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
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(
      6,
      8
    )}`;
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
