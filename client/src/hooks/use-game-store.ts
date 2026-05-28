import { create } from "zustand";

interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  timeElapsed: number;
  speed: number;

  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  setSpeed: (speed: number) => void;
  incrementTime: (delta: number) => void;
  addScore: (points: number) => void;
}
export const localGroundY: { current: number | null } = { current: null };

export const useGameStore = create<GameState>((set) => ({
  isPlaying: false,
  isGameOver: false,
  score: 0,
  timeElapsed: 0,
  speed: 0,

  startGame: () =>
    set({
      isPlaying: true,
      isGameOver: false,
      score: 0,
      timeElapsed: 0,
      speed: 0,
    }),
  endGame: () => set({ isPlaying: false, isGameOver: true }),
  resetGame: () =>
    set({
      isPlaying: false,
      isGameOver: false,
      score: 0,
      timeElapsed: 0,
      speed: 0,
    }),

  setSpeed: (speed) => set({ speed }),
  incrementTime: (delta) =>
    set((state) => ({ timeElapsed: state.timeElapsed + delta })),
  addScore: (points) => set((state) => ({ score: state.score + points })),
}));
