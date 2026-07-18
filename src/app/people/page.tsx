"use client";

// Displays all people belonging to the authenticated user.
// Data is loaded through the People data layer.

import { useEffect, useState } from "react";

import { PeoplePageContent } from "@/components/people/PeoplePageContent";
import { loadPeoplePage } from "@/lib/people/people.loaders";
import type { PeoplePageViewModel } from "@/lib/people/peopleData.types";

export default function PeoplePage() {
  const [viewModel, setViewModel] = useState<PeoplePageViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        const nextViewModel = await loadPeoplePage();
        if (isMounted) setViewModel(nextViewModel);
      } catch (error) {
        console.error("[PeoplePage] loadPeoplePage failed:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  async function reload() {
    try {
      const nextViewModel = await loadPeoplePage();
      setViewModel(nextViewModel);
    } catch (error) {
      console.error("[PeoplePage] reload failed:", error);
    }
  }

  return (
    <PeoplePageContent
      loading={loading}
      viewModel={viewModel}
      onPersonUpdated={reload}
      onPersonDeleted={reload}
    />
  );
}
