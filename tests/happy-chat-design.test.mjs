import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Happy chat exposes person context and a unified conversation surface", async () => {
  const modal = await readFile(new URL("../src/components/ChatAssistantModal.tsx", import.meta.url), "utf8");
  const conversation = await readFile(new URL("../src/components/chat-assistant/ConversationView.tsx", import.meta.url), "utf8");
  const composer = await readFile(new URL("../src/components/chat-assistant/ChatComposer.tsx", import.meta.url), "utf8");
  assert.match(modal, /className="happy-chat-shell/);
  assert.match(modal, /homeContext\.people\.find/);
  assert.match(modal, /t\("context\.person", \{ name: activePerson\.name \}\)/);
  assert.match(conversation, /happy-chat-message--\$\{message\.role\}/);
  assert.match(composer, /happy-chat-composer__field/);
});
