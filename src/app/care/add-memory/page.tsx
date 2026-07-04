"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PeopleSelect from "@/components/people/PeopleSelect";
import { supabase } from "@/lib/supabaseClient";
import { createMemory } from "@/lib/repositories/memoryRepository";

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
  { value: "memory", label: "Wspomnienie" },
  { value: "flower", label: "Ulubione kwiaty" },
  { value: "coffee", label: "Ulubiona kawa" },
  { value: "restaurant", label: "Restauracja" },
  { value: "food", label: "Ulubione jedzenie" },
  { value: "movie", label: "Film" },
  { value: "book", label: "Książka" },
  { value: "music", label: "Muzyka" },
  { value: "hobby", label: "Hobby" },
] as const;

type MemoryType = (typeof MEMORY_TYPES)[number]["value"];

function AddMemoryForm() {
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
      setError("Nie udało się ustalić użytkownika. Zaloguj się ponownie.");
      return;
    }

    if (!personId.trim()) {
      setError("Wybierz osobę.");
      return;
    }

    if (!title.trim()) {
      setError("Podaj tytuł.");
      return;
    }

    if (!value.trim()) {
      setError("Podaj wartość.");
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
      setError("Nie udało się zapisać. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">
        Dodaj pamięć
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PeopleSelect
          userId={userId ?? ""}
          value={personId}
          onChange={setPersonId}
          disabled={Boolean(preselectedPersonId)}
        />

        {/* Typ */}
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm font-medium text-gray-700">
            Typ
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as MemoryType)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {MEMORY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tytuł */}
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="text-sm font-medium text-gray-700">
            Tytuł
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Np. Ulubiona kawiarnia"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Wartość */}
        <div className="flex flex-col gap-1">
          <label htmlFor="value" className="text-sm font-medium text-gray-700">
            Wartość
          </label>
          <input
            id="value"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Np. Cappuccino bez cukru"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Data */}
        <div className="flex flex-col gap-1">
          <label htmlFor="occurredOn" className="text-sm font-medium text-gray-700">
            Data
          </label>
          <input
            id="occurredOn"
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Notatka */}
        <div className="flex flex-col gap-1">
          <label htmlFor="content" className="text-sm font-medium text-gray-700">
            Notatka
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Dodatkowe szczegóły..."
            rows={4}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-rose-600">{error}</p>
        )}

        {/* Zapisz */}
        <button
          type="submit"
          disabled={isSaving || authLoading || !userId}
          className="mt-2 rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSaving ? "Zapisywanie..." : "Zapisz"}
        </button>
      </form>
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