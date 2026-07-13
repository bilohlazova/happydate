import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { pl } from "date-fns/locale";

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
  occurredOn: string;
  existingImages: string[];
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
      occurredOn: editorType === "journal" ? today : "",
      existingImages: [],
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
    occurredOn:
      editorType === "memory" || editorType === "journal"
        ? (memory?.occurred_on ?? "")
        : "",
    existingImages: [...(memory?.images ?? [])],
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
  occurredOn?: string | null;
  images: string[] | null;
}

export interface NotesMemoryUpdatePatch {
  title?: string | null;
  contentText?: string | null;
  valueText?: string | null;
  personId?: string | null;
  occurredOn?: string | null;
  images?: string[] | null;
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
  const occurredOn = state.occurredOn || null;

  switch (state.editorType) {
    case "note":
      return { type: "note", title, contentText, personId, images };
    case "memory":
      return {
        type: "memory",
        title,
        contentText,
        personId,
        occurredOn,
        images,
      };
    case "gift":
      return {
        type: "gift",
        personId,
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

  switch (state.editorType) {
    case "note":
      return { title, contentText, personId, images };
    case "memory":
      return {
        title,
        contentText,
        personId,
        occurredOn: state.occurredOn || null,
        images,
      };
    case "gift":
      return {
        personId,
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
        images,
      };
    case "other":
      return { title, contentText, personId, images };
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
  now = new Date()
): string {
  const occurredDate = meaningfulText(occurredOn)
    ? parseNotesCalendarDate(occurredOn!.trim())
    : null;
  const date = occurredDate ?? parseNotesCalendarDate(createdAt);

  if (!date) return "Nieznana data";

  const daysAgo = differenceInCalendarDays(startOfDay(now), startOfDay(date));
  if (daysAgo === 0) return "Dzisiaj";
  if (daysAgo === 1) return "Wczoraj";
  if (daysAgo >= 2 && daysAgo <= 6) return `${daysAgo} dni temu`;

  return format(date, date.getFullYear() === now.getFullYear() ? "d MMMM" : "d MMMM yyyy", {
    locale: pl,
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
  const explicitTitle = meaningfulText(input.title);
  const personName = meaningfulText(input.personName);
  const visiblePersonName = config.type === "journal" ? null : personName;

  let title: string;
  let titleUsesPerson = false;

  if (config.type === "gift") {
    title = visiblePersonName ?? explicitTitle ?? "Pomysł na prezent";
    titleUsesPerson = Boolean(visiblePersonName);
  } else if (config.type === "journal") {
    title = explicitTitle ?? "Mój dzień";
  } else {
    title = explicitTitle ?? visiblePersonName ?? config.cardLabel;
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
  const imageCountLabel = formatNotesImageCount(input.imageCount);
  const dateLabel = formatNotesCardDate(
    input.occurredOn,
    input.createdAt
  );
  const metaParts = [
    visiblePersonName && !titleUsesPerson ? `O osobie: ${visiblePersonName}` : null,
    dateLabel,
    imageCountLabel,
  ].filter((part): part is string => Boolean(part));

  return {
    displayType: config.type,
    typeLabel: config.cardLabel,
    icon: config.icon,
    background: config.background,
    color: config.color,
    title,
    showTitle: title.trim().toLocaleLowerCase("pl-PL") !== config.cardLabel.toLocaleLowerCase("pl-PL"),
    titleUsesPerson,
    visiblePersonName,
    content: content ?? emptyFallbacks[config.type],
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
    ...(input.occurredOn !== undefined
      ? { occurred_on: input.occurredOn }
      : {}),
    ...(input.images !== undefined ? { images: input.images } : {}),
  };
}
