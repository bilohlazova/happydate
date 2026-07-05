"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from "react";

import type { CharacterMood } from "./character/Character.types";

export interface DialogueLine {
  id: string;
  text: string;
  mood?: CharacterMood;
  /** Пауза після цього рядка (мс). Якщо не задано — використовується lineDelay */
  pause?: number;
  voice?: string;
}

export interface DialogueTyperHandle {
  skipLine: () => void;
  skipAll: () => void;
  restart: () => void;
  pause: () => void;
  resume: () => void;
}

interface DialogueTyperProps {
  lines: DialogueLine[];
  typingSpeed?: number;
  lineDelay?: number;
  onSpeakingChange?: (speaking: boolean) => void;
  onMoodChange?: (mood: CharacterMood | undefined) => void;
  onFinished?: () => void;
}

type Phase = "typing" | "line-pause" | "finished";

interface TyperState {
  lineIndex: number;
  charIndex: number;
  phase: Phase;
}

type TyperAction =
  | { type: "TICK_CHAR" }
  | { type: "LINE_COMPLETE" }
  | { type: "NEXT_LINE"; totalLines: number }
  | { type: "SKIP_LINE"; lineLength: number }
  | { type: "SKIP_ALL" }
  | { type: "RESTART" };

const initialState: TyperState = {
  lineIndex: 0,
  charIndex: 0,
  phase: "typing",
};

function typerReducer(state: TyperState, action: TyperAction): TyperState {
  switch (action.type) {
    case "TICK_CHAR":
      if (state.phase !== "typing") return state;
      return { ...state, charIndex: state.charIndex + 1 };

    case "LINE_COMPLETE":
      if (state.phase !== "typing") return state;
      return { ...state, phase: "line-pause" };

    case "NEXT_LINE": {
      const nextLineIndex = state.lineIndex + 1;
      if (nextLineIndex >= action.totalLines) {
        return { ...state, phase: "finished" };
      }
      return { lineIndex: nextLineIndex, charIndex: 0, phase: "typing" };
    }

    case "SKIP_LINE":
      if (state.phase !== "typing") return state;
      return { ...state, charIndex: action.lineLength };

    // Не намагаємось вгадати charIndex останнього рядка —
    // рендер сам показує повний текст для всіх рядків, коли phase === "finished".
    case "SKIP_ALL":
      return { ...state, phase: "finished" };

    case "RESTART":
      return { ...initialState };

    default:
      return state;
  }
}

const DialogueTyper = forwardRef<DialogueTyperHandle, DialogueTyperProps>(
  function DialogueTyper(
    {
      lines,
      typingSpeed = 35,
      lineDelay = 700,
      onSpeakingChange,
      onMoodChange,
      onFinished,
    },
    ref
  ) {
    const [state, dispatch] = useReducer(typerReducer, initialState);
    const [isPaused, setIsPaused] = useState(false);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wasSpeakingRef = useRef<boolean | null>(null);
    const lastMoodRef = useRef<CharacterMood | undefined | null>(null);
    const wasFinishedRef = useRef(false);

    const currentLine = lines[state.lineIndex];

    // Скидаємо стан, коли змінюється сам масив рядків.
    useEffect(() => {
      dispatch({ type: "RESTART" });
      wasFinishedRef.current = false;
      lastMoodRef.current = null;
      setIsPaused(false);
    }, [lines]);

    // Планувальник: рівно один таймер на крок, перезапускається "з нуля"
    // при кожній зміні стану.
    useEffect(() => {
      if (isPaused) return;
      if (lines.length === 0) return; // захист від порожнього масиву

      const activeLine = lines[state.lineIndex];
      if (!activeLine) return;

      if (state.phase === "typing") {
        if (state.charIndex < activeLine.text.length) {
          timeoutRef.current = setTimeout(() => {
            dispatch({ type: "TICK_CHAR" });
          }, typingSpeed);
        } else {
          timeoutRef.current = setTimeout(() => {
            dispatch({ type: "LINE_COMPLETE" });
          }, 0);
        }
      } else if (state.phase === "line-pause") {
        const pauseDuration = activeLine.pause ?? lineDelay;
        timeoutRef.current = setTimeout(() => {
          dispatch({ type: "NEXT_LINE", totalLines: lines.length });
        }, pauseDuration);
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }, [state, isPaused, lines, typingSpeed, lineDelay]);

    // "Говоріння" — тільки коли реально друкується символ (не на пробілі/старті).
    useEffect(() => {
      const isSpeaking =
        state.phase === "typing" && !isPaused && state.charIndex > 0;

      if (wasSpeakingRef.current !== isSpeaking) {
        wasSpeakingRef.current = isSpeaking;
        onSpeakingChange?.(isSpeaking);
      }
    }, [state.phase, state.charIndex, isPaused, onSpeakingChange]);

    // Настрій персонажа — сповіщаємо лише коли він справді змінився.
    useEffect(() => {
      const mood = currentLine?.mood;
      if (lastMoodRef.current !== mood) {
        lastMoodRef.current = mood;
        onMoodChange?.(mood);
      }
    }, [currentLine, onMoodChange]);

    // Завершення — один раз.
    useEffect(() => {
      if (state.phase === "finished" && !wasFinishedRef.current) {
        wasFinishedRef.current = true;
        onFinished?.();
      }
    }, [state.phase, onFinished]);

    useImperativeHandle(
      ref,
      () => ({
        skipLine: () => {
          const activeLine = lines[state.lineIndex];
          if (!activeLine) return;
          dispatch({ type: "SKIP_LINE", lineLength: activeLine.text.length });
        },
        skipAll: () => {
          dispatch({ type: "SKIP_ALL" });
        },
        restart: () => {
          dispatch({ type: "RESTART" });
          wasFinishedRef.current = false;
          lastMoodRef.current = null;
        },
        pause: () => setIsPaused(true),
        resume: () => setIsPaused(false),
      }),
      [lines, state.lineIndex]
    );

    return (
      <div className="space-y-3 text-center">
        {lines.map((line, index) => {
          if (index > state.lineIndex) return null;

          const isCurrentAndUnfinished =
            index === state.lineIndex && state.phase !== "finished";

          const text = isCurrentAndUnfinished
            ? line.text.slice(0, state.charIndex)
            : line.text;

          return (
            <p
              key={line.id}
              className={
                index === 0
                  ? "text-xl font-semibold text-gray-900"
                  : "text-base leading-7 text-gray-600"
              }
            >
              {text}
              {isCurrentAndUnfinished && state.phase === "typing" && (
                <span className="animate-pulse">▍</span>
              )}
            </p>
          );
        })}
      </div>
    );
  }
);

export default DialogueTyper;