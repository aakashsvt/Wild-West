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
  timeTaken: number;
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

export interface ClientToServerEvents {
  'lobby:join':    (payload: { username: string }) => void;
  'lobby:ready':   () => void;
  'lobby:unready': () => void;
  'lobby:leave':   () => void;
  'race:update':   (payload: { score: number; timeTaken: number }) => void;
  'race:finish':   (payload: { score: number; timeTaken: number }) => void;
}

export interface ServerToClientEvents {
  'lobby:state':     (room: LobbyRoom) => void;
  'lobby:countdown': (secondsRemaining: number) => void;
  'lobby:start':     (payload: { raceId: string }) => void;
  'lobby:error':     (message: string) => void;
  'race:standings':  (standings: StandingEntry[]) => void;
  'race:results':    (results: RaceResultEntry[]) => void;
}
