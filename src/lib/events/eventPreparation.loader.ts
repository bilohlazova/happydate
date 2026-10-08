import { supabase } from "@/lib/supabaseClient";
import {
  buildBirthdayPreparationViewModel,
  type EventPreparationEvent,
  type EventPreparationGift,
  type EventPreparationTask,
} from "./eventPreparation";

export type EventPreparationPageViewModel = {
  found: boolean;
  event: EventPreparationEvent | null;
  preparation: ReturnType<typeof buildBirthdayPreparationViewModel>;
};

async function authenticatedUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error && !error.message.toLowerCase().includes("session missing")) {
    throw new Error(`[eventPreparation] Authentication failed: ${error.message}`);
  }
  return data.user?.id ?? null;
}

export async function loadEventPreparationPage(eventId: string): Promise<EventPreparationPageViewModel> {
  const userId = await authenticatedUserId();
  if (!userId) return { found: false, event: null, preparation: null };

  const { data, error } = await supabase
    .from("events")
    .select("id,title,date,category,person_id")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`[eventPreparation] Event load failed: ${error.message}`);
  if (!data || typeof data.id !== "string" || typeof data.title !== "string" || typeof data.date !== "string") {
    return { found: false, event: null, preparation: null };
  }

  let personBirthYear: number | null = null;
  if (typeof data.person_id === "string") {
    const { data: person, error: personError } = await supabase.from("people").select("birth_year").eq("id", data.person_id).eq("user_id", userId).maybeSingle();
    if (personError) throw new Error(`[eventPreparation] Person load failed: ${personError.message}`);
    personBirthYear = Number.isInteger(person?.birth_year) ? (person?.birth_year ?? null) : null;
  }
  const event: EventPreparationEvent = {
    id: data.id,
    title: data.title,
    date: data.date,
    category: typeof data.category === "string" ? data.category : null,
    personId: typeof data.person_id === "string" ? data.person_id : null,
    personBirthYear,
  };
  if (event.category?.trim().toLocaleLowerCase() !== "birthday" || !event.personId) {
    return { found: true, event, preparation: buildBirthdayPreparationViewModel({ event, gifts: [], tasks: [] }) };
  }

  const [gifts, tasks] = await Promise.all([
    supabase
      .from("gifts")
      .select("person_id,event_id,lifecycle")
      .eq("user_id", userId)
      .eq("person_id", event.personId)
      .eq("event_id", event.id)
      .in("lifecycle", ["selected", "purchased"]),
    supabase
      .from("happy_tasks")
      .select("id,type,status,person_id,event_id,started_at,happy_task_steps(type,status)")
      .eq("user_id", userId)
      .eq("event_id", event.id)
      .eq("type", "birthday_preparation")
      .in("status", ["active", "waiting_user", "paused", "completed"])
      .order("started_at", { ascending: false })
      .limit(20),
  ]);
  if (gifts.error) throw new Error(`[eventPreparation] Gift load failed: ${gifts.error.message}`);
  if (tasks.error) throw new Error(`[eventPreparation] Task load failed: ${tasks.error.message}`);

  const giftRows: EventPreparationGift[] = (gifts.data ?? []).map((gift) => ({
    personId: typeof gift.person_id === "string" ? gift.person_id : null,
    eventId: typeof gift.event_id === "string" ? gift.event_id : null,
    lifecycle: typeof gift.lifecycle === "string" ? gift.lifecycle : "",
  }));
  const taskRows: EventPreparationTask[] = (tasks.data ?? []).flatMap((task) => (
    typeof task.id === "string" && typeof task.type === "string" && typeof task.status === "string" && typeof task.started_at === "string"
      ? [{
          id: task.id,
          type: task.type,
          status: task.status,
          personId: typeof task.person_id === "string" ? task.person_id : null,
          eventId: typeof task.event_id === "string" ? task.event_id : null,
          startedAt: task.started_at,
          steps: (task.happy_task_steps ?? []).flatMap((step) => typeof step.type === "string" && typeof step.status === "string"
            ? [{ type: step.type, status: step.status }]
            : []),
        }]
      : []
  ));

  return { found: true, event, preparation: buildBirthdayPreparationViewModel({ event, gifts: giftRows, tasks: taskRows }) };
}
