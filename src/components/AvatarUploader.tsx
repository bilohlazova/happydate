"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string;
  currentPath?: string | null;
  onUploaded?: (newPath: string) => void;
};

export default function AvatarUploader({ userId, currentPath, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    try {
      setBusy(true);
      setError(null);

      // 1) видаляємо старий файл (якщо був)
      if (currentPath) {
        const oldKey = currentPath.replace(/^avatars\//, "");
        await supabase.storage.from("avatars").remove([oldKey]);
      }

      // 2) генеруємо новий шлях
      const ext = file.name.split(".").pop() || "png";
      const objectKey = `${userId}/${Date.now()}.${ext}`;

      // 3) завантажуємо в bucket "avatars"
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(objectKey, file, {
          upsert: false,
          contentType: file.type,
        });

      if (upErr) throw upErr;

      const newPath = objectKey;

      // 4) оновлюємо профіль
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newPath })
        .eq("id", userId);

      if (updErr) throw updErr;

      onUploaded?.(newPath);
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
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </div>
  );
}
