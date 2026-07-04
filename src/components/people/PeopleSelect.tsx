"use client";

import { useEffect, useState } from "react";

import { getPeople } from "@/lib/repositories/personRepository";
import type { PersonRow } from "@/lib/repositories/person.types";

export interface PeopleSelectProps {
  userId: string;
  value: string;
  onChange: (personId: string) => void;
  disabled?: boolean;
}

const SELECT_ID = "person-select";

export default function PeopleSelect({
  userId,
  value,
  onChange,
  disabled = false,
}: PeopleSelectProps) {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPeople([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPeople() {
      try {
        setLoading(true);

        const rows = await getPeople(userId);

        if (isMounted) {
          setPeople(rows);
        }
      } catch (error) {
        console.error("[PeopleSelect] getPeople failed:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadPeople();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={SELECT_ID}
        className="text-sm font-medium text-gray-700"
      >
        Osoba
      </label>

      <select
        id={SELECT_ID}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || loading || !userId || people.length === 0}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
      >
        <option value="">
          {loading
            ? "Ładowanie..."
            : people.length === 0
              ? "Brak osób"
              : "Wybierz osobę"}
        </option>

        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </div>
  );
}