import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { randomUUID } from 'crypto';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInfo,
  LobbyRoom,
  LobbyStatus,
} from '../shared/types/multiplayer';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const COUNTDOWN_SECONDS = 3;

interface RoomState {
  roomId: string;
  players: Map<string, PlayerInfo>;
  status: LobbyStatus;
  countdownTimer: ReturnType<typeof setInterval> | null;
}

const rooms = new Map<string, RoomState>();

function generateRoomId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function serializeRoom(room: RoomState): LobbyRoom {
  return {
    roomId: room.roomId,
    players: Array.from(room.players.values()),
    status: room.status,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  };
}

function findAvailableRoom(): RoomState | null {
  for (const room of rooms.values()) {
    if (room.status === 'waiting' && room.players.size < MAX_PLAYERS) {
      return room;
    }
  }
  return null;
}

function createRoom(): RoomState {
  const roomId = generateRoomId();
  const room: RoomState = {
    roomId,
    players: new Map(),
    status: 'waiting',
    countdownTimer: null,
  };
  rooms.set(roomId, room);
  return room;
}

function cancelCountdown(room: RoomState) {
  if (room.countdownTimer !== null) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
  }
  room.status = 'waiting';
  for (const player of room.players.values()) {
    player.isReady = false;
  }
}

export function attachSocketIO(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null;

    socket.on('lobby:join', ({ username }) => {
      if (!username || username.trim().length === 0) {
        socket.emit('lobby:error', 'Username cannot be empty');
        return;
      }

      let room = findAvailableRoom();
      if (!room) {
        room = createRoom();
      }

      const colorIndex = room.players.size;
      const player: PlayerInfo = {
        socketId: socket.id,
        username: username.trim(),
        colorIndex,
        isReady: false,
      };

      room.players.set(socket.id, player);
      currentRoomId = room.roomId;
      socket.join(room.roomId);

      io.to(room.roomId).emit('lobby:state', serializeRoom(room));
    });

    socket.on('lobby:ready', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player) return;

      player.isReady = true;

      const readyCount = Array.from(room.players.values()).filter((p) => p.isReady).length;
      const totalCount = room.players.size;

      io.to(room.roomId).emit('lobby:state', serializeRoom(room));

      if (readyCount >= MIN_PLAYERS && readyCount === totalCount && room.status === 'waiting') {
        room.status = 'countdown';
        let remaining = COUNTDOWN_SECONDS;

        io.to(room.roomId).emit('lobby:countdown', remaining);

        room.countdownTimer = setInterval(() => {
          remaining -= 1;
          if (remaining > 0) {
            io.to(room.roomId).emit('lobby:countdown', remaining);
          } else {
            clearInterval(room.countdownTimer!);
            room.countdownTimer = null;
            room.status = 'starting';
            io.to(room.roomId).emit('lobby:start');

            setTimeout(() => {
              rooms.delete(room.roomId);
            }, 30_000);
          }
        }, 1000);
      }
    });

    socket.on('lobby:leave', () => {
      handleLeave();
    });

    socket.on('disconnect', () => {
      handleLeave();
    });

    function handleLeave() {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;

      room.players.delete(socket.id);
      socket.leave(room.roomId);
      currentRoomId = null;

      if (room.players.size === 0) {
        if (room.countdownTimer !== null) clearInterval(room.countdownTimer);
        rooms.delete(room.roomId);
        return;
      }

      if (room.players.size < MIN_PLAYERS && room.status === 'countdown') {
        cancelCountdown(room);
      }

      io.to(room.roomId).emit('lobby:state', serializeRoom(room));
    }
  });
}
