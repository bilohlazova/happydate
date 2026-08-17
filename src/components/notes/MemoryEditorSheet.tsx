"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraDirection } from "@capacitor/camera";

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
  NotesMemoryEvent,
} from "@/lib/repositories/memory.types";
import { MAX_MEMORY_AUDIO_DURATION_SECONDS, memoryAudioExtension } from "@/lib/storage/memoryAudio";
import { validateMemoryImageFile } from "@/lib/storage/memoryImages";

interface PendingEditorImage {
  file: File;
  previewUrl: string;
}

export interface MemoryEditorSubmitInput {
  state: MemoryEditorState;
  newFiles: File[];
  audioFile: File | null;
}

export interface MemoryEditorSubmitResult {
  uploadErrors: string[];
}

interface MemoryEditorSheetProps {
  mode: EditorMode;
  type: string | null;
  memory: NotesMemoryRow | null;
  people: NotesMemoryPerson[];
  events: NotesMemoryEvent[];
  imageDisplayUrls: Record<string, string>;
  audioDisplayUrl: string | null;
  initialPersonId: string;
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
  events,
  imageDisplayUrls,
  audioDisplayUrl,
  initialPersonId,
  onCancel,
  onSubmit,
}: MemoryEditorSheetProps) {
  const t = useTranslations("notes");
  const [state, setState] = useState(() => {
    const initialState = createMemoryEditorInitialState({ mode, type, memory });
    return mode === "create" && initialState.editorType !== "journal"
      ? { ...initialState, personId: initialPersonId }
      : initialState;
  });
  const [errors, setErrors] = useState<
    Partial<Record<MemoryEditorField, string>>
  >({});
  const [pendingImages, setPendingImages] = useState<PendingEditorImage[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedWithUploadErrors, setSavedWithUploadErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingEditorImage[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const onCancelRef = useRef(onCancel);
  const interactionBusyRef = useRef(false);

  pendingImagesRef.current = pendingImages;
  onCancelRef.current = onCancel;
  interactionBusyRef.current = submitting || cameraBusy || recording;

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      );
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
  }, [audioPreviewUrl]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const firstControl = titleInputRef.current ?? dialog?.querySelector<HTMLElement>(
      "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])"
    );
    firstControl?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !interactionBusyRef.current) {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled]), audio[controls]"
      ));
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  async function startRecording() {
    setAudioError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAudioError(t("audio.unsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
        .find((value) => MediaRecorder.isTypeSupported(value));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      };
      recorderRef.current = recorder;
      setRecordingSeconds(0);
      setRecording(true);
      recorder.start(1000);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((seconds) => {
          const next = seconds + 1;
          if (next >= MAX_MEMORY_AUDIO_DURATION_SECONDS && recorder.state === "recording") recorder.stop();
          return Math.min(next, MAX_MEMORY_AUDIO_DURATION_SECONDS);
        });
      }, 1000);
    } catch {
      setAudioError(t("audio.permissionError"));
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function removeAudio() {
    if (recording) stopRecording();
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    updateField("audioUrl", "");
  }

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
  const showEvent = state.editorType !== "journal";

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
    const validFiles = files.filter((file) => {
      const validationError = validateMemoryImageFile(file);
      if (validationError) setCameraError(t("camera.invalidImage"));
      return !validationError;
    });
    const next = validFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingImages((current) => [...current, ...next]);
    setUploadErrors([]);
    if (validFiles.length === files.length) setCameraError(null);
  }

  async function takePhoto() {
    setCameraError(null);

    if (!Capacitor.isNativePlatform()) {
      cameraInputRef.current?.click();
      return;
    }

    if (cameraBusy) return;
    setCameraBusy(true);
    try {
      const photo = await Camera.takePhoto({
        quality: 88,
        targetWidth: 2048,
        targetHeight: 2048,
        correctOrientation: true,
        cameraDirection: CameraDirection.Rear,
        saveToGallery: false,
        includeMetadata: true,
      });
      if (!photo.webPath) throw new Error("CAMERA_RESULT_UNREADABLE");

      const response = await fetch(photo.webPath);
      if (!response.ok) throw new Error("CAMERA_RESULT_UNREADABLE");
      const blob = await response.blob();
      const format = photo.metadata?.format?.toLowerCase() || "jpeg";
      const extension = format === "jpg" ? "jpeg" : format;
      const mimeType = blob.type || `image/${extension}`;
      addPendingImages([
        new File([blob], `note-photo-${Date.now()}.${extension}`, { type: mimeType }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (
        message.includes("cancel") ||
        message.includes("user dismissed") ||
        message.includes("no image picked")
      ) return;
      setCameraError(
        message.includes("permission") || message.includes("denied")
          ? t("camera.permissionError")
          : t("camera.captureFailed")
      );
    } finally {
      setCameraBusy(false);
    }
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
    const audioSatisfiesNote = state.editorType === "note" && Boolean(audioBlob || state.audioUrl);
    if (!validation.isValid && !(audioSatisfiesNote && validation.errors.contentText && Object.keys(validation.errors).length === 1)) {
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
        audioFile: audioBlob
          ? new File([audioBlob], `voice-note.${memoryAudioExtension(audioBlob.type)}`, { type: audioBlob.type })
          : null,
      });

      if (result.uploadErrors.length > 0) {
      setUploadErrors(result.uploadErrors.map(() => t("upload.failed")));
        setSavedWithUploadErrors(true);
        pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setPendingImages([]);
      }
    } catch (error) {
      const failureCode = error instanceof Error ? error.message : "";
      setFormError(
        failureCode === "AUDIO_UPLOAD_FAILED"
          ? t("audio.uploadFailed")
          : failureCode === "OFFLINE"
            ? t("states.offlineAction")
            : failureCode === "AUTH_REQUIRED"
              ? t("upload.signIn")
              : t("upload.saveFailed")
      );
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
        ref={dialogRef}
        className="hd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-editor-title"
        aria-describedby={formError ? "memory-editor-error" : undefined}
        aria-busy={submitting}
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
                ref={titleInputRef}
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

          {showEvent && (
            <div className="hd-field">
              <label className="hd-label" htmlFor="memory-editor-event">
                {t("fields.event")}
              </label>
              <select
                id="memory-editor-event"
                className="hd-select"
                value={state.eventId}
                onChange={(event) => {
                  const eventId = event.target.value;
                  const linkedEvent = events.find((item) => item.id === eventId);
                  setState((current) => ({
                    ...current,
                    eventId,
                    personId: current.personId || linkedEvent?.personId || "",
                  }));
                  setFormError(null);
                }}
                disabled={savedWithUploadErrors}
              >
                <option value="">{t("fields.noAssignedEvent")}</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} · {event.date}
                  </option>
                ))}
              </select>
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
            <label className="hd-label">{t("audio.label")}</label>
            {recording ? (
              <button type="button" className="hd-photo-upload" onClick={stopRecording}>
                <span className="hd-audio-wave" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 80}ms` }} />)}
                </span>
                {t("audio.stop", { seconds: recordingSeconds })}
              </button>
            ) : (audioPreviewUrl || (state.audioUrl && audioDisplayUrl)) ? (
              <div className="hd-audio-preview">
                <audio controls preload="metadata" src={audioPreviewUrl ?? audioDisplayUrl ?? undefined}>
                  {t("audio.unsupported")}
                </audio>
                <button type="button" className="hd-preview-remove" onClick={removeAudio} aria-label={t("audio.remove")}>✕</button>
              </div>
            ) : (
              <button type="button" className="hd-photo-upload" onClick={startRecording} disabled={savedWithUploadErrors}>
                🎙️ {t("audio.record")}
              </button>
            )}
            <div className="hd-audio-hint">{t("audio.hint")}</div>
            {audioError && <div className="hd-field-error" role="alert">{audioError}</div>}
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

            <div className="hd-photo-actions">
              <button
                type="button"
                className="hd-photo-upload"
                onClick={takePhoto}
                disabled={savedWithUploadErrors || cameraBusy}
              >
                <span aria-hidden="true">📷</span>
                {t(cameraBusy ? "camera.opening" : "camera.takePhoto")}
              </button>
              <button
                type="button"
                className="hd-photo-upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={savedWithUploadErrors || cameraBusy}
              >
                <span aria-hidden="true">🖼️</span>
                {t("camera.chooseGallery")}
              </button>
            </div>
            {cameraError && <div className="hd-field-error" role="alert">{cameraError}</div>}
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
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => {
                addPendingImages(Array.from(event.target.files ?? []).slice(0, 1));
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
          {formError && <div id="memory-editor-error" className="hd-form-error" role="alert">{formError}</div>}
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
