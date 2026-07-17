"use client";

import { useCallback, useEffect, useState } from "react";

export function useSpeechBrief(text: string, locale: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setIsSupported(false);
      return false;
    }
    if (speaking) {
      cancel();
      return true;
    }
    setError(null);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = (event) => {
      setSpeaking(false);
      if (event.error !== "canceled" && event.error !== "interrupted") {
        setError(event.error);
      }
    };
    window.speechSynthesis.speak(utterance);
    return true;
  }, [cancel, locale, speaking, text]);

  return { isSupported, speaking, error, speak, cancel };
}
