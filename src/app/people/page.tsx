"use client";

// Displays all people belonging to the authenticated user.
// Data is loaded through the Person Repository.

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";
import { getPeople } from "@/lib/repositories/personRepository";
import type { PersonRow } from "@/lib/repositories/person.types";
import { getActiveMemories } from "@/lib/repositories/memoryRepository";
import type { MemoryRow } from "@/lib/repositories/memory.types";
import { createHappyContext } from "@/lib/happy/context";
import { loadBrain } from "@/lib/happy/brain/loadBrain";
import { PeoplePageContent } from "@/components/people/PeoplePageContent";
import type { HappyRecommendation } from "@/components/people/HappyRecommendationCard";
import { buildBirthdayRecommendation } from "@/components/people/peopleRecommendations";

export default function PeoplePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [recommendation, setRecommendation] =
    useState<HappyRecommendation | null>(null);
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
      setMemories([]);
      setRecommendation(null);
      setPeopleLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPeople(uid: string) {
      try {
        setPeopleLoading(true);
        const [rows, memoryRows] = await Promise.all([
          getPeople(uid),
          getActiveMemories(uid),
        ]);

        if (isMounted) {
          setPeople(rows);
          setMemories(memoryRows);
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

  useEffect(() => {
    if (authLoading || !userId) {
      return;
    }

    let isMounted = true;

    async function loadRecommendation() {
      try {
        const context = await createHappyContext({
          mode: "calm",
        });
        const brain = await loadBrain(context);
        const [birthdayPerson] = brain.upcomingBirthdays;

        if (!isMounted) {
          return;
        }

        setRecommendation(buildBirthdayRecommendation(birthdayPerson));
      } catch (error) {
        console.error("[PeoplePage] loadBrain failed:", error);
      }
    }

    void loadRecommendation();

    return () => {
      isMounted = false;
    };
  }, [authLoading, userId]);

  const loading = authLoading || peopleLoading;

  return (
    <PeoplePageContent
      loading={loading}
      people={people}
      memories={memories}
      recommendation={recommendation}
      onPersonUpdated={(updatedPerson) => {
        setPeople((currentPeople) =>
          currentPeople.map((person) =>
            person.id === updatedPerson.id ? updatedPerson : person
          )
        );
      }}
      onPersonDeleted={(personId) => {
        setPeople((currentPeople) =>
          currentPeople.filter((person) => person.id !== personId)
        );
        setMemories((currentMemories) =>
          currentMemories.filter((memory) => memory.person_id !== personId)
        );
      }}
    />
  );
}
