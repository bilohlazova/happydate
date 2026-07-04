"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { createPerson } from "@/lib/repositories/personRepository";

// Add Person page.
// Creates a new person via the Person Repository.
export default function AddPersonPage() {
  const router = useRouter();

  // Authentication
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  // Form state
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthday, setBirthday] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
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
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">
        Dodaj osobę
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        {/* Name */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="name"
            className="text-sm font-medium text-gray-700"
          >
            Imię
          </label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Relationship */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="relationship"
            className="text-sm font-medium text-gray-700"
          >
            Relacja
          </label>

          <input
            id="relationship"
            type="text"
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Birthday */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="birthday"
            className="text-sm font-medium text-gray-700"
          >
            Urodziny
          </label>

          <input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(event) => setBirthday(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-rose-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={authLoading || isSaving || !userId}
          className="rounded-md bg-rose-500 px-4 py-2 text-white disabled:opacity-50"
        >
          {isSaving ? "Zapisywanie..." : "Zapisz"}
        </button>
      </form>
    </main>
  );
}