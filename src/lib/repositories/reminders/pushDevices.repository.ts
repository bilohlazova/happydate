import { supabase } from "@/lib/supabaseClient";

export type PushPlatform = "ios" | "android";

export async function registerPushDevice(
  token: string,
  platform: PushPlatform,
  locale: string,
): Promise<void> {
  const { error } = await supabase.rpc("register_my_push_device", {
    p_token: token,
    p_platform: platform,
    p_locale: locale,
  });
  if (error) throw new Error(`[pushDevices.repository] Registration failed: ${error.message}`);
}

export async function disableOwnedPushDevices(): Promise<void> {
  const { error } = await supabase.rpc("disable_my_push_devices");
  if (error) throw new Error(`[pushDevices.repository] Disable failed: ${error.message}`);
}
