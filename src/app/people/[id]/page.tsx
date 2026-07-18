"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PersonProfileContent } from "@/components/people/PersonProfileContent";
import { loadPersonProfile } from "@/lib/people/people.loaders";
import type { PersonProfileViewModel } from "@/lib/people/peopleData.types";

export default function PersonDetailsPage() {
  const params = useParams<{ id: string }>();
  const personId = params.id;
  const [viewModel, setViewModel] = useState<PersonProfileViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!personId) return;
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setFailed(false);
        const profile = await loadPersonProfile(personId);
        if (isMounted) setViewModel(profile);
      } catch (error) {
        console.error("[PersonDetailsPage] loadPersonProfile failed:", error);
        if (isMounted) setFailed(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [personId]);

  return (
    <PersonProfileContent
      loading={loading}
      failed={failed}
      viewModel={viewModel}
    />
  );
}
