"use client";

import { useEffect, useState } from "react";
import ChatLauncherGiftTag from "@/components/ChatLauncherGiftTag";
import ChatBotModal from "@/components/ChatBotModal";

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
      {/* тепер без onClick */}
      <ChatLauncherGiftTag />

      <ChatBotModal
        open={open}
        onClose={() => setOpen(false)}
        loading={false}
        handleAskAI={() => {}}
      />
    </>
  );
}