"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import {
  createMemoryEditorInitialState,
  getNotesTypeDisplayConfig,
  validateMemoryEditorState,
} from "@/lib/memories/notesMemoryTypes";
import type {
  EditorMode,
  MemoryEditorField,
  MemoryEditorState,
} from "@/lib/memories/notesMemoryTypes";
import type {
  NotesMemoryPerson,
  NotesMemoryRow,
} from "@/lib/repositories/memory.types";

interface PendingEditorImage {
  file: File;
  previewUrl: string;
}

export interface MemoryEditorSubmitInput {
  state: MemoryEditorState;
  newFiles: File[];
}

export interface MemoryEditorSubmitResult {
  uploadErrors: string[];
}

interface MemoryEditorSheetProps {
  mode: EditorMode;
  type: string | null;
  memory: NotesMemoryRow | null;
  people: NotesMemoryPerson[];
  imageDisplayUrls: Record<string, string>;
  onCancel: () => void;
  onSubmit: (
    input: MemoryEditorSubmitInput
  ) => Promise<MemoryEditorSubmitResult>;
}

export default function MemoryEditorSheet({
  mode,
  type,
  memory,
  people,
  imageDisplayUrls,
  onCancel,
  onSubmit,
}: MemoryEditorSheetProps) {
  const t = useTranslations("notes");
  const [state, setState] = useState(() =>
    createMemoryEditorInitialState({ mode, type, memory })
  );
  const [errors, setErrors] = useState<
    Partial<Record<MemoryEditorField, string>>
  >({});
  const [pendingImages, setPendingImages] = useState<PendingEditorImage[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedWithUploadErrors, setSavedWithUploadErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingEditorImage[]>([]);

  pendingImagesRef.current = pendingImages;

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      );
    };
  }, []);

  const config = getNotesTypeDisplayConfig(state.rawType);
  const createHeaderKeys = { note: "editor.addNote", memory: "editor.addMemory", gift: "editor.addGift", journal: "editor.addJournal", other: "editor.editOther" } as const;
  const editHeaderKeys = { note: "editor.editNote", memory: "editor.editMemory", gift: "editor.editGift", journal: "editor.editJournal", other: "editor.editOther" } as const;
  const headerTitle = t((mode === "create" ? createHeaderKeys : editHeaderKeys)[state.editorType]);
  const headerSubtitle = mode === "create" && state.editorType !== "other"
    ? t(`typeSelector.${state.editorType}Description`)
    : null;
  const showTitle = state.editorType !== "gift";
  const showDate =
    state.editorType === "memory" || state.editorType === "journal";
  const showPerson = state.editorType !== "journal";
  const showGiftValue = state.editorType === "gift";

  function updateField<Field extends keyof MemoryEditorState>(
    field: Field,
    value: MemoryEditorState[Field]
  ) {
    setState((current) => ({ ...current, [field]: value }));
    if (field in errors) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
    setFormError(null);
  }

  function addPendingImages(files: File[]) {
    const next = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingImages((current) => [...current, ...next]);
    setUploadErrors([]);
  }

  function removePendingImage(index: number) {
    setPendingImages((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function submit() {
    const validation = validateMemoryEditorState(state);
    if (!validation.isValid) {
      const localized: Partial<Record<MemoryEditorField, string>> = {};
      if (validation.errors.personId) localized.personId = t("validation.giftPersonRequired");
      if (validation.errors.valueText) localized.valueText = t("validation.giftIdeaRequired");
      if (validation.errors.contentText) localized.contentText = t(
        state.editorType === "journal" ? "validation.journalContentRequired" :
        state.editorType === "memory" ? "validation.memoryContentRequired" : "validation.noteTitleOrContent"
      );
      setErrors(localized);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setUploadErrors([]);

    try {
      const result = await onSubmit({
        state,
        newFiles: pendingImages.map((image) => image.file),
      });

      if (result.uploadErrors.length > 0) {
      setUploadErrors(result.uploadErrors.map(() => t("upload.failed")));
        setSavedWithUploadErrors(true);
        pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setPendingImages([]);
      }
    } catch {
      setFormError(t("upload.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const contentLabel =
    state.editorType === "gift"
      ? t("fields.giftNote")
      : state.editorType === "memory"
        ? t("fields.memoryContent")
        : state.editorType === "journal"
          ? t("fields.journalContent")
          : t("fields.noteContent");
  const contentPlaceholder =
    state.editorType === "note"
      ? t("placeholders.noteContent")
      : state.editorType === "memory"
        ? t("placeholders.memoryContent")
        : state.editorType === "gift"
          ? t("placeholders.giftNote")
          : state.editorType === "journal"
            ? t("placeholders.journalContent")
            : t("placeholders.otherContent");
  const titlePlaceholder =
    state.editorType === "memory"
      ? t("placeholders.memoryTitle")
      : state.editorType === "journal"
        ? t("placeholders.journalTitle")
        : state.editorType === "other"
          ? t("placeholders.otherTitle")
          : t("placeholders.noteTitle");

  return (
    <div
      className="hd-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="hd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-editor-title"
      >
        <div className="hd-modal-handle" />
        <div className="hd-modal-hdr">
          <div className="hd-modal-heading">
            <div className="hd-modal-title" id="memory-editor-title">
              <span aria-hidden="true">{config.icon}</span> {headerTitle}
            </div>
            {headerSubtitle && (
              <div className="hd-modal-subtitle">{headerSubtitle}</div>
            )}
          </div>
          <button
            type="button"
            className="hd-modal-close"
            onClick={onCancel}
            aria-label={t("editor.close")}
          >
            ✕
          </button>
        </div>

        <div className="hd-modal-body">
          {showTitle && (
            <div className="hd-field">
              <label className="hd-label" htmlFor="memory-editor-title-input">
                {t("fields.title")}
              </label>
              <input
                id="memory-editor-title-input"
                className="hd-input"
                value={state.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder={titlePlaceholder}
                disabled={savedWithUploadErrors}
              />
            </div>
          )}

          {showDate && (
            <div className="hd-field">
              <label className="hd-label" htmlFor="memory-editor-date">
                {t(state.editorType === "journal" ? "fields.journalDate" : "fields.memoryDate")}
              </label>
              <input
                id="memory-editor-date"
                type="date"
                className="hd-input"
                value={state.occurredOn}
                onChange={(event) =>
                  updateField("occurredOn", event.target.value)
                }
                disabled={savedWithUploadErrors}
              />
            </div>
          )}

          {showPerson && (
            <div className="hd-field">
              <label className="hd-label" htmlFor="memory-editor-person">
                {t(state.editorType === "gift" ? "fields.giftPerson" : "fields.person")}
              </label>
              <select
                id="memory-editor-person"
                className="hd-select"
                value={state.personId}
                onChange={(event) => updateField("personId", event.target.value)}
                aria-invalid={Boolean(errors.personId)}
                disabled={savedWithUploadErrors}
              >
                <option value="">
                  {t(state.editorType === "gift" ? "fields.choosePerson" : "fields.noAssignedPerson")}
                </option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
              {errors.personId && <div className="hd-field-error">{errors.personId}</div>}
            </div>
          )}

          {showGiftValue && (
            <div className="hd-field">
              <label className="hd-label" htmlFor="memory-editor-value">
                {t("fields.giftIdea")}
              </label>
              <input
                id="memory-editor-value"
                className="hd-input"
                value={state.valueText}
                onChange={(event) => updateField("valueText", event.target.value)}
                placeholder={t("placeholders.giftIdea")}
                aria-invalid={Boolean(errors.valueText)}
                disabled={savedWithUploadErrors}
              />
              {errors.valueText && <div className="hd-field-error">{errors.valueText}</div>}
            </div>
          )}

          <div className="hd-field">
            <label className="hd-label" htmlFor="memory-editor-content">
              {contentLabel}
            </label>
            <textarea
              id="memory-editor-content"
              className="hd-textarea"
              placeholder={contentPlaceholder}
              value={state.contentText}
              onChange={(event) => updateField("contentText", event.target.value)}
              aria-invalid={Boolean(errors.contentText)}
              disabled={savedWithUploadErrors}
            />
            {errors.contentText && <div className="hd-field-error">{errors.contentText}</div>}
          </div>

          <div className="hd-field">
            <label className="hd-label">{t("fields.images")}</label>

            {(state.existingImages.length > 0 || pendingImages.length > 0) && (
              <div className="hd-previews">
                {state.existingImages.map((storedValue, index) => {
                  const displayUrl = imageDisplayUrls[storedValue];
                  return (
                    <div key={`${storedValue}-${index}`} className="hd-preview-item">
                      {displayUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={displayUrl} alt={t("accessibility.existingImage", { index: index + 1 })} />
                      ) : (
                        <span className="hd-preview-placeholder" aria-label={t("accessibility.imageUnavailable")}>📷</span>
                      )}
                      <button
                        type="button"
                        className="hd-preview-remove"
                        onClick={() =>
                          updateField(
                            "existingImages",
                            state.existingImages.filter(
                              (_, itemIndex) => itemIndex !== index
                            )
                          )
                        }
                        aria-label={t("accessibility.removeExistingImage", { index: index + 1 })}
                        disabled={savedWithUploadErrors}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                {pendingImages.map((image, index) => (
                  <div key={image.previewUrl} className="hd-preview-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.previewUrl} alt={t("accessibility.newImage", { index: index + 1 })} />
                    <button
                      type="button"
                      className="hd-preview-remove"
                      onClick={() => removePendingImage(index)}
                      aria-label={t("accessibility.removeNewImage", { index: index + 1 })}
                      disabled={savedWithUploadErrors}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="hd-photo-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={savedWithUploadErrors}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <rect x="1" y="3" width="14" height="11" rx="2" />
                <circle cx="10.5" cy="8.5" r="1.5" />
                <path d="M1 10l3-3 2 2 3-3 3 3" />
              </svg>
              {t("actions.addImage")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              hidden
              onChange={(event) => {
                addPendingImages(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </div>

          {uploadErrors.length > 0 && (
            <div className="hd-upload-errors" role="status">
              <strong>{t("upload.partialFailure")}</strong>
              {uploadErrors.map((error, index) => <div key={`${error}-${index}`}>{error}</div>)}
            </div>
          )}
          {formError && <div className="hd-form-error" role="alert">{formError}</div>}
        </div>

        <div className="hd-modal-actions">
          <button type="button" className="hd-btn-cancel" onClick={onCancel}>
            {t(savedWithUploadErrors ? "actions.close" : "actions.cancel")}
          </button>
          <button
            type="button"
            className="hd-btn-save"
            onClick={submit}
            disabled={submitting || savedWithUploadErrors}
          >
            {submitting
              ? t("actions.saving")
              : savedWithUploadErrors
                ? t("actions.saved")
                : mode === "create"
                  ? t("actions.add")
                  : t("actions.save")}
          </button>
        </div>
      </section>
    </div>
  );
}
