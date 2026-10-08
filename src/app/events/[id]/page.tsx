"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { EventPreparationContent } from "@/components/events/EventPreparationContent";
import { loadEventPreparationPage, type EventPreparationPageViewModel } from "@/lib/events/eventPreparation.loader";
import { logOperationalError } from "@/lib/observability/safeLogger";

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [viewModel, setViewModel] = useState<EventPreparationPageViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);

  const refresh = useCallback(async (showLoading: boolean) => {
    if (!eventId) return;
    const request = requestRef.current + 1;
    requestRef.current = request;
    try {
      if (showLoading) setLoading(true);
      setFailed(false);
      const event = await loadEventPreparationPage(eventId);
      if (requestRef.current === request) setViewModel(event);
    } catch (error) {
      logOperationalError("event-details", "event-load-failed", error);
      if (requestRef.current === request) setFailed(true);
    } finally {
      if (showLoading && requestRef.current === request) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    // Route-owned load intentionally begins after the dynamic parameter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(true);
    return () => { requestRef.current += 1; };
  }, [refresh]);

  return <EventPreparationContent loading={loading} failed={failed} viewModel={viewModel} onChanged={() => refresh(false)} />;
}
