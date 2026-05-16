export interface PlayerInfo {
  socketId: string;
  username: string;
  colorIndex: number;
  isReady: boolean;
}

export type LobbyStatus = 'waiting' | 'countdown' | 'starting';

export interface LobbyRoom {
  roomId: string;
  players: PlayerInfo[];
  status: LobbyStatus;
  minPlayers: number;
  maxPlayers: number;
}

export interface StandingEntry {
  username: string;
  colorIndex: number;
  score: number;
  position: number;   // 1-based, server-assigned
  finished: boolean;
}

export interface RaceResultEntry {
  position: number;
  username: string;
  score: number;
  timeTaken: number;
}

export type Vec3Tuple = [number, number, number];
export type QuatTuple = [number, number, number, number];

export interface RacePlayerSnapshot {
  position: Vec3Tuple;
  rotation: QuatTuple;
  velocity: Vec3Tuple;
  speed: number;
  animation: string;
  sentAt: number;
}

export interface RacePlayerState extends RacePlayerSnapshot {
  socketId: string;
}

export interface ClientToServerEvents {
  'lobby:join':    (payload: { username: string }) => void;
  'lobby:ready':   () => void;
  'lobby:leave':   () => void;
  'race:update':   (payload: { score: number; timeTaken: number }) => void;
  'race:state':    (payload: RacePlayerSnapshot) => void;
  'race:finish':   (payload: { score: number; timeTaken: number }) => void;
}

export interface ServerToClientEvents {
  'lobby:state':     (room: LobbyRoom) => void;
  'lobby:countdown': (secondsRemaining: number) => void;
  'lobby:start':     (payload: { raceId: string }) => void;
  'lobby:error':     (message: string) => void;
  'race:standings':  (standings: StandingEntry[]) => void;
  'race:player-state': (state: RacePlayerState) => void;
  'race:results':    (results: RaceResultEntry[]) => void;
}
