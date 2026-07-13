"use client";

import { useEffect, useRef, useState } from "react";

import {
  createMemoryEditorInitialState,
  getMemoryEditorHeader,
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
  const header = getMemoryEditorHeader(mode, state.rawType);
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
      setErrors(validation.errors);
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
        setUploadErrors(result.uploadErrors);
        setSavedWithUploadErrors(true);
        pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setPendingImages([]);
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać. Spróbuj ponownie."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const contentLabel =
    state.editorType === "gift"
      ? "Dodatkowa notatka (opcjonalnie)"
      : state.editorType === "memory"
        ? "Opis"
        : state.editorType === "journal"
          ? "Treść wpisu"
          : "Treść";
  const contentPlaceholder =
    state.editorType === "note"
      ? "Co chcesz zapisać?"
      : state.editorType === "memory"
        ? "Co się wydarzyło?"
        : state.editorType === "gift"
          ? "Dlaczego to może być dobry pomysł?"
          : state.editorType === "journal"
            ? "Co dziś chodzi Ci po głowie?"
            : "Co chcesz zapisać?";
  const titlePlaceholder =
    state.editorType === "memory"
      ? "Nazwij to wspomnienie"
      : state.editorType === "journal"
        ? "Tytuł wpisu"
        : state.editorType === "other"
          ? "Tytuł zapisu"
          : "Tytuł notatki";

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
              <span aria-hidden="true">{config.icon}</span> {header.title}
            </div>
            {header.subtitle && (
              <div className="hd-modal-subtitle">{header.subtitle}</div>
            )}
          </div>
          <button
            type="button"
            className="hd-modal-close"
            onClick={onCancel}
            aria-label="Zamknij edytor"
          >
            ✕
          </button>
        </div>

        <div className="hd-modal-body">
          {showTitle && (
            <div className="hd-field">
              <label className="hd-label" htmlFor="memory-editor-title-input">
                Tytuł (opcjonalnie)
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
                {state.editorType === "journal" ? "Data wpisu" : "Kiedy to było?"}
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
                {state.editorType === "gift" ? "Dla kogo?" : "Osoba (opcjonalnie)"}
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
                  {state.editorType === "gift" ? "Wybierz osobę" : "Bez przypisanej osoby"}
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
                Pomysł na prezent
              </label>
              <input
                id="memory-editor-value"
                className="hd-input"
                value={state.valueText}
                onChange={(event) => updateField("valueText", event.target.value)}
                placeholder="Np. książka o fotografii"
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
            <label className="hd-label">Zdjęcia</label>

            {(state.existingImages.length > 0 || pendingImages.length > 0) && (
              <div className="hd-previews">
                {state.existingImages.map((storedValue, index) => {
                  const displayUrl = imageDisplayUrls[storedValue];
                  return (
                    <div key={`${storedValue}-${index}`} className="hd-preview-item">
                      {displayUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={displayUrl} alt={`Istniejące zdjęcie ${index + 1}`} />
                      ) : (
                        <span className="hd-preview-placeholder" aria-label="Zdjęcie bez podglądu">📷</span>
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
                        aria-label={`Usuń istniejące zdjęcie ${index + 1}`}
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
                    <img src={image.previewUrl} alt={`Nowe zdjęcie ${index + 1}`} />
                    <button
                      type="button"
                      className="hd-preview-remove"
                      onClick={() => removePendingImage(index)}
                      aria-label={`Usuń nowe zdjęcie ${index + 1}`}
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
              Dodaj zdjęcie
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
              <strong>Zapisano bez części zdjęć:</strong>
              {uploadErrors.map((error, index) => <div key={`${error}-${index}`}>{error}</div>)}
            </div>
          )}
          {formError && <div className="hd-form-error" role="alert">{formError}</div>}
        </div>

        <div className="hd-modal-actions">
          <button type="button" className="hd-btn-cancel" onClick={onCancel}>
            {savedWithUploadErrors ? "Zamknij" : "Anuluj"}
          </button>
          <button
            type="button"
            className="hd-btn-save"
            onClick={submit}
            disabled={submitting || savedWithUploadErrors}
          >
            {submitting
              ? "Zapisuję..."
              : savedWithUploadErrors
                ? "Zapisano"
                : mode === "create"
                  ? "Dodaj"
                  : "Zapisz"}
          </button>
        </div>
      </section>
    </div>
  );
}
