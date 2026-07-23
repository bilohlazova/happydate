import type { MemoryCaptureCandidate } from "./memory-capture";

export type ConfirmMemoryCaptureResult =
  | {
      ok: true;
      status: "created" | "already_exists";
      knowledgeId: string | null;
    }
  | {
      ok: false;
      error: "unauthorized" | "person_not_found" | "invalid_candidate" | "save_failed";
    };

export async function confirmMemoryCaptureCandidate(input: {
  personId: string;
  candidate: MemoryCaptureCandidate;
}): Promise<ConfirmMemoryCaptureResult> {
  const { supabase } = await import("./supabaseClient.ts");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "unauthorized" };

  const response = await fetch("/api/memory-capture/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      personId: input.personId,
      candidate: input.candidate,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({})) as {
    ok?: unknown;
    status?: unknown;
    knowledgeId?: unknown;
    error?: unknown;
  };

  if (!response.ok || payload.ok !== true) {
    const error =
      payload.error === "unauthorized" ||
      payload.error === "person_not_found" ||
      payload.error === "invalid_candidate"
        ? payload.error
        : "save_failed";
    return { ok: false, error };
  }

  return {
    ok: true,
    status: payload.status === "already_exists" ? "already_exists" : "created",
    knowledgeId: typeof payload.knowledgeId === "string" ? payload.knowledgeId : null,
  };
}
