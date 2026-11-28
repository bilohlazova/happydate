"use client";

import { useEffect, useState } from "react";
import UserScopedChatAssistant from "@/components/assistant/UserScopedChatAssistant";

/** Глобальний контролер, який відкриває новий AI-асистент. */
export default function ChatModalController() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("hd:openChat", onOpen);
    return () => window.removeEventListener("hd:openChat", onOpen);
  }, []);

  return (
    <UserScopedChatAssistant open={open} onClose={() => setOpen(false)} />
  );
}
