import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";

const HOST = "127.0.0.1";
const STARTUP_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 8_000;

async function freePort() {
  const server = createServer();
  server.listen(0, HOST);
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}

async function request(baseUrl, path, init = {}) {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...init, signal });
}

async function waitUntilReady(baseUrl, child) {
  const started = Date.now();
  while (Date.now() - started < STARTUP_TIMEOUT_MS) {
    if (child.exitCode !== null) throw new Error(`production_server_exited:${child.exitCode}`);
    try {
      const response = await request(baseUrl, "/");
      if (response.status === 200) return response;
    } catch {
      // Server socket is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("production_server_start_timeout");
}

async function main() {
  const port = await freePort();
  const baseUrl = `http://${HOST}:${port}`;
  const nextBin = new URL("../node_modules/next/dist/bin/next", import.meta.url).pathname;
  const output = [];
  const child = spawn(process.execPath, [nextBin, "start", "--hostname", HOST, "--port", String(port)], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => output.push(String(chunk)));
  child.stderr.on("data", (chunk) => output.push(String(chunk)));

  try {
    const home = await waitUntilReady(baseUrl, child);
    const csp = home.headers.get("content-security-policy") ?? "";
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.equal(home.headers.get("x-content-type-options"), "nosniff");
    assert.equal(home.headers.get("x-frame-options"), "DENY");
    assert.equal(home.headers.get("x-powered-by"), null);

    for (const path of ["/about", "/privacy", "/auth/login", "/native-offline.html"]) {
      const response = await request(baseUrl, path);
      assert.equal(response.status, 200, `${path} must render in production`);
      assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    }
    assert.match(await (await request(baseUrl, "/native-offline.html")).text(), /HappyDate/i);
    assert.equal((await request(baseUrl, "/definitely-not-a-happydate-route")).status, 404);

    for (const path of ["/api/ai-chat", "/api/telemetry/error"]) {
      const response = await request(baseUrl, path, { method: "POST", body: "not-json" });
      assert.equal(response.status, 415, `${path} must reject non-JSON bodies`);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }

    for (const path of [
      "/api/auto-release",
      "/api/good-deed",
      "/api/heaven-messages",
      "/api/notify-gift",
      "/api/replicate/webhook",
    ]) {
      const response = await request(baseUrl, path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(response.status, 410, `${path} must remain retired and fail closed`);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }

    process.stdout.write("Production smoke passed: pages, headers, bounded JSON and retired APIs.\n");
  } catch (error) {
    const tail = output.join("").slice(-4_000);
    if (tail) process.stderr.write(tail);
    throw error;
  } finally {
    if (child.exitCode === null) child.kill("SIGTERM");
    await once(child, "exit").catch(() => undefined);
  }
}

await main();
