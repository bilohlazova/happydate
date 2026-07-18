"use client";

import { useEffect, useState } from "react";

import { getPeople } from "@/lib/repositories/personRepository";
import type { PersonRow } from "@/lib/repositories/person.types";
import { MobileUI } from "@/lib/theme/mobile";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("care.peopleSelect");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
        setHasError(false);

        const rows = await getPeople(userId);

        if (isMounted) {
          setPeople(rows);
        }
      } catch (error) {
        console.error("[PeopleSelect] getPeople failed:", error);
        if (isMounted) setHasError(true);
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={SELECT_ID} className="text-sm font-bold text-gray-700">
        {t("label")}
      </label>

      <select
        id={SELECT_ID}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || loading || !userId || people.length === 0}
        className={`${MobileUI.input} disabled:bg-gray-100`}
      >
        <option value="">
          {hasError
            ? t("error")
            : loading
            ? t("loading")
            : people.length === 0
            ? t("empty")
            : t("choose")}
        </option>

        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      {hasError && <p className="text-xs text-rose-600">{t("error")}</p>}
    </div>
  );
}
