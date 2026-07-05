import type { CharacterMood } from "./character";

export interface DialogueLine {
  id: string;
  text: string;
  mood?: CharacterMood;
  /** Pause after this line in ms. Uses DialogueTyper lineDelay when omitted. */
  pause?: number;
  voice?: string;
}
