import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function workflow() {
  return readFile(new URL(".github/workflows/quality.yml", ROOT), "utf8");
}

test("CI quality gate runs for pull requests and main without write permissions", async () => {
  const source = await workflow();
  assert.match(source, /pull_request:/);
  assert.match(source, /branches:\s*\[main\]/);
  assert.match(source, /permissions:\s*\n\s+contents: read/);
  assert.doesNotMatch(source, /contents:\s*write|pull-requests:\s*write|id-token:\s*write/);
  assert.match(source, /timeout-minutes:\s*20/);
  assert.match(source, /cancel-in-progress:\s*true/);
});

test("CI keeps strict audit mandatory and orders web checks within an independent job", async () => {
  const source = await workflow();
  const web = source.split("  web-quality:")[1].split("  database-security:")[0];
  assert.match(source, /dependency-security:[\s\S]*npm audit --audit-level=low/);
  assert.match(source, /needs: \[dependency-security, web-quality, database-security, redis-session-security, android-debug, ios-simulator\]/);
  const commands = [
    "npm ci",
    "npm run verify",
    "npm run build -- --webpack",
    "npm run smoke:production",
  ];
  let previous = -1;
  for (const command of commands) {
    const index = web.indexOf(`run: ${command}`);
    assert.ok(index > previous, `${command} must appear after the preceding gate`);
    previous = index;
  }
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});

test("CI uses placeholders rather than production secrets and pins the Node contract", async () => {
  const [source, packageJson, nvmrc] = await Promise.all([
    workflow(),
    readFile(new URL("package.json", ROOT), "utf8").then(JSON.parse),
    readFile(new URL(".nvmrc", ROOT), "utf8"),
  ]);
  assert.match(source, /node-version-file:\s*\.nvmrc/);
  assert.equal(nvmrc.trim(), "24");
  assert.equal(packageJson.engines.node, "24.x");
  assert.match(source, /example\.supabase\.co/);
  assert.match(source, /sb_publishable_ci_placeholder/);
  assert.doesNotMatch(source, /OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET|RESEND_API_KEY/);
  assert.doesNotMatch(source, /\$\{\{\s*secrets\./);
});

test("native shell jobs diagnose independently and compile without store signing", async () => {
  const source = await workflow();
  assert.match(source, /android-debug:[\s\S]*?runs-on: ubuntu-latest/);
  assert.doesNotMatch(source, /needs: web-quality/);
  assert.match(source, /ios-simulator:[\s\S]*?runs-on: macos-15/);
  assert.match(source, /npx cap sync android/);
  assert.match(source, /\.\/gradlew assembleDebug --no-daemon/);
  assert.match(source, /distribution: temurin[\s\S]*?java-version: "21"/);
  assert.match(source, /npx cap sync ios/);
  assert.match(source, /-project ios\/App\/App\.xcodeproj/);
  assert.match(source, /-destination 'generic\/platform=iOS Simulator'/);
  assert.match(source, /CODE_SIGNING_ALLOWED=NO/);
  assert.doesNotMatch(source, /MATCH_PASSWORD|APPLE_CERTIFICATE|PROVISIONING_PROFILE|KEYCHAIN_PASSWORD/);
});
