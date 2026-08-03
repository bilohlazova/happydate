import { supabase } from "@/lib/supabaseClient";

export interface InAppReminderDelivery {
  deliveryId: string;
  reminderId: string;
  scheduledFor: string;
}

function parseDelivery(value: unknown): InAppReminderDelivery {
  if (!value || typeof value !== "object") {
    throw new Error("[reminderDeliveries.repository] Invalid delivery response");
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.delivery_id !== "string"
    || typeof row.reminder_id !== "string"
    || typeof row.scheduled_for !== "string"
  ) {
    throw new Error("[reminderDeliveries.repository] Invalid delivery response");
  }

  return {
    deliveryId: row.delivery_id,
    reminderId: row.reminder_id,
    scheduledFor: row.scheduled_for,
  };
}

export async function consumeQueuedInAppDeliveries(
  limit = 20,
): Promise<InAppReminderDelivery[]> {
  const { data, error } = await supabase.rpc("consume_my_in_app_deliveries", {
    p_limit: limit,
  });

  if (error) {
    throw new Error(`[reminderDeliveries.repository] Consume failed: ${error.message}`);
  }

  return (data ?? []).map(parseDelivery);
}
