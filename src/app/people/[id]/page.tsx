"use client";

// Person Details page.
// Shows a single person's profile, HappyDate insights,
// highlights and memories.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getPersonById } from "@/lib/repositories/personRepository";
import type { PersonRow } from "@/lib/repositories/person.types";
import { getMemoriesForPerson } from "@/lib/repositories/memoryRepository";
import type { MemoryRow } from "@/lib/repositories/memory.types";

import PersonCard from "@/components/people/PersonCard";
import PersonHighlights from "@/components/people/PersonHighlights";
import HappyDateAdvisor from "@/components/advisor/HappyDateAdvisor";
import MemoryList from "@/components/memories/MemoryList";

import { getPersonAdvisorTips } from "@/lib/advisors/personAdvisor";

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

  // Person
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [personLoading, setPersonLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!userId || !personId) {
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
        console.error(
          "[PersonDetailsPage] getPersonById failed:",
          error
        );

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

  // Memories
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!userId || !personId) {
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
        <p className="text-sm text-gray-600">
          Ładowanie...
        </p>
      </main>
    );
  }

  if (!person) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-gray-600">
          Nie znaleziono osoby
        </p>
      </main>
    );
  }

  const advisorTips = getPersonAdvisorTips(
    person,
    memories
  );

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <PersonCard person={person} />

      <HappyDateAdvisor tips={advisorTips} />

      <PersonHighlights memories={memories} />

      <MemoryList memories={memories} />
    </main>
  );
}