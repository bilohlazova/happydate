"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PeopleSelect from "@/components/people/PeopleSelect";
import { supabase } from "@/lib/supabaseClient";
import { createKnowledge } from "@/lib/repositories/knowledgeRepository";
import { MobileUI } from "@/lib/theme/mobile";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  BookHeart,
  BookOpen,
  Coffee,
  Film,
  Flower2,
  Music2,
  Palette,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Add Memory page.
// Creates a new memory via the Memory Repository.
// Authentication currently follows the same pattern
// as HomePageClient.
// If a `personId` query param is present (e.g. navigated from a person's
// profile page), the person is pre-selected and locked, and after saving
// the user is redirected back to that person's page.
// ─────────────────────────────────────────────────────────────────────────────

const MEMORY_TYPES = [
  { value: "memory", icon: BookHeart },
  { value: "flower", icon: Flower2 },
  { value: "coffee", icon: Coffee },
  { value: "restaurant", icon: UtensilsCrossed },
  { value: "food", icon: UtensilsCrossed },
  { value: "movie", icon: Film },
  { value: "book", icon: BookOpen },
  { value: "music", icon: Music2 },
  { value: "hobby", icon: Palette },
] as const;

type MemoryType = (typeof MEMORY_TYPES)[number]["value"];

function AddMemoryForm() {
  const t = useTranslations("care.memory");
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPersonId = searchParams.get("personId");

  // ── Auth: userId loaded on mount, same pattern as HomePageClient ────────
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // TODO:
    // Replace with a shared auth hook (e.g. useCurrentUser())
    // once authentication is centralized. Currently duplicated
    // from HomePageClient's supabase.auth.getUser() pattern.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      setUserId(user?.id ?? null);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Form state ────────────────────────────────────────────────────────
  const [personId, setPersonId] = useState(preselectedPersonId ?? "");
  const [type, setType] = useState<MemoryType>("memory");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Submit: canonical Knowledge persistence ──────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userId) {
      setError(t("errors.auth"));
      return;
    }

    if (!personId.trim()) {
      setError(t("errors.person"));
      return;
    }

    if (!title.trim()) {
      setError(t("errors.title"));
      return;
    }

    if (!value.trim()) {
      setError(t("errors.value"));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await createKnowledge({
        userId,
        personId: personId.trim(),
        legacyType: type,
        title: title.trim(),
        value: value.trim(),
        content: content.trim() || null,
        occurredOn: occurredOn || null,
        source: "manual",
        importance: 0,
      });

      if (preselectedPersonId) {
        router.push(`/people/${preselectedPersonId}`);
      } else {
        router.push("/care");
      }
    } catch (err) {
      console.error("[AddMemoryPage] createKnowledge failed:", err);
      setError(t("errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={`add-memory-page ${MobileUI.screen} ${MobileUI.contentBottom}`}>
      <div className="add-memory-layout mx-auto flex w-full flex-col gap-3 px-4 sm:px-5">
        <header className="add-memory-header flex items-center gap-3">
          <button type="button" onClick={() => router.back()} aria-label={t("back")} className="add-memory-back">
            <ArrowLeft aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="add-memory-title">{t("title")}</h1>
            <p className="add-memory-subtitle">{t("subtitle")}</p>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="add-memory-card flex flex-col gap-5 p-4 sm:p-5"
        >
          <div className="add-memory-field">
            <PeopleSelect
              userId={userId ?? ""}
              value={personId}
              onChange={setPersonId}
              disabled={Boolean(preselectedPersonId)}
            />
          </div>

          <fieldset className="add-memory-type-fieldset">
            <legend>{t("type")}</legend>
            <div className="add-memory-types">
              {MEMORY_TYPES.map((memoryType) => {
                const Icon = memoryType.icon;
                const selected = type === memoryType.value;
                return (
                  <button
                    key={memoryType.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setType(memoryType.value)}
                    className={`add-memory-type ${selected ? "add-memory-type--active" : ""}`}
                  >
                    <Icon aria-hidden="true" />
                    <span>{t(`types.${memoryType.value}`)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Tytuł */}
          <div className="add-memory-field flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-bold text-gray-700">
              {t("fields.title")}
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("fields.titlePlaceholder")}
              className={MobileUI.input}
            />
          </div>

          {/* Wartość */}
          <div className="add-memory-field flex flex-col gap-1.5">
            <label htmlFor="value" className="text-sm font-bold text-gray-700">
              {t("fields.value")}
            </label>
            <input
              id="value"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("fields.valuePlaceholder")}
              className={MobileUI.input}
            />
          </div>

          {/* Data */}
          <div className="add-memory-field flex flex-col gap-1.5">
            <label
              htmlFor="occurredOn"
              className="text-sm font-bold text-gray-700"
            >
              {t("fields.date")}
            </label>
            <input
              id="occurredOn"
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              className={MobileUI.input}
            />
          </div>

          {/* Notatka */}
          <div className="add-memory-field flex flex-col gap-1.5">
            <label
              htmlFor="content"
              className="text-sm font-bold text-gray-700"
            >
              {t("fields.note")}
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("fields.notePlaceholder")}
              rows={4}
              className={`${MobileUI.input} h-auto min-h-28 py-3`}
            />
          </div>

          {/* Error message */}
          {error && <p className="add-memory-error" role="alert">{error}</p>}

          <p className="add-memory-privacy">
            <ShieldCheck aria-hidden="true" />
            {t("privacy")}
          </p>

          {/* Zapisz */}
          <button
            type="submit"
            disabled={isSaving || authLoading || !userId}
            className="add-memory-submit disabled:opacity-50"
          >
            {isSaving ? t("saving") : t("save")}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AddMemoryPage() {
  return (
    <Suspense fallback={null}>
      <AddMemoryForm />
    </Suspense>
  );
}
