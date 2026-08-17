import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Capacitor remote shell never permits cleartext and has a local failure screen", async () => {
  const [config, offline] = await Promise.all([
    readFile(new URL("../capacitor.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/native-offline.html", import.meta.url), "utf8"),
  ]);
  assert.match(config, /url: 'https:\/\/happydate\.vercel\.app'/);
  assert.match(config, /cleartext: false/);
  assert.match(config, /errorPath: 'native-offline\.html'/);
  assert.match(config, /loggingBehavior: 'debug'/);
  assert.match(offline, /location\.reload\(\)/);
  assert.match(offline, /viewport-fit=cover/);
});

test("Android protects private app data and has matching push channel metadata", async () => {
  const [manifest, strings, registration, icon] = await Promise.all([
    readFile(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8"),
    readFile(new URL("../android/app/src/main/res/values/strings.xml", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/notifications/pushRegistration.ts", import.meta.url), "utf8"),
    readFile(new URL("../android/app/src/main/res/drawable/ic_stat_happydate.xml", import.meta.url), "utf8"),
  ]);
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /default_notification_icon/);
  assert.match(manifest, /default_notification_channel_id/);
  assert.match(strings, /<string name="default_notification_channel_id">happydate-reminders<\/string>/);
  assert.match(registration, /id: "happydate-reminders"/);
  assert.match(icon, /android:fillColor="#FFFFFFFF"/);
});

test("iOS declares only permissions the current native experience uses", async () => {
  const plist = await readFile(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");
  for (const key of ["NSCameraUsageDescription", "NSMicrophoneUsageDescription", "NSPhotoLibraryUsageDescription", "NSPhotoLibraryAddUsageDescription"]) {
    assert.match(plist, new RegExp(`<key>${key}<\\/key>`));
  }
  assert.doesNotMatch(plist, /NSSpeechRecognitionUsageDescription|armv7/);
});

test("iOS bundles an honest app privacy manifest", async () => {
  const [project, manifest] = await Promise.all([
    readFile(new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url), "utf8"),
    readFile(new URL("../ios/App/App/PrivacyInfo.xcprivacy", import.meta.url), "utf8"),
  ]);

  assert.match(project, /PrivacyInfo\.xcprivacy in Resources/);
  assert.match(manifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  assert.match(manifest, /NSPrivacyCollectedDataTypeContacts/);
  assert.match(manifest, /NSPrivacyCollectedDataTypePhotosorVideos/);
  assert.match(manifest, /NSPrivacyCollectedDataTypeAudioData/);
  assert.match(manifest, /NSPrivacyCollectedDataTypeOtherUserContent/);
  assert.match(manifest, /NSPrivacyCollectedDataTypeDeviceID/);
  assert.doesNotMatch(manifest, /NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising/);
});
