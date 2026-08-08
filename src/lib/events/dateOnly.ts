const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDateOnly(value: string): Date | null {
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function formatLocalDateOnly(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addLocalDateOnlyDays(value: string, amount: number): string | null {
  const date = parseLocalDateOnly(value);
  if (!date || !Number.isInteger(amount)) return null;
  date.setDate(date.getDate() + amount);
  return formatLocalDateOnly(date);
}

export function compareLocalDateOnly(left: string, right: string): number | null {
  const leftDate = parseLocalDateOnly(left);
  const rightDate = parseLocalDateOnly(right);
  if (!leftDate || !rightDate) return null;
  return Math.sign(leftDate.getTime() - rightDate.getTime());
}
