"use client";

import { useEffect, useState } from "react";
import ChatLauncherGiftTag from "@/components/ChatLauncherGiftTag";
import ChatAssistantModal from "@/components/ChatAssistantModal";

export default function ChatUIMount() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOpenChat() {
      setOpen(true);
    }

    window.addEventListener("happydate:open-chat", handleOpenChat);

    return () => {
      window.removeEventListener("happydate:open-chat", handleOpenChat);
    };
  }, []);

  return (
    <>
      <ChatLauncherGiftTag />
      <ChatAssistantModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
