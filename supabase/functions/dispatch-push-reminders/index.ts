import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { sendPush, type PushDevice } from "./push-providers.ts";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 3;

type DeliveryRow = {
  id: string;
  user_id: string;
  reminder_id: string;
  attempt_count: number;
};

type EventRow = { title: string; person_name: string | null };

const COPY: Record<string, { title: string; fallback: string }> = {
  uk: { title: "Нагадування HappyDate", fallback: "У вас є важлива подія. Відкрийте HappyDate, щоб переглянути деталі." },
  pl: { title: "Przypomnienie HappyDate", fallback: "Masz ważne wydarzenie. Otwórz HappyDate, aby zobaczyć szczegóły." },
  en: { title: "HappyDate reminder", fallback: "You have an important event. Open HappyDate to see the details." },
  de: { title: "HappyDate-Erinnerung", fallback: "Du hast ein wichtiges Ereignis. Öffne HappyDate, um die Details zu sehen." },
  ru: { title: "Напоминание HappyDate", fallback: "У вас важное событие. Откройте HappyDate, чтобы посмотреть детали." },
};

function safeLocale(locale: string): keyof typeof COPY {
  const language = locale.toLowerCase().split(/[-_]/)[0];
  return language in COPY ? language : "en";
}

function safeErrorCode(value: string | undefined): string {
  return (value ?? "provider_unknown").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 120);
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });
    const admin = ctx.supabaseAdmin;
    const now = new Date();
    const staleBefore = new Date(now.getTime() - 10 * 60_000).toISOString();

    await admin
      .from("reminder_deliveries")
      .update({ status: "failed", failed_at: now.toISOString(), error_code: "processing_timeout", next_attempt_at: now.toISOString() })
      .eq("channel", "push")
      .eq("status", "processing")
      .lt("updated_at", staleBefore);

    const { data, error } = await admin
      .from("reminder_deliveries")
      .select("id, user_id, reminder_id, attempt_count")
      .eq("channel", "push")
      .in("status", ["queued", "failed"])
      .lt("attempt_count", MAX_ATTEMPTS)
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${now.toISOString()}`)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (error) throw error;

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const candidate of (data ?? []) as DeliveryRow[]) {
      const claimedAt = new Date().toISOString();
      const { data: claimed } = await admin
        .from("reminder_deliveries")
        .update({ status: "processing", attempt_count: candidate.attempt_count + 1, error_code: null, failed_at: null, next_attempt_at: null })
        .eq("id", candidate.id)
        .in("status", ["queued", "failed"])
        .eq("attempt_count", candidate.attempt_count)
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      const [{ data: reminder }, { data: devices }] = await Promise.all([
        admin.from("reminders").select("event_id").eq("id", candidate.reminder_id).eq("user_id", candidate.user_id).maybeSingle(),
        admin.from("push_devices").select("id, platform, token, locale").eq("user_id", candidate.user_id).eq("enabled", true),
      ]);

      if (!reminder || !devices?.length) {
        await admin.from("reminder_deliveries").update({ status: "skipped", error_code: "no_active_device", failed_at: claimedAt }).eq("id", candidate.id).eq("status", "processing");
        skipped += 1;
        continue;
      }

      const { data: event } = await admin.from("events").select("title, person_name").eq("id", reminder.event_id).maybeSingle<EventRow>();
      const results = await Promise.all(devices.map(async (rawDevice) => {
        const device = rawDevice as PushDevice & { locale: string };
        const copy = COPY[safeLocale(device.locale)];
        const result = await sendPush(device, {
          title: copy.title,
          body: event?.title?.trim() || (event?.person_name ? `${copy.fallback} ${event.person_name}` : copy.fallback),
          deliveryId: candidate.id,
          reminderId: candidate.reminder_id,
          actionUrl: "/dashboard",
        });
        if (result.disableToken) {
          await admin.from("push_devices").update({ enabled: false }).eq("id", device.id);
        }
        return result;
      }));

      const success = results.find((result) => result.ok);
      if (success) {
        await admin.from("reminder_deliveries").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: success.messageId?.slice(0, 500) ?? null,
        }).eq("id", candidate.id).eq("status", "processing");
        sent += 1;
      } else {
        const exhausted = candidate.attempt_count + 1 >= MAX_ATTEMPTS;
        const retryAt = new Date(Date.now() + 2 ** candidate.attempt_count * 60_000).toISOString();
        await admin.from("reminder_deliveries").update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_code: safeErrorCode(results[0]?.errorCode),
          next_attempt_at: exhausted ? null : retryAt,
        }).eq("id", candidate.id).eq("status", "processing");
        failed += 1;
      }
    }

    console.log(JSON.stringify({ event: "push_dispatch_complete", selected: data?.length ?? 0, sent, failed, skipped }));
    return Response.json({ selected: data?.length ?? 0, sent, failed, skipped });
  }),
};
