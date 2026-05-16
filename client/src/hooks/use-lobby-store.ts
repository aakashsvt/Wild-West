import { create } from 'zustand';
import type {
  PlayerInfo,
  LobbyRoom,
  LobbyStatus,
  StandingEntry,
  RaceResultEntry,
} from '@shared/types/multiplayer';

interface LobbyStore {
  socketId: string | null;
  roomId: string | null;
  players: PlayerInfo[];
  status: LobbyStatus | null;
  countdownValue: number | null;
  error: string | null;
  raceId: string | null;
  standings: StandingEntry[];
  raceResults: RaceResultEntry[] | null;

  setSocketId: (id: string) => void;
  setLobbyState: (room: LobbyRoom) => void;
  setCountdown: (n: number) => void;
  setError: (msg: string | null) => void;
  setRaceId: (id: string) => void;
  setStandings: (s: StandingEntry[]) => void;
  setRaceResults: (r: RaceResultEntry[]) => void;
  resetLobby: () => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  socketId: null,
  roomId: null,
  players: [],
  status: null,
  countdownValue: null,
  error: null,
  raceId: null,
  standings: [],
  raceResults: null,

  setSocketId: (id) => set({ socketId: id }),

  setLobbyState: (room) =>
    set({ roomId: room.roomId, players: room.players, status: room.status }),

  setCountdown: (n) => set({ countdownValue: n }),

  setError: (msg) => set({ error: msg }),

  setRaceId: (id) => set({ raceId: id }),

  setStandings: (s) => set({ standings: s }),

  setRaceResults: (r) => set({ raceResults: r }),

  resetLobby: () =>
    set({
      socketId: null,
      roomId: null,
      players: [],
      status: null,
      countdownValue: null,
      error: null,
      raceId: null,
      standings: [],
      raceResults: null,
    }),
}));
