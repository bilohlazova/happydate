import type { ChatMessage } from "../../components/chat-assistant/types.ts";
import { ASSISTANT_CHAT_LIMITS, type AssistantConversationItem } from "./chatContract.ts";

export function buildConversationHistory(messages: ChatMessage[]): AssistantConversationItem[] {
  const eligible = messages
    .filter((message) => message.status !== "error" && message.status !== "streaming" && message.content.trim())
    .map(({ role, content }) => ({ role, content: content.trim() }));
  const limited = eligible.slice(-ASSISTANT_CHAT_LIMITS.conversationItems);
  const result: AssistantConversationItem[] = [];
  let characters = 0;

  for (let index = limited.length - 1; index >= 0; index -= 1) {
    const item = limited[index];
    if (characters + item.content.length > ASSISTANT_CHAT_LIMITS.conversationCharacters) break;
    result.unshift(item);
    characters += item.content.length;
  }
  return result;
}
