"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PeopleSelect from "@/components/people/PeopleSelect";
import { supabase } from "@/lib/supabaseClient";
import { createMemory } from "@/lib/repositories/memoryRepository";
import { MobileUI } from "@/lib/theme/mobile";
import { useTranslations } from "next-intl";

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
  { value: "memory" },
  { value: "flower" },
  { value: "coffee" },
  { value: "restaurant" },
  { value: "food" },
  { value: "movie" },
  { value: "book" },
  { value: "music" },
  { value: "hobby" },
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

  // ── Submit: real persistence via createMemory() ──────────────────────
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

      await createMemory({
        userId,
        personId: personId.trim(),
        type,
        title: title.trim(),
        value: value.trim(),
        content: content.trim() || undefined,
        occurredOn: occurredOn || undefined,
      });

      if (preselectedPersonId) {
        router.push(`/people/${preselectedPersonId}`);
      } else {
        router.push("/care");
      }
    } catch (err) {
      console.error("[AddMemoryPage] createMemory failed:", err);
      setError(t("errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={`${MobileUI.screen} ${MobileUI.contentBottom} pt-4`}>
      <div className={`${MobileUI.container} ${MobileUI.stack}`}>
        <header>
          <h1 className={MobileUI.title}>{t("title")}</h1>
          <p className={MobileUI.pageSubtitle}>{t("subtitle")}</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className={`${MobileUI.card} flex flex-col gap-4 p-4`}
        >
          <PeopleSelect
            userId={userId ?? ""}
            value={personId}
            onChange={setPersonId}
            disabled={Boolean(preselectedPersonId)}
          />

          {/* Typ */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="type" className="text-sm font-bold text-gray-700">
              {t("type")}
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as MemoryType)}
              className={MobileUI.input}
            >
              {MEMORY_TYPES.map((memoryType) => (
                <option key={memoryType.value} value={memoryType.value}>
                  {t(`types.${memoryType.value}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Tytuł */}
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
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
          {error && <p className="text-sm text-rose-600">{error}</p>}

          {/* Zapisz */}
          <button
            type="submit"
            disabled={isSaving || authLoading || !userId}
            className={`${MobileUI.button} mt-2 bg-rose-500 text-white disabled:opacity-50`}
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
