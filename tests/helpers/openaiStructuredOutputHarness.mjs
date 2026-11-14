import assert from "node:assert/strict";

export function assertStrictObjectSchemas(schema) {
  if (schema.type === "object" || schema.type?.includes?.("object")) {
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual([...(schema.required ?? [])].sort(), Object.keys(schema.properties ?? {}).sort());
  }
  for (const child of Object.values(schema.properties ?? {})) assertStrictObjectSchemas(child);
  for (const child of [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])]) assertStrictObjectSchemas(child);
  if (schema.items) assertStrictObjectSchemas(schema.items);
}

/** Exercise the real SDK transport; any non-OpenAI request (including a DB write) fails. */
export async function withOpenAiOutput(output, run) {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://api.openai.com/v1/responses");
    assert.equal(init.method, "POST");
    requests.push(JSON.parse(init.body));
    return Response.json({
      id: "resp_synthetic", object: "response", status: "completed",
      output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(output), annotations: [] }] }],
    });
  };
  try { return { value: await run(), requests }; }
  finally { globalThis.fetch = originalFetch; }
}
