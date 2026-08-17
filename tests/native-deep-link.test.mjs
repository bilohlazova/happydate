import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  internalPathFromNativeUrl,
  nativeAuthRedirect,
  safePostAuthPath,
} from "../src/lib/navigation/safeDeepLink.ts";

test("native deep links map only HappyDate-owned URLs to internal paths", () => {
  assert.equal(
    internalPathFromNativeUrl("com.happydate.app://auth/callback?code=abc&next=%2Fsurvey"),
    "/auth/callback?code=abc&next=%2Fsurvey",
  );
  assert.equal(
    internalPathFromNativeUrl("https://happydate.vercel.app/people/123?tab=notes"),
    "/people/123?tab=notes",
  );
  assert.equal(internalPathFromNativeUrl("https://evil.example/auth/callback?code=secret"), null);
  assert.equal(internalPathFromNativeUrl("com.attacker.app://auth/callback?code=secret"), null);
  assert.equal(internalPathFromNativeUrl("com.happydate.app://unknown/path"), null);
});

test("post-auth redirects cannot escape HappyDate", () => {
  assert.equal(safePostAuthPath("/people/123?tab=gifts"), "/people/123?tab=gifts");
  assert.equal(safePostAuthPath("https://evil.example"), "/dashboard");
  assert.equal(safePostAuthPath("//evil.example"), "/dashboard");
  assert.equal(safePostAuthPath("/\\evil.example"), "/dashboard");
  assert.equal(safePostAuthPath("/unknown"), "/dashboard");
});

test("native auth redirect uses the registered application scheme", () => {
  assert.equal(
    nativeAuthRedirect("/auth/callback", "next=%2Fsurvey"),
    "com.happydate.app://auth/callback?next=%2Fsurvey",
  );
});

test("both native platforms register the same custom scheme", async () => {
  const [ios, android, strings, pkg] = await Promise.all([
    readFile(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8"),
    readFile(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8"),
    readFile(new URL("../android/app/src/main/res/values/strings.xml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(ios, /<string>com\.happydate\.app<\/string>/);
  assert.match(android, /android:scheme="@string\/custom_url_scheme"/);
  assert.match(strings, /<string name="custom_url_scheme">com\.happydate\.app<\/string>/);
  assert.match(pkg, /"@capacitor\/app"/);
});
