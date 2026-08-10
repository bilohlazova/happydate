import { supabase } from "@/lib/supabaseClient";

export const REMINDER_INTERVALS = [60, 180, 360, 720, 1440] as const;
export type ReminderInterval = (typeof REMINDER_INTERVALS)[number];

export interface ReminderPreferences {
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  repeatIntervalMinutes: ReminderInterval;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  knowledgeReviewHomeEnabled: boolean;
  knowledgeReviewVoiceEnabled: boolean;
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  timezone: "UTC",
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  repeatIntervalMinutes: 180,
  inAppEnabled: true,
  pushEnabled: false,
  knowledgeReviewHomeEnabled: true,
  knowledgeReviewVoiceEnabled: true,
};

function validTimezone(value: string): string {
  const timezone = value.trim();
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    throw new Error("Invalid timezone");
  }
  return timezone;
}

async function userId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required");
  return data.user.id;
}

export async function getReminderPreferences(): Promise<ReminderPreferences> {
  const id = await userId();
  const { data, error } = await supabase.from("reminder_preferences")
    .select("timezone, quiet_hours_start, quiet_hours_end, repeat_interval_minutes, in_app_enabled, push_enabled, knowledge_review_home_enabled, knowledge_review_voice_enabled")
    .eq("user_id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ...DEFAULT_REMINDER_PREFERENCES };
  return {
    timezone: String(data.timezone),
    quietHoursStart: String(data.quiet_hours_start).slice(0, 5),
    quietHoursEnd: String(data.quiet_hours_end).slice(0, 5),
    repeatIntervalMinutes: REMINDER_INTERVALS.includes(data.repeat_interval_minutes as ReminderInterval)
      ? data.repeat_interval_minutes as ReminderInterval : 180,
    inAppEnabled: Boolean(data.in_app_enabled),
    pushEnabled: Boolean(data.push_enabled),
    knowledgeReviewHomeEnabled: data.knowledge_review_home_enabled !== false,
    knowledgeReviewVoiceEnabled: data.knowledge_review_voice_enabled !== false,
  };
}

export async function saveReminderPreferences(value: ReminderPreferences): Promise<void> {
  const id = await userId();
  if (!REMINDER_INTERVALS.includes(value.repeatIntervalMinutes)) throw new Error("Invalid interval");
  if (!value.inAppEnabled && !value.pushEnabled) throw new Error("One delivery channel is required");
  const { error } = await supabase.from("reminder_preferences").upsert({
    user_id: id,
    timezone: validTimezone(value.timezone),
    quiet_hours_start: value.quietHoursStart,
    quiet_hours_end: value.quietHoursEnd,
    repeat_interval_minutes: value.repeatIntervalMinutes,
    in_app_enabled: value.inAppEnabled,
    push_enabled: value.pushEnabled,
    knowledge_review_home_enabled: value.knowledgeReviewHomeEnabled,
    knowledge_review_voice_enabled: value.knowledgeReviewVoiceEnabled,
  }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
