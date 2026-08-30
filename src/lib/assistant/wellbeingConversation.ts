export type WellbeingMode = "emotional_conversation" | "daily_guidance";

export function wellbeingMode(message: string): WellbeingMode {
  const value = message.toLocaleLowerCase();
  if (/(дякую|готов.{0,8}(план|поді|рухат)|покажи.{0,8}(план|поді)|окей|мені.{0,10}(краще|легше))/i.test(value)) return "daily_guidance";
  return "emotional_conversation";
}

export function wellbeingReply(message: string, recurringLowDays: boolean): string | null {
  const value = message.toLocaleLowerCase();
  if (/(не вистачає|бракує).{0,24}(розмов|спілкуван|людей)/.test(value)) return "Розумію. Коли бракує живого спілкування, навіть звичайний день може відчуватися порожнім. Хочеш просто трохи поговорити чи розкажеш, за ким найбільше сумуєш?";
  if (/(не знаю.{0,18}(що|як).{0,18}(зі мною|відчува)|сама не знаю)/.test(value)) return "Так теж буває. Не завжди треба одразу розуміти причину. Можемо просто побути тут без потреби все пояснювати.";
  if (/(важк|поган|нема.{0,8}настро|втом|посвар|робот)/.test(value)) return recurringLowDays ? "Схоже, останнім часом тобі справді непросто. Не вимагай від себе забагато сьогодні. Якщо захочеш, можемо просто трохи поговорити." : "Шкода, що сьогодні так. Не мусиш зараз усе пояснювати — але якщо хочеш виговоритися, можеш написати, що найбільше тебе виснажило.";
  if (/(добре|супер|раді|щаслив|чудов)/.test(value)) return "О, це приємно чути. Щось хороше сталося чи просто день сьогодні вдався?";
  return null;
}
