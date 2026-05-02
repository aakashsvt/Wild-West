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

export interface ClientToServerEvents {
  'lobby:join':  (payload: { username: string }) => void;
  'lobby:ready': () => void;
  'lobby:leave': () => void;
}

export interface ServerToClientEvents {
  'lobby:state':     (room: LobbyRoom) => void;
  'lobby:countdown': (secondsRemaining: number) => void;
  'lobby:start':     () => void;
  'lobby:error':     (message: string) => void;
}
