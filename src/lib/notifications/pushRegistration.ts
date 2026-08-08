import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import {
  disableOwnedPushDevices,
  registerPushDevice,
  type PushPlatform,
} from "@/lib/repositories/reminders";

const REGISTRATION_TIMEOUT_MS = 15_000;

export function supportsNativePush(): boolean {
  const platform = Capacitor.getPlatform();
  return Capacitor.isNativePlatform() && (platform === "ios" || platform === "android");
}

function nativePushPlatform(): PushPlatform {
  const platform = Capacitor.getPlatform();
  if (platform !== "ios" && platform !== "android") {
    throw new Error("[pushRegistration] Native push is unavailable");
  }
  return platform;
}

async function acquirePushToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      void Promise.all(handles.map((handle) => handle.remove()));
      callback();
    };
    const timeout = setTimeout(() => {
      finish(() => reject(new Error("[pushRegistration] Registration timed out")));
    }, REGISTRATION_TIMEOUT_MS);

    void Promise.all([
      PushNotifications.addListener("registration", ({ value }) => {
        finish(() => resolve(value));
      }),
      PushNotifications.addListener("registrationError", ({ error }) => {
        finish(() => reject(new Error(`[pushRegistration] ${error}`)));
      }),
    ]).then((listeners) => {
      handles.push(...listeners);
      if (!settled) void PushNotifications.register().catch((error) => {
        finish(() => reject(error));
      });
    }).catch((error) => finish(() => reject(error)));
  });
}

export async function enableNativePush(locale: string): Promise<void> {
  if (!supportsNativePush()) throw new Error("[pushRegistration] Native push is unavailable");
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== "granted") {
    throw new Error("[pushRegistration] Permission denied");
  }

  const platform = nativePushPlatform();
  if (platform === "android") {
    await PushNotifications.createChannel({
      id: "happydate-reminders",
      name: "HappyDate reminders",
      description: "Important people and event reminders",
      importance: 4,
      vibration: true,
    });
  }
  const token = await acquirePushToken();
  await registerPushDevice(token, platform, locale);
}

export async function disableNativePush(): Promise<void> {
  await disableOwnedPushDevices();
  if (supportsNativePush()) await PushNotifications.unregister();
}
