"use client";
import { useState } from "react";
import ChatLauncherGiftTag from "@/components/ChatLauncherGiftTag";
import ChatBotModal from "@/components/ChatBotModal";

export default function ChatUIMount() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ChatLauncherGiftTag onClick={() => setOpen(true)} />
      <ChatBotModal
        open={open}
        onClose={() => setOpen(false)}
        loading={false}
        handleAskAI={() => {}}
      />
    </>
  );
}
