// Minimal Upstash-REST-compatible bridge to a local Redis, for CI/staging smoke only.
// Accepts POST / with a JSON array command and a Bearer token, answers {"result": ...}.
// It shells out to redis-cli (--json), the same mechanism the SEC-01 Redis integration test
// already uses, so no third-party container is trusted with the AI budget counters.
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { promisify } from "node:util";

const exec = promisify(execFile);
const token = process.env.BRIDGE_TOKEN;
const port = Number(process.env.BRIDGE_PORT ?? 8079);
const cli = (process.env.REDIS_CLI ?? "redis-cli").split(" ");
if (!token || token.length < 16) throw new Error("BRIDGE_TOKEN (>= 16 chars) is required");

const server = createServer(async (req, res) => {
  const send = (status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method !== "POST" || req.headers.authorization !== `Bearer ${token}`) return send(401, { error: "unauthorized" });
  const chunks = [];
  for await (const chunk of req) { chunks.push(chunk); if (chunks.reduce((n, c) => n + c.length, 0) > 256 * 1024) return send(413, { error: "too_large" }); }
  let command;
  try { command = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return send(400, { error: "invalid_json" }); }
  if (!Array.isArray(command) || !command.length || command.some((part) => typeof part !== "string" && typeof part !== "number")) return send(400, { error: "invalid_command" });
  const upper = String(command[0]).toUpperCase();
  if (["FLUSHALL", "FLUSHDB", "CONFIG", "SHUTDOWN", "DEBUG", "SCRIPT", "MODULE", "REPLICAOF"].includes(upper)) return send(403, { error: "command_denied" });
  try {
    const { stdout } = await exec(cli[0], [...cli.slice(1), "--json", ...command.map(String)], { maxBuffer: 1024 * 1024 });
    send(200, { result: JSON.parse(stdout) });
  } catch (error) {
    send(400, { error: String(error.stderr ?? error.message).slice(0, 200) });
  }
});
server.listen(port, "127.0.0.1", () => console.log(`redis-rest-bridge listening on 127.0.0.1:${port}`));
