const PREPARATION_DAYS = 30;

export function calendarReminderStart(eventDate: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number.isNaN(now.getTime())) return null;
  const event = new Date(`${eventDate}T09:00:00`);
  if (Number.isNaN(event.getTime()) || event.getTime() < now.getTime()) return null;
  const preparation = new Date(event);
  preparation.setDate(preparation.getDate() - PREPARATION_DAYS);
  return (preparation.getTime() > now.getTime() ? preparation : now).toISOString();
}
