import { supabase } from "@/lib/supabaseClient";

export interface PlannerPreferences {
  dayStart: string;
  dayEnd: string;
  defaultDurationMinutes: number;
  defaultGapMinutes: number;
}

export const DEFAULT_PLANNER_PREFERENCES: PlannerPreferences = {
  dayStart: "09:00",
  dayEnd: "18:00",
  defaultDurationMinutes: 60,
  defaultGapMinutes: 0,
};

type PlannerPreferencesRow = {
  day_start: string;
  day_end: string;
  default_duration_minutes: number;
  default_gap_minutes: number;
};

export class PlannerPreferencesRepositoryError extends Error {
  constructor(readonly operation: "load" | "save", readonly cause?: unknown) {
    super(`planner_preferences_${operation}_failed`);
  }
}

function normalize(row: PlannerPreferencesRow): PlannerPreferences {
  return {
    dayStart: row.day_start.slice(0, 5),
    dayEnd: row.day_end.slice(0, 5),
    defaultDurationMinutes: row.default_duration_minutes,
    defaultGapMinutes: row.default_gap_minutes,
  };
}

export async function loadPlannerPreferences(userId: string): Promise<PlannerPreferences> {
  const { data, error } = await supabase
    .from("planner_preferences")
    .select("day_start,day_end,default_duration_minutes,default_gap_minutes")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new PlannerPreferencesRepositoryError("load", error);
  return data ? normalize(data as PlannerPreferencesRow) : DEFAULT_PLANNER_PREFERENCES;
}

export async function savePlannerPreferences(
  userId: string,
  preferences: PlannerPreferences,
): Promise<PlannerPreferences> {
  const { data, error } = await supabase
    .from("planner_preferences")
    .upsert({
      user_id: userId,
      day_start: preferences.dayStart,
      day_end: preferences.dayEnd,
      default_duration_minutes: preferences.defaultDurationMinutes,
      default_gap_minutes: preferences.defaultGapMinutes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("day_start,day_end,default_duration_minutes,default_gap_minutes")
    .single();
  if (error) throw new PlannerPreferencesRepositoryError("save", error);
  return normalize(data as PlannerPreferencesRow);
}
