import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { getDateFnsLocale } from "../../i18n/dateLocales.ts";
import type { AppLocale } from "../../i18n/config.ts";

export type NotesRawType = "note" | "memory" | "gift" | "journal";

export interface NotesTypeDisplayConfig {
  type: NotesRawType | "other";
  choiceLabel: string;
  cardLabel: string;
  icon: string;
  background: string;
  color: string;
  createTitle: string;
  createSubtitle: string;
  editTitle: string;
}

export interface NotesTypeOption extends NotesTypeDisplayConfig {
  type: NotesRawType;
}

export const NOTES_TYPE_OPTIONS: readonly NotesTypeOption[] = [
  {
    type: "note",
    choiceLabel: "Notatkę",
    cardLabel: "Notatka",
    icon: "📝",
    background: "rgba(0,122,255,.1)",
    color: "#0066cc",
    createTitle: "Dodaj notatkę",
    createSubtitle: "Zapisz coś, do czego chcesz wrócić.",
    editTitle: "Edytuj notatkę",
  },
  {
    type: "memory",
    choiceLabel: "Wspomnienie",
    cardLabel: "Wspomnienie",
    icon: "❤️",
    background: "rgba(255,59,48,.1)",
    color: "#c9342c",
    createTitle: "Dodaj wspomnienie",
    createSubtitle: "Zachowaj ważny moment, osobę lub wydarzenie.",
    editTitle: "Edytuj wspomnienie",
  },
  {
    type: "gift",
    choiceLabel: "Pomysł na prezent",
    cardLabel: "Pomysł na prezent",
    icon: "🎁",
    background: "rgba(255,149,0,.12)",
    color: "#a85f00",
    createTitle: "Dodaj pomysł na prezent",
    createSubtitle: "Zapisz pomysł dla wybranej osoby.",
    editTitle: "Edytuj pomysł",
  },
  {
    type: "journal",
    choiceLabel: "Wpis do dziennika",
    cardLabel: "Dziennik",
    icon: "📖",
    background: "rgba(88,86,214,.1)",
    color: "#514fc0",
    createTitle: "Dodaj wpis do dziennika",
    createSubtitle: "To prywatna przestrzeń tylko dla Ciebie.",
    editTitle: "Edytuj wpis",
  },
] as const;

const FALLBACK_NOTES_TYPE_CONFIG: NotesTypeDisplayConfig = {
  type: "other",
  choiceLabel: "Inny zapis",
  cardLabel: "Inny zapis",
  icon: "📌",
  background: "rgba(118,118,128,.1)",
  color: "#636366",
  createTitle: "Dodaj zapis",
  createSubtitle: "Zapisz ważną informację.",
  editTitle: "Edytuj zapis",
};

function normalizeNotesDisplayType(rawType: unknown): string {
  try {
    return String(rawType ?? "").trim().toLowerCase() || "note";
  } catch {
    return "note";
  }
}

export function getNotesTypeDisplayConfig(
  rawType: unknown
): NotesTypeDisplayConfig {
  const normalizedType = normalizeNotesDisplayType(rawType);
  return (
    NOTES_TYPE_OPTIONS.find((item) => item.type === normalizedType) ??
    FALLBACK_NOTES_TYPE_CONFIG
  );
}

export type EditorMode = "create" | "edit";
export type NotesEditorType = NotesRawType | "other";

export interface MemoryEditorMemoryInput {
  type: string | null;
  title: string | null;
  content_text: string | null;
  value_text: string | null;
  person_id: string | null;
  event_id: string | null;
  audio_url: string | null;
  occurred_on: string | null;
  images: string[] | null;
}

export interface MemoryEditorState {
  mode: EditorMode;
  rawType: string | null;
  editorType: NotesEditorType;
  title: string;
  contentText: string;
  valueText: string;
  personId: string;
  eventId: string;
  occurredOn: string;
  existingImages: string[];
  audioUrl: string;
}

export interface CreateMemoryEditorInitialStateInput {
  mode: EditorMode;
  type: string | null;
  memory?: MemoryEditorMemoryInput | null;
  today?: string;
}

export function createMemoryEditorInitialState({
  mode,
  type,
  memory,
  today = format(new Date(), "yyyy-MM-dd"),
}: CreateMemoryEditorInitialStateInput): MemoryEditorState {
  const rawType = mode === "edit" ? (memory?.type ?? type) : type;
  const editorType = getNotesTypeDisplayConfig(rawType).type;

  if (mode === "create") {
    return {
      mode,
      rawType,
      editorType,
      title: "",
      contentText: "",
      valueText: "",
      personId: "",
      eventId: "",
      occurredOn: editorType === "journal" ? today : "",
      existingImages: [],
      audioUrl: "",
    };
  }

  return {
    mode,
    rawType,
    editorType,
    title: memory?.title ?? "",
    contentText: memory?.content_text ?? "",
    valueText: memory?.value_text ?? "",
    personId: editorType === "journal" ? "" : (memory?.person_id ?? ""),
    eventId: editorType === "journal" ? "" : (memory?.event_id ?? ""),
    occurredOn:
      editorType === "memory" || editorType === "journal"
        ? (memory?.occurred_on ?? "")
        : "",
    existingImages: [...(memory?.images ?? [])],
    audioUrl: memory?.audio_url ?? "",
  };
}

export function getMemoryEditorHeader(
  mode: EditorMode,
  rawType: unknown
): { title: string; subtitle: string | null } {
  const config = getNotesTypeDisplayConfig(rawType);
  return {
    title: mode === "create" ? config.createTitle : config.editTitle,
    subtitle: mode === "create" ? config.createSubtitle : null,
  };
}

export type MemoryEditorField =
  | "title"
  | "contentText"
  | "valueText"
  | "personId"
  | "eventId"
  | "occurredOn";

export interface MemoryEditorValidationResult {
  isValid: boolean;
  errors: Partial<Record<MemoryEditorField, string>>;
}

export function validateMemoryEditorState(
  state: MemoryEditorState
): MemoryEditorValidationResult {
  const errors: MemoryEditorValidationResult["errors"] = {};
  const title = state.title.trim();
  const content = state.contentText.trim();
  const value = state.valueText.trim();

  if (state.editorType === "note" || state.editorType === "other") {
    if (!title && !content) {
      errors.contentText = "Dodaj tytuł lub treść zapisu.";
    }
  } else if (state.editorType === "gift") {
    if (!state.personId) errors.personId = "Wybierz osobę.";
    if (!value) errors.valueText = "Wpisz pomysł na prezent.";
  } else if (!content) {
    errors.contentText =
      state.editorType === "journal"
        ? "Treść wpisu jest wymagana."
        : "Opis wspomnienia jest wymagany.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

function optionalTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export interface NotesMemoryCreateFields {
  type: NotesRawType;
  title?: string | null;
  contentText?: string | null;
  valueText?: string | null;
  personId?: string | null;
  eventId?: string | null;
  occurredOn?: string | null;
  images: string[] | null;
  audioUrl?: string | null;
}

export interface NotesMemoryUpdatePatch {
  title?: string | null;
  contentText?: string | null;
  valueText?: string | null;
  personId?: string | null;
  eventId?: string | null;
  occurredOn?: string | null;
  images?: string[] | null;
  audioUrl?: string | null;
}

export function buildMemoryEditorCreateFields(
  state: MemoryEditorState
): NotesMemoryCreateFields {
  if (state.editorType === "other") {
    throw new Error("Unknown memory types cannot be created from Notes");
  }

  const images = state.existingImages.length ? [...state.existingImages] : null;
  const title = optionalTrimmed(state.title);
  const contentText = optionalTrimmed(state.contentText);
  const valueText = optionalTrimmed(state.valueText);
  const personId = state.personId || null;
  const eventId = state.eventId || null;
  const occurredOn = state.occurredOn || null;

  switch (state.editorType) {
    case "note":
      return { type: "note", title, contentText, personId, eventId, images };
    case "memory":
      return {
        type: "memory",
        title,
        contentText,
        personId,
        eventId,
        occurredOn,
        images,
      };
    case "gift":
      return {
        type: "gift",
        personId,
        eventId,
        valueText,
        contentText,
        images,
      };
    case "journal":
      return {
        type: "journal",
        title,
        contentText,
        occurredOn,
        personId: null,
        eventId: null,
        images,
      };
  }
}

export function buildMemoryEditorUpdatePatch(
  state: MemoryEditorState
): NotesMemoryUpdatePatch {
  const images = state.existingImages.length ? [...state.existingImages] : null;
  const title = optionalTrimmed(state.title);
  const contentText = optionalTrimmed(state.contentText);
  const personId = state.personId || null;
  const eventId = state.eventId || null;
  const audioUrl = state.audioUrl || null;

  switch (state.editorType) {
    case "note":
      return { title, contentText, personId, eventId, images, audioUrl };
    case "memory":
      return {
        title,
        contentText,
        personId,
        eventId,
        audioUrl,
        occurredOn: state.occurredOn || null,
        images,
      };
    case "gift":
      return {
        personId,
        eventId,
        audioUrl,
        valueText: optionalTrimmed(state.valueText),
        contentText,
        images,
      };
    case "journal":
      return {
        title,
        contentText,
        occurredOn: state.occurredOn || null,
        personId: null,
        eventId: null,
        audioUrl,
        images,
      };
    case "other":
      return { title, contentText, personId, eventId, images, audioUrl };
  }
}

export interface NotesCardPresentationInput {
  normalizedType: string;
  title: string | null;
  valueText: string | null;
  contentText: string | null;
  occurredOn: string | null;
  createdAt: string;
  personName: string | null;
  imageCount: number;
  locale?: AppLocale;
  labels?: Partial<NotesPresentationLabels>;
}

export interface NotesPresentationLabels {
  typeLabels: Record<NotesRawType | "other", string>;
  fallbackTitles: Record<NotesRawType | "other", string>;
  emptyContent: Record<NotesRawType | "other", string>;
  personMeta: (name: string) => string;
  imageCount: (count: number) => string;
  today: string;
  yesterday: string;
  daysAgo: (count: number) => string;
  unknownDate: string;
}

export interface NotesCardPresentation {
  displayType: NotesRawType | "other";
  typeLabel: string;
  icon: string;
  background: string;
  color: string;
  title: string;
  showTitle: boolean;
  titleUsesPerson: boolean;
  visiblePersonName: string | null;
  content: string;
  contentIsFallback: boolean;
  dateLabel: string;
  metaParts: string[];
  imageCountLabel: string | null;
}

function meaningfulText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseNotesCalendarDate(value: string): Date | null {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const parsed = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      )
    : parseISO(value);

  return isValid(parsed) ? parsed : null;
}

export function formatNotesCardDate(
  occurredOn: string | null,
  createdAt: string,
  now = new Date(),
  locale: AppLocale = "pl",
  labels?: Pick<NotesPresentationLabels, "today" | "yesterday" | "daysAgo" | "unknownDate">
): string {
  const occurredDate = meaningfulText(occurredOn)
    ? parseNotesCalendarDate(occurredOn!.trim())
    : null;
  const date = occurredDate ?? parseNotesCalendarDate(createdAt);

  if (!date) return labels?.unknownDate ?? "Nieznana data";

  const daysAgo = differenceInCalendarDays(startOfDay(now), startOfDay(date));
  if (daysAgo === 0) return labels?.today ?? "Dzisiaj";
  if (daysAgo === 1) return labels?.yesterday ?? "Wczoraj";
  if (daysAgo >= 2 && daysAgo <= 6) return labels?.daysAgo(daysAgo) ?? `${daysAgo} dni temu`;

  return format(date, date.getFullYear() === now.getFullYear() ? "d MMMM" : "d MMMM yyyy", {
    locale: getDateFnsLocale(locale),
  });
}

export function formatNotesImageCount(imageCount: number): string | null {
  if (imageCount <= 1) return null;
  const lastTwoDigits = imageCount % 100;
  const lastDigit = imageCount % 10;
  const noun =
    lastTwoDigits >= 12 && lastTwoDigits <= 14
      ? "zdjęć"
      : lastDigit >= 2 && lastDigit <= 4
        ? "zdjęcia"
        : "zdjęć";
  return `${imageCount} ${noun}`;
}

export function getNotesCardPresentation(
  input: NotesCardPresentationInput
): NotesCardPresentation {
  const config = getNotesTypeDisplayConfig(input.normalizedType);
  const localizedTypeLabel = input.labels?.typeLabels?.[config.type] ?? config.cardLabel;
  const fallbackTitle = input.labels?.fallbackTitles?.[config.type];
  const explicitTitle = meaningfulText(input.title);
  const personName = meaningfulText(input.personName);
  const visiblePersonName = config.type === "journal" ? null : personName;

  let title: string;
  let titleUsesPerson = false;

  if (config.type === "gift") {
    title = visiblePersonName ?? explicitTitle ?? fallbackTitle ?? "Pomysł na prezent";
    titleUsesPerson = Boolean(visiblePersonName);
  } else if (config.type === "journal") {
    title = explicitTitle ?? fallbackTitle ?? "Mój dzień";
  } else {
    title = explicitTitle ?? visiblePersonName ?? fallbackTitle ?? localizedTypeLabel;
    titleUsesPerson = !explicitTitle && Boolean(visiblePersonName);
  }

  const structuredLegacyValue =
    config.type === "other" || config.type === "gift"
      ? meaningfulText(input.valueText)
      : null;
  const content = structuredLegacyValue ?? meaningfulText(input.contentText);
  const emptyFallbacks: Record<NotesRawType | "other", string> = {
    note: "Brak treści notatki",
    memory: "Brak opisu wspomnienia",
    gift: "Brak opisu pomysłu",
    journal: "Brak treści wpisu",
    other: "Brak treści",
  };
  const imageCountLabel = input.imageCount > 1
    ? input.labels?.imageCount?.(input.imageCount) ?? formatNotesImageCount(input.imageCount)
    : null;
  const dateLabel = formatNotesCardDate(
    input.occurredOn,
    input.createdAt,
    new Date(),
    input.locale,
    input.labels?.today && input.labels.yesterday && input.labels.daysAgo && input.labels.unknownDate
      ? { today: input.labels.today, yesterday: input.labels.yesterday, daysAgo: input.labels.daysAgo, unknownDate: input.labels.unknownDate }
      : undefined
  );
  const metaParts = [
    visiblePersonName && !titleUsesPerson
      ? input.labels?.personMeta?.(visiblePersonName) ?? `O osobie: ${visiblePersonName}`
      : null,
    dateLabel,
    imageCountLabel,
  ].filter((part): part is string => Boolean(part));

  return {
    displayType: config.type,
    typeLabel: localizedTypeLabel,
    icon: config.icon,
    background: config.background,
    color: config.color,
    title,
    showTitle: title.trim().toLocaleLowerCase(input.locale ?? "pl-PL") !== localizedTypeLabel.toLocaleLowerCase(input.locale ?? "pl-PL"),
    titleUsesPerson,
    visiblePersonName,
    content: content ?? input.labels?.emptyContent?.[config.type] ?? emptyFallbacks[config.type],
    contentIsFallback: !content,
    dateLabel,
    metaParts,
    imageCountLabel,
  };
}

export interface CreateNotesMemoryPayloadInput extends NotesMemoryCreateFields {
  userId: string;
}

export type UpdateNotesMemoryPayloadInput = NotesMemoryUpdatePatch;

export function buildCreateNotesMemoryPayload(
  input: CreateNotesMemoryPayloadInput
) {
  return {
    user_id: input.userId,
    type: input.type ?? "note",
    source: "manual" as const,
    is_active: true,
    images: input.images,
    ...("title" in input ? { title: input.title ?? null } : {}),
    ...("contentText" in input
      ? { content_text: input.contentText ?? null }
      : {}),
    ...("valueText" in input ? { value_text: input.valueText ?? null } : {}),
    ...("personId" in input ? { person_id: input.personId ?? null } : {}),
    ...("eventId" in input ? { event_id: input.eventId ?? null } : {}),
    ...("audioUrl" in input ? { audio_url: input.audioUrl ?? null } : {}),
    ...("occurredOn" in input
      ? { occurred_on: input.occurredOn ?? null }
      : {}),
  };
}

export function buildUpdateNotesMemoryPayload(
  input: UpdateNotesMemoryPayloadInput
) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.contentText !== undefined
      ? { content_text: input.contentText }
      : {}),
    ...(input.valueText !== undefined
      ? { value_text: input.valueText }
      : {}),
    ...(input.personId !== undefined ? { person_id: input.personId } : {}),
    ...(input.eventId !== undefined ? { event_id: input.eventId } : {}),
    ...(input.audioUrl !== undefined ? { audio_url: input.audioUrl } : {}),
    ...(input.occurredOn !== undefined
      ? { occurred_on: input.occurredOn }
      : {}),
    ...(input.images !== undefined ? { images: input.images } : {}),
  };
}
