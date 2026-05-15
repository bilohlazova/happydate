/**
 * useAvatarUpload.ts
 * ─────────────────────────────────────────────────────────────
 * Stable iOS Capacitor avatar upload hook.
 *
 * FLOW:
 *   1. Camera.getPhoto() — native iOS picker (Camera | Gallery | Files)
 *   2. fetch(webPath)    — convert capacitor:// URI → browser-safe Response
 *   3. response.blob()   — extract raw binary (never upload a local path)
 *   4. supabase.storage.upload(blob) — standard upload
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
import { supabase } from "@/lib/supabaseClient";

export type UploadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; filePath: string }
  | { status: "error"; message: string };

interface UseAvatarUploadOptions {
  userId: string;
  /** Called after successful upload so parent can persist avatarPath */
  onSuccess: (filePath: string) => void;
  /** Called on any error so parent can surface a message */
  onError: (message: string) => void;
}

export function useAvatarUpload({ userId, onSuccess, onError }: UseAvatarUploadOptions) {
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const pickAndUpload = async () => {
    if (state.status === "loading") return; // prevent double-tap
    setState({ status: "loading" });

    try {
      // ── Step 1: Native iOS picker ─────────────────────────────
      // CameraSource.Prompt shows the iOS native action sheet:
      // "Take Photo" | "Photo Library" | "Files"
      // This is the only stable path in WKWebView / Capacitor.
      const photo = await Camera.getPhoto({
        quality: 88,
        allowEditing: true,
        resultType: CameraResultType.Uri,  // returns a webPath, never a raw path
        source: CameraSource.Prompt,
      });

      // User cancelled → photo.webPath is undefined
      if (!photo.webPath) {
        setState({ status: "idle" });
        return;
      }

      // ── Step 2: Resolve capacitor:// URI → Blob ───────────────
      // Direct use of photo.path / photo.dataUrl is unreliable in
      // WKWebView. fetch(webPath) goes through Capacitor's bridge
      // and returns a proper Response that we can blob().
      const response = await fetch(photo.webPath);
      if (!response.ok) throw new Error("Nie udało się odczytać zdjęcia.");

      const blob = await response.blob();

      // ── Step 3: Determine extension from MIME ────────────────
      // photo.format is "jpeg" | "png" | "webp" (no dot prefix)
      const ext      = photo.format ?? "jpeg";
      const mimeType = blob.type || `image/${ext}`;
      const filePath = `${userId}/${Date.now()}.${ext}`;

      // Re-wrap blob as File so Supabase gets the correct Content-Type
      const file = new File([blob], `avatar.${ext}`, { type: mimeType });

      // ── Step 4: Upload to Supabase Storage ───────────────────
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: mimeType });

      if (uploadError) throw new Error(uploadError.message);

      // ── Step 5: Notify parent ─────────────────────────────────
      setState({ status: "success", filePath });
      onSuccess(filePath);

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