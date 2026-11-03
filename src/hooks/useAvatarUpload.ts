/**
 * useAvatarUpload.ts
 * ─────────────────────────────────────────────────────────────
 * Stable iOS Capacitor avatar upload hook.
 *
 * FLOW:
 *   1. Camera.getPhoto() — native prompt or web file picker
 *   2. Native: fetch(webPath). Web: decode FileReader data URL locally.
 *   3. supabase.storage.upload(file) — upload bytes, never a local path
 *
 * WHY NOT <input type="file">:
 *   Plain HTML file inputs are unstable in WKWebView / Capacitor iOS:
 *   • camera trigger can silently close the app (missing Info.plist keys)
 *   • file paths returned are not accessible from WebView context
 *   • no graceful permission-denied handling
 *
 * REQUIRED Info.plist keys (ios/App/App/Info.plist):
 *   NSCameraUsageDescription
 *   NSPhotoLibraryUsageDescription
 *   NSPhotoLibraryAddUsageDescription
 *
 * REQUIRED package:
 *   npm install @capacitor/camera
 *   npx cap sync ios
 */

import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabaseClient";

export type UploadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; filePath: string }
  | { status: "error"; message: string };

interface UseAvatarUploadOptions {
  userId: string;
  currentPath?: string | null;
  /** Called after successful upload so parent can persist avatarPath */
  onSuccess: (filePath: string) => void | Promise<void>;
  /** Called on any error so parent can surface a message */
  onError: (message: string) => void;
}

export function useAvatarUpload({ userId, currentPath, onSuccess, onError }: UseAvatarUploadOptions) {
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const pickAndUpload = async () => {
    if (state.status === "loading") return; // prevent double-tap
    setState({ status: "loading" });

    try {
      const native = Capacitor.isNativePlatform();
      // ── Step 1: Native iOS picker ─────────────────────────────
      // CameraSource.Prompt shows the iOS native action sheet:
      // "Take Photo" | "Photo Library" | "Files"
      // This is the only stable path in WKWebView / Capacitor.
      const photo = await Camera.getPhoto({
        quality: 88,
        allowEditing: true,
        // Web uses FileReader inside Camera: fetching a blob URL is blocked by
        // our connect-src policy. Native keeps the Capacitor URI bridge.
        resultType: native ? CameraResultType.Uri : CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        // Web has no registered PWA action sheet; native platforms ignore this
        // web-only option and retain their existing Camera/Gallery prompt.
        webUseInput: true,
      });

      if (native ? !photo.webPath : !photo.dataUrl) {
        setState({ status: "idle" });
        return;
      }

      // Native uses the Capacitor URI bridge. Web decodes the selected file
      // without fetching blob:/data: URLs or broadening connect-src.
      let blob: Blob;
      if (native) {
        const response = await fetch(photo.webPath!);
        if (!response.ok) throw new Error("Nie udało się odczytać zdjęcia.");
        blob = await response.blob();
      } else {
        const data = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(photo.dataUrl!);
        if (!data) throw new Error("Nie udało się odczytać zdjęcia.");
        const bytes = Uint8Array.from(atob(data[2]), char => char.charCodeAt(0));
        blob = new Blob([bytes], { type: data[1] });
      }

      // ── Step 3: Determine extension from MIME ────────────────
      // photo.format is "jpeg" | "png" | "webp" (no dot prefix)
      const ext      = blob.type.startsWith("image/") ? blob.type.slice(6).replace("jpeg", "jpg") : photo.format ?? "jpeg";
      const mimeType = blob.type || `image/${ext}`;
      const filePath = `${userId}/${Date.now()}.${ext}`;

      // Re-wrap blob as File so Supabase gets the correct Content-Type
      const file = new File([blob], `avatar.${ext}`, { type: mimeType });

      // ── Step 4: Upload to Supabase Storage ───────────────────
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: mimeType });

      if (uploadError) throw new Error(uploadError.message);

      // Persist the new reference before touching the old object. The callback
      // owns the profile update and may throw; in that case remove only the
      // newly-created orphan and retain the old avatar.
      try {
        await onSuccess(filePath);
      } catch (persistError) {
        const { error: orphanError } = await supabase.storage.from("avatars").remove([filePath]);
        const detail = persistError instanceof Error ? persistError.message : "Avatar save failed";
        if (orphanError) throw new Error(`${detail}; cleanup failed: ${orphanError.message}`);
        throw persistError;
      }

      if (currentPath && currentPath !== filePath) {
        const oldKey = currentPath.replace(/^avatars\//, "");
        const { error: cleanupError } = await supabase.storage.from("avatars").remove([oldKey]);
        if (cleanupError) throw new Error(`Avatar saved, but old avatar cleanup failed: ${cleanupError.message}`);
      }

      setState({ status: "success", filePath });

    } catch (err: unknown) {
      // Graceful handling — app must NEVER crash here
      const raw = err instanceof Error ? err.message : String(err);

      // User dismissed the picker — not an error worth surfacing
      if (
        raw.includes("cancelled") ||
        raw.includes("canceled") ||
        raw.includes("No image picked") ||
        raw.includes("User cancelled")
      ) {
        setState({ status: "idle" });
        return;
      }

      // Permission denied
      if (raw.includes("permission") || raw.includes("denied") || raw.includes("access")) {
        const msg = "Brak dostępu do aparatu lub galerii. Sprawdź ustawienia aplikacji.";
        setState({ status: "error", message: msg });
        onError(msg);
        return;
      }

      // Any other error
      const msg = raw || "Nie udało się przesłać zdjęcia. Spróbuj ponownie.";
      setState({ status: "error", message: msg });
      onError(msg);
    }
  };

  const reset = () => setState({ status: "idle" });

  return { state, pickAndUpload, reset };
}
