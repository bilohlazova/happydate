export function getDaysUntil(date: string): number {
  const today = new Date();
  const target = new Date(date);

  // прибираємо години, хвилини та секунди
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}