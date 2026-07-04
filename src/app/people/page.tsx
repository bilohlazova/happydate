"use client";

// Displays all people belonging to the authenticated user.
// Data is loaded through the Person Repository.

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";
import { getPeople } from "@/lib/repositories/personRepository";
import type { PersonRow } from "@/lib/repositories/person.types";

export default function PeoplePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);

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
    if (authLoading) return;

    if (!userId) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPeople(uid: string) {
      try {
        setPeopleLoading(true);
        const rows = await getPeople(uid);

        if (isMounted) {
          setPeople(rows);
        }
      } catch (error) {
        console.error("[PeoplePage] getPeople failed:", error);
      } finally {
        if (isMounted) {
          setPeopleLoading(false);
        }
      }
    }

    void loadPeople(userId);

    return () => {
      isMounted = false;
    };
  }, [authLoading, userId]);

  const loading = authLoading || peopleLoading;

  const header = (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Osoby</h1>
      <Link
        href="/people/add"
        className="rounded-md bg-rose-500 px-4 py-2 text-sm text-white"
      >
        + Dodaj osobę
      </Link>
    </div>
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        {header}
        <p className="text-sm text-gray-600">Ładowanie...</p>
      </main>
    );
  }

  if (people.length === 0) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        {header}
        <p className="text-sm text-gray-600">Brak osób</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      {header}

      <ul className="flex flex-col gap-3">
        {people.map((person) => (
          <li key={person.id}>
            <Link
              href={`/people/${person.id}`}
              className="block rounded-md border border-gray-200 p-4 transition-colors hover:border-rose-300 hover:bg-rose-50"
            >
              <h2 className="font-medium text-gray-900">{person.name}</h2>

              {person.relationship && (
                <p className="mt-1 text-sm text-gray-600">
                  {person.relationship}
                </p>
              )}

              {person.birthday && (
                <p className="mt-1 text-sm text-gray-600">
                  {person.birthday}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}