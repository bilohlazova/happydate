"use client";

// Person Details page.
// Shows a single person's core info: name, relationship, birthday, notes,
// plus a list of their memories.
// Data is loaded through the Person Repository and Memory Repository.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";
import { getPersonById } from "@/lib/repositories/personRepository";
import type { PersonRow } from "@/lib/repositories/person.types";
import { getMemoriesForPerson } from "@/lib/repositories/memoryRepository";
import type { MemoryRow } from "@/lib/repositories/memory.types";
import MemoryList from "@/components/memories/MemoryList";

export default function PersonDetailsPage() {
  const params = useParams<{ id: string }>();
  const personId = params.id;

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

  // Person data
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [personLoading, setPersonLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setPerson(null);
      setPersonLoading(false);
      return;
    }

    if (!personId) {
      setPerson(null);
      setPersonLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPerson(id: string) {
      try {
        setPersonLoading(true);
        const row = await getPersonById(id);

        if (isMounted) {
          setPerson(row);
        }
      } catch (error) {
        console.error("[PersonDetailsPage] getPersonById failed:", error);
        if (isMounted) {
          setPerson(null);
        }
      } finally {
        if (isMounted) {
          setPersonLoading(false);
        }
      }
    }

    void loadPerson(personId);

    return () => {
      isMounted = false;
    };
  }, [authLoading, userId, personId]);

  // Memories data
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setMemories([]);
      setMemoriesLoading(false);
      return;
    }

    if (!personId) {
      setMemories([]);
      setMemoriesLoading(false);
      return;
    }

    let isMounted = true;

    async function loadMemories(id: string) {
      try {
        setMemoriesLoading(true);

        const rows = await getMemoriesForPerson(id);

        if (isMounted) {
          setMemories(rows);
        }
      } catch (error) {
        console.error(
          "[PersonDetailsPage] getMemoriesForPerson failed:",
          error
        );

        if (isMounted) {
          setMemories([]);
        }
      } finally {
        if (isMounted) {
          setMemoriesLoading(false);
        }
      }
    }

    void loadMemories(personId);

    return () => {
      isMounted = false;
    };
  }, [authLoading, userId, personId]);

  const loading =
    authLoading ||
    personLoading ||
    memoriesLoading;

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-gray-600">Ładowanie...</p>
      </main>
    );
  }

  if (!person) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-gray-600">Nie znaleziono osoby</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">{person.name}</h1>

      <div className="flex flex-col gap-3 rounded-md border border-gray-200 p-4">
        {person.relationship && (
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Relacja
            </p>
            <p className="text-sm text-gray-900">{person.relationship}</p>
          </div>
        )}

        {person.birthday && (
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Urodziny
            </p>
            <p className="text-sm text-gray-900">{person.birthday}</p>
          </div>
        )}

        {person.notes && (
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Notatki
            </p>
            <p className="text-sm text-gray-900">{person.notes}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Link
          href={`/care/add-memory?personId=${person.id}`}
          className="inline-block rounded-md bg-rose-500 px-4 py-2 text-sm text-white"
        >
          + Dodaj wspomnienie
        </Link>
      </div>

      <div className="mt-8">
        <MemoryList memories={memories} />
      </div>
    </main>
  );
}