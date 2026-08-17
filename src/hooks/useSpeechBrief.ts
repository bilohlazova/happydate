"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  selectSpeechVoice,
  splitSpeechText,
} from "@/lib/speech/speechText";

export function useSpeechBrief(text: string, locale: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const sessionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingRef = useRef(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    speakingRef.current = speaking;
    pausedRef.current = paused;
  }, [paused, speaking]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    // Browser speech support can only be detected after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(supported);
    if (!supported) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      sessionRef.current += 1;
      clearTimer();
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, [clearTimer]);

  const cancel = useCallback(() => {
    sessionRef.current += 1;
    clearTimer();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    speakingRef.current = false;
    pausedRef.current = false;
    setSpeaking(false);
    setPaused(false);
    setWasInterrupted(false);
    setProgress({ current: 0, total: 0, percent: 0 });
  }, [clearTimer]);

  const interrupt = useCallback(() => {
    if (!speakingRef.current) return;
    sessionRef.current += 1;
    clearTimer();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    speakingRef.current = false;
    pausedRef.current = false;
    setSpeaking(false);
    setPaused(false);
    setWasInterrupted(true);
  }, [clearTimer]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (speakingRef.current && !pausedRef.current) {
          window.speechSynthesis.pause();
          pausedRef.current = true;
          setPaused(true);
        }
        return;
      }
      if (
        speakingRef.current &&
        pausedRef.current &&
        !window.speechSynthesis.paused &&
        !window.speechSynthesis.speaking
      ) {
        interrupt();
      }
    };
    const handlePageHide = () => interrupt();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [interrupt]);

  const speak = useCallback(() => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setIsSupported(false);
      return false;
    }
    if (speaking) {
      cancel();
      return true;
    }
    const chunks = splitSpeechText(text);
    if (chunks.length === 0) {
      setError("invalid-text");
      setSpeaking(false);
      return false;
    }

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    clearTimer();
    setError(null);
    setWasInterrupted(false);
    speakingRef.current = true;
    pausedRef.current = false;
    setSpeaking(true);
    setPaused(false);
    setProgress({ current: 1, total: chunks.length, percent: 0 });
    window.speechSynthesis.cancel();

    const voice = selectSpeechVoice(voicesRef.current, locale);
    const speakChunk = (index: number) => {
      if (sessionRef.current !== session) return;
      if (index >= chunks.length) {
        speakingRef.current = false;
        pausedRef.current = false;
        setSpeaking(false);
        setPaused(false);
        setWasInterrupted(false);
        setProgress({ current: chunks.length, total: chunks.length, percent: 100 });
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = voice?.lang ?? locale;
      utterance.rate = 0.95;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (sessionRef.current !== session) return;
        setProgress({
          current: index + 1,
          total: chunks.length,
          percent: Math.round((index / chunks.length) * 100),
        });
      };
      utterance.onend = () => {
        if (sessionRef.current !== session) return;
        timerRef.current = setTimeout(() => speakChunk(index + 1), 40);
      };
      utterance.onerror = (event) => {
        if (sessionRef.current !== session) return;
        speakingRef.current = false;
        pausedRef.current = false;
        setSpeaking(false);
        setPaused(false);
        if (event.error === "interrupted") {
          setWasInterrupted(true);
        } else if (event.error !== "canceled") {
          setError(event.error || "speech-failed");
        }
      };
      window.speechSynthesis.speak(utterance);
    };

    // WKWebView can dispatch the previous utterance's cancellation
    // asynchronously. A short gap prevents it from cancelling the new one.
    timerRef.current = setTimeout(() => speakChunk(0), 75);
    return true;
  }, [cancel, clearTimer, locale, speaking, text]);

  const pause = useCallback(() => {
    if (!speaking || paused || !("speechSynthesis" in window)) return false;
    window.speechSynthesis.pause();
    pausedRef.current = true;
    setPaused(true);
    return true;
  }, [paused, speaking]);

  const resume = useCallback(() => {
    if (!speaking || !paused || !("speechSynthesis" in window)) return false;
    window.speechSynthesis.resume();
    pausedRef.current = false;
    setPaused(false);
    return true;
  }, [paused, speaking]);

  const toggle = useCallback(() => {
    if (paused) return resume();
    if (speaking) return pause();
    return speak();
  }, [pause, paused, resume, speak, speaking]);

  return { isSupported, speaking, paused, wasInterrupted, error, progress, speak, pause, resume, toggle, cancel };
}
