"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { createPerson } from "@/lib/repositories/personRepository";
import { MobileUI } from "@/lib/theme/mobile";

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
    <main className={`${MobileUI.screen} ${MobileUI.contentBottom} pt-4`}>
      <div className={`${MobileUI.container} ${MobileUI.stack}`}>
        <header>
          <h1 className={MobileUI.title}>Dodaj osobę</h1>
          <p className={MobileUI.pageSubtitle}>Zapisz najważniejsze dane relacji.</p>
        </header>

      <form onSubmit={handleSubmit} className={`${MobileUI.card} flex flex-col gap-4 p-4`}>
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-sm font-bold text-gray-700"
          >
            Imię
          </label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={MobileUI.input}
          />
        </div>

        {/* Relationship */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="relationship"
            className="text-sm font-bold text-gray-700"
          >
            Relacja
          </label>

          <input
            id="relationship"
            type="text"
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            className={MobileUI.input}
          />
        </div>

        {/* Birthday */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="birthday"
            className="text-sm font-bold text-gray-700"
          >
            Urodziny
          </label>

          <input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(event) => setBirthday(event.target.value)}
            className={MobileUI.input}
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
          className={`${MobileUI.button} bg-rose-500 text-white disabled:opacity-50`}
        >
          {isSaving ? "Zapisywanie..." : "Zapisz"}
        </button>
      </form>
      </div>
    </main>
  );
}
