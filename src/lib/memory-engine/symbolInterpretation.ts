import { GENTLE_INSPIRATION_DISCLAIMER } from "./types.ts";

export type SymbolInterpretationLocale = "uk" | "en" | "pl" | "ru" | "de";

const IF_IT_RESONATES: Record<SymbolInterpretationLocale, string> = {
  uk: "якщо тобі це відгукується",
  en: "if this resonates with you",
  pl: "jeśli to do ciebie wraca",
  ru: "если это тебе откликается",
  de: "wenn das bei dir anklingt",
};

const INSPIRATION_ONLY: Record<SymbolInterpretationLocale, string> = {
  uk: "Це лише натхнення, не істина і не діагноз.",
  en: "This is inspiration only, not a truth and not a diagnosis.",
  pl: "To tylko inspiracja, nie prawda i nie diagnoza.",
  ru: "Это только вдохновение, не истина и не диагноз.",
  de: "Das ist nur eine Anregung, keine Wahrheit und keine Diagnose.",
};

const PRESET: Record<string, Record<SymbolInterpretationLocale, string>> = {
  heart: {
    uk: "Цей знак для мене звучить як тепло, яке ви бережете вдвох",
    en: "This sign sounds to me like warmth you keep between you",
    pl: "Ten znak brzmi dla mnie jak ciepło, które chronicie we dwoje",
    ru: "Этот знак для меня звучит как тепло, которое вы бережёте вдвоём",
    de: "Dieses Zeichen klingt für mich nach Wärme, die ihr zu zweit bewahrt",
  },
  sun: {
    uk: "Цей знак для мене звучить як світло, до якого ви повертаєтесь",
    en: "This sign sounds to me like a light you keep returning to",
    pl: "Ten znak brzmi dla mnie jak światło, do którego wracacie",
    ru: "Этот знак для меня звучит как свет, к которому вы возвращаетесь",
    de: "Dieses Zeichen klingt für mich nach einem Licht, zu dem ihr zurückkehrt",
  },
  flower: {
    uk: "Цей знак для мене звучить як щось живе, що ви вирощуєте разом",
    en: "This sign sounds to me like something living that you grow together",
    pl: "Ten znak brzmi dla mnie jak coś żywego, co hodujecie razem",
    ru: "Этот знак для меня звучит как что-то живое, что вы растите вместе",
    de: "Dieses Zeichen klingt für mich nach etwas Lebendigem, das ihr gemeinsam wachsen lasst",
  },
  stars: {
    uk: "Цей знак для мене звучить як тихі орієнтири, які ви впізнаєте вдвох",
    en: "This sign sounds to me like quiet landmarks only the two of you recognize",
    pl: "Ten znak brzmi dla mnie jak ciche punkty, które rozpoznajecie we dwoje",
    ru: "Этот знак для меня звучит как тихие ориентиры, которые вы узнаёте вдвоём",
    de: "Dieses Zeichen klingt für mich nach stillen Markierungen, die nur ihr beide kennt",
  },
  wave: {
    uk: "Цей знак для мене звучить як ритм, у якому ви вмієте бути поруч",
    en: "This sign sounds to me like a rhythm in which you know how to stay close",
    pl: "Ten znak brzmi dla mnie jak rytm, w którym umiecie być blisko",
    ru: "Этот знак для меня звучит как ритм, в котором вы умеете быть рядом",
    de: "Dieses Zeichen klingt für mich nach einem Rhythmus, in dem ihr euch nah bleiben könnt",
  },
  infinity: {
    uk: "Цей знак для мене звучить як зв’язок, який ви хочете берегти далі",
    en: "This sign sounds to me like a bond you want to keep tending",
    pl: "Ten znak brzmi dla mnie jak więź, którą chcecie dalej chronić",
    ru: "Этот знак для меня звучит как связь, которую вы хотите беречь дальше",
    de: "Dieses Zeichen klingt für mich nach einer Bindung, die ihr weiter hüten wollt",
  },
};

const HANDMADE: Record<SymbolInterpretationLocale, string> = {
  uk: "Намальований власноруч знак часто тримає дуже особистий сенс. Для мене він може звучати як цілісність або як ваш маленький захищений простір",
  en: "A handmade sign often holds a private meaning. To me it can sound like wholeness, or like a small protected space that belongs to you two",
  pl: "Znak narysowany własną ręką często niesie bardzo osobisty sens. Dla mnie może brzmieć jak całość albo jak wasza mała chroniona przestrzeń",
  ru: "Знак, нарисованный своей рукой, часто хранит очень личный смысл. Для меня он может звучать как целостность или как ваше маленькое защищённое пространство",
  de: "Ein selbst gezeichnetes Zeichen trägt oft eine sehr persönliche Bedeutung. Für mich kann es nach Ganzheit klingen oder nach eurem kleinen geschützten Raum",
};

const FROM_WORDS: Record<SymbolInterpretationLocale, string> = {
  uk: "Ти назвала/назвав це своїми словами. Якщо цей знак звучить саме так",
  en: "You named this in your own words. If this sign sounds like that",
  pl: "Nazwałaś/nazwałeś to własnymi słowami. Jeśli ten znak tak właśnie brzmi",
  ru: "Ты назвала/назвал это своими словами. Если этот знак звучит именно так",
  de: "Du hast das mit eigenen Worten benannt. Wenn dieses Zeichen genau so klingt",
};

function localeOf(value: string | null | undefined): SymbolInterpretationLocale {
  if (value === "uk" || value === "en" || value === "pl" || value === "ru" || value === "de") return value;
  return "en";
}

export function gentleSymbolInterpretation(input: {
  locale?: string | null;
  kind: "preset" | "happy" | "drawing" | "upload";
  presetKey?: string | null;
  prompt?: string | null;
}): { text: string; disclaimerVersion: typeof GENTLE_INSPIRATION_DISCLAIMER } {
  const locale = localeOf(input.locale);
  const resonate = IF_IT_RESONATES[locale];
  const disclaimer = INSPIRATION_ONLY[locale];
  const prompt = input.prompt?.replace(/\s+/g, " ").trim();

  let image: string;
  if (input.kind === "happy" && prompt) {
    image = `${FROM_WORDS[locale]} — «${prompt.slice(0, 180)}»`;
  } else if (input.kind === "preset" && input.presetKey && PRESET[input.presetKey]) {
    image = PRESET[input.presetKey][locale];
  } else {
    image = HANDMADE[locale];
  }

  return {
    text: `${image} — ${resonate}. ${disclaimer}`,
    disclaimerVersion: GENTLE_INSPIRATION_DISCLAIMER,
  };
}
