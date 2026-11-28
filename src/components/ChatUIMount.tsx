"use client";

import ChatLauncherGiftTag from "@/components/ChatLauncherGiftTag";

/**
 * Floating launcher only. The chat itself is owned by the one HappyBotProvider in the root
 * layout, which also handles the `happydate:open-chat` event the launcher dispatches.
 */
export default function ChatUIMount() {
  return <ChatLauncherGiftTag />;
}
