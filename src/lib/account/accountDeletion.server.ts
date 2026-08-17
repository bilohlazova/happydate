import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "@/lib/supabase/publicConfig";

export const ACCOUNT_STORAGE_BUCKETS = ["avatars", "memory-images", "memory-audio"] as const;
const STORAGE_PAGE_SIZE = 1000;
const STORAGE_REMOVE_BATCH_SIZE = 100;
const MAX_STORAGE_DIRECTORIES = 5000;
const MAX_STORAGE_OBJECTS = 20000;

interface DeleteAccountResult {
  deletedStorageObjects: number;
}

function createAdminClient(): SupabaseClient {
  const config = requireSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) throw new Error("Account deletion is not configured");
  return createClient(config.url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isStorageDirectory(item: { id?: string | null; metadata?: unknown }): boolean {
  return item.id == null && item.metadata == null;
}

export async function listOwnedStorageObjects(
  client: SupabaseClient,
  bucket: string,
  userId: string,
): Promise<string[]> {
  const pending = [userId];
  const visited = new Set<string>();
  const objects: string[] = [];

  while (pending.length > 0) {
    const prefix = pending.shift();
    if (!prefix || visited.has(prefix)) continue;
    visited.add(prefix);
    if (visited.size > MAX_STORAGE_DIRECTORIES) throw new Error("Storage directory limit exceeded");

    for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
      const { data, error } = await client.storage.from(bucket).list(prefix, {
        limit: STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`Unable to inspect ${bucket}`);

      for (const item of data ?? []) {
        const path = `${prefix}/${item.name}`;
        if (isStorageDirectory(item)) pending.push(path);
        else objects.push(path);
        if (objects.length > MAX_STORAGE_OBJECTS) throw new Error("Storage object limit exceeded");
      }
      if ((data?.length ?? 0) < STORAGE_PAGE_SIZE) break;
    }
  }

  return objects;
}

async function removeOwnedStorageObjects(
  client: SupabaseClient,
  userId: string,
): Promise<number> {
  let deleted = 0;
  for (const bucket of ACCOUNT_STORAGE_BUCKETS) {
    const objects = await listOwnedStorageObjects(client, bucket, userId);
    for (let index = 0; index < objects.length; index += STORAGE_REMOVE_BATCH_SIZE) {
      const batch = objects.slice(index, index + STORAGE_REMOVE_BATCH_SIZE);
      const { error } = await client.storage.from(bucket).remove(batch);
      if (error) throw new Error(`Unable to clean ${bucket}`);
      deleted += batch.length;
    }
  }
  return deleted;
}

export async function permanentlyDeleteHappyDateAccount(
  userId: string,
): Promise<DeleteAccountResult> {
  const admin = createAdminClient();
  const deletedStorageObjects = await removeOwnedStorageObjects(admin, userId);
  const { error } = await admin.auth.admin.deleteUser(userId, false);
  if (error) throw new Error("Unable to delete account");
  return { deletedStorageObjects };
}
