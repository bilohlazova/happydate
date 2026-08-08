export type PushPlatform = "ios" | "android";

export type PushDevice = {
  id: string;
  platform: PushPlatform;
  token: string;
};

export type PushMessage = {
  title: string;
  body: string;
  deliveryId: string;
  reminderId: string;
  actionUrl: string;
};

export type ProviderResult = {
  ok: boolean;
  messageId?: string;
  errorCode?: string;
  disableToken: boolean;
};

const encoder = new TextEncoder();

function base64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function pemBytes(pem: string): Uint8Array {
  const normalized = pem.replaceAll("\\n", "\n");
  const body = normalized.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, "");
  return Uint8Array.from(atob(body), (character) => character.charCodeAt(0));
}

async function signedJwt(
  header: Record<string, string>,
  claims: Record<string, string | number>,
  privateKey: string,
  algorithm: "RS256" | "ES256",
): Promise<string> {
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const rsa = algorithm === "RS256";
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(privateKey),
    rsa ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } : { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    rsa ? "RSASSA-PKCS1-v1_5" : { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

let fcmAccessToken: { value: string; expiresAt: number } | null = null;

async function getFcmAccessToken(): Promise<string> {
  if (fcmAccessToken && fcmAccessToken.expiresAt > Date.now() + 60_000) return fcmAccessToken.value;
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
  if (!clientEmail || !privateKey) throw new Error("fcm_not_configured");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signedJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    privateKey,
    "RS256",
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`fcm_auth_${response.status}`);
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("fcm_auth_invalid_response");
  fcmAccessToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000,
  };
  return payload.access_token;
}

async function sendFcm(device: PushDevice, message: PushMessage): Promise<ProviderResult> {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) return { ok: false, errorCode: "fcm_not_configured", disableToken: false };
  try {
    const accessToken = await getFcmAccessToken();
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          token: device.token,
          notification: { title: message.title, body: message.body },
          data: {
            deliveryId: message.deliveryId,
            reminderId: message.reminderId,
            actionUrl: message.actionUrl,
          },
          android: { priority: "high", notification: { channel_id: "happydate-reminders" } },
        },
      }),
    });
    const payload = await response.json().catch(() => ({})) as {
      name?: string;
      error?: { status?: string; details?: Array<{ errorCode?: string }> };
    };
    if (response.ok) return { ok: true, messageId: payload.name, disableToken: false };
    const detail = payload.error?.details?.find((item) => item.errorCode)?.errorCode;
    const code = detail ?? payload.error?.status ?? `fcm_http_${response.status}`;
    return {
      ok: false,
      errorCode: code,
      disableToken: code === "UNREGISTERED" || code === "SENDER_ID_MISMATCH",
    };
  } catch (error) {
    return { ok: false, errorCode: error instanceof Error ? error.message : "fcm_unknown", disableToken: false };
  }
}

let apnsToken: { value: string; expiresAt: number } | null = null;

async function getApnsToken(): Promise<string> {
  if (apnsToken && apnsToken.expiresAt > Date.now() + 60_000) return apnsToken.value;
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const keyId = Deno.env.get("APNS_KEY_ID");
  const privateKey = Deno.env.get("APNS_PRIVATE_KEY");
  if (!teamId || !keyId || !privateKey) throw new Error("apns_not_configured");
  const now = Math.floor(Date.now() / 1000);
  apnsToken = {
    value: await signedJwt({ alg: "ES256", kid: keyId }, { iss: teamId, iat: now }, privateKey, "ES256"),
    expiresAt: Date.now() + 50 * 60 * 1000,
  };
  return apnsToken.value;
}

async function sendApns(device: PushDevice, message: PushMessage): Promise<ProviderResult> {
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  if (!bundleId) return { ok: false, errorCode: "apns_not_configured", disableToken: false };
  try {
    const authorization = await getApnsToken();
    const host = Deno.env.get("APNS_ENVIRONMENT") === "sandbox"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com";
    const response = await fetch(`${host}/3/device/${encodeURIComponent(device.token)}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${authorization}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        aps: { alert: { title: message.title, body: message.body }, sound: "default" },
        deliveryId: message.deliveryId,
        reminderId: message.reminderId,
        actionUrl: message.actionUrl,
      }),
    });
    const apnsId = response.headers.get("apns-id") ?? undefined;
    if (response.ok) return { ok: true, messageId: apnsId, disableToken: false };
    const payload = await response.json().catch(() => ({})) as { reason?: string };
    const code = payload.reason ?? `apns_http_${response.status}`;
    return {
      ok: false,
      errorCode: code,
      disableToken: ["BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"].includes(code),
    };
  } catch (error) {
    return { ok: false, errorCode: error instanceof Error ? error.message : "apns_unknown", disableToken: false };
  }
}

export function sendPush(device: PushDevice, message: PushMessage): Promise<ProviderResult> {
  return device.platform === "ios" ? sendApns(device, message) : sendFcm(device, message);
}
