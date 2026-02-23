"use client";

import { useEffect, useState } from "react";
import ChatBotModal from "@/components/ChatBotModal";

/** Глобальний контролер для головної (відкриває старий ChatBotModal). */
export default function ChatModalController() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("hd:openChat", onOpen);
    return () => window.removeEventListener("hd:openChat", onOpen);
  }, []);

  return (
    <ChatBotModal
      open={open}
      onClose={() => setOpen(false)}
      loading={false}
      handleAskAI={() => {}}
    />
  );
}
