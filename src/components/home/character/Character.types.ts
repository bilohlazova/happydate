export type CharacterMood =
  | "happy"
  | "calm"
  | "thinking"
  | "listening"
  | "celebrating";

export interface CharacterState {
  mood: CharacterMood;
  speaking: boolean;
}