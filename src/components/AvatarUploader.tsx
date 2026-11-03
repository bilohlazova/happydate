"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string;
  currentPath?: string | null;
};

export default function AvatarUploader({ userId, currentPath }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file?: File | null) => {
    if (!file) return;

    try {
      setBusy(true);
      setError(null);

      const ext = file.name.split(".").pop() || "png";
      const objectKey = `${userId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(objectKey, file, {
          upsert: false,
          contentType: file.type,
        });

      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: objectKey })
        .eq("id", userId);

      if (updErr) {
        const { error: cleanupError } = await supabase.storage.from("avatars").remove([objectKey]);
        throw new Error(cleanupError ? `${updErr.message}; cleanup failed: ${cleanupError.message}` : updErr.message);
      }

      if (currentPath && currentPath !== objectKey) {
        const oldKey = currentPath.replace(/^avatars\//, "");
        const { error: cleanupError } = await supabase.storage.from("avatars").remove([oldKey]);
        if (cleanupError) throw new Error(`Avatar saved, but old avatar cleanup failed: ${cleanupError.message}`);
      }

      // 🔥 замість onUploaded — кидаємо подію
      window.dispatchEvent(
        new CustomEvent("happydate:avatar-updated", {
          detail: objectKey,
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer">
        {busy ? "Przesyłanie…" : "Zmień avatar"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          disabled={busy}
        />
      </label>

      {error && (
        <span className="text-red-600 text-sm">
          {error}
        </span>
      )}
      {currentPath && <button type="button" className="text-sm font-semibold" disabled={busy} aria-label="Remove avatar" onClick={async () => {
        setBusy(true); setError(null);
        const oldKey = currentPath.replace(/^avatars\//, "");
        const { error: profileError } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
        if (profileError) { setError(profileError.message); setBusy(false); return; }
        const { error: removeError } = await supabase.storage.from("avatars").remove([oldKey]);
        if (removeError) setError(`Avatar removed from profile; storage cleanup failed: ${removeError.message}`);
        window.dispatchEvent(new CustomEvent("happydate:avatar-updated", { detail: null }));
        setBusy(false);
      }}>Remove avatar</button>}
    </div>
  );
}
