"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { PersonProfileContent } from "@/components/people/PersonProfileContent";
import { loadPersonProfile } from "@/lib/people/people.loaders";
import type { PersonProfileViewModel } from "@/lib/people/peopleData.types";
import { logOperationalError } from "@/lib/observability/safeLogger";

export default function PersonDetailsPage() {
  const params = useParams<{ id: string }>();
  const personId = params.id;
  const [viewModel, setViewModel] = useState<PersonProfileViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);

  const refreshProfile = useCallback(async (showLoading: boolean) => {
    if (!personId) return;
    const request = requestRef.current + 1;
    requestRef.current = request;
    try {
      if (showLoading) setLoading(true);
      setFailed(false);
      const profile = await loadPersonProfile(personId);
      if (requestRef.current === request) setViewModel(profile);
    } catch (error) {
      logOperationalError("person-details", "profile-load-failed", error);
      if (requestRef.current === request) setFailed(true);
    } finally {
      if (showLoading && requestRef.current === request) setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    // Fetch the route-owned profile when its person identifier changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshProfile(true);
    return () => {
      requestRef.current += 1;
    };
  }, [refreshProfile]);

  async function refreshProfileAfterChange() {
    await refreshProfile(false);
  }

  return (
    <PersonProfileContent
      loading={loading}
      failed={failed}
      viewModel={viewModel}
      onProfileChanged={refreshProfileAfterChange}
    />
  );
}
