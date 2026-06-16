import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInfo,
  LobbyRoom,
  LobbyStatus,
  StandingEntry,
  RaceResultEntry,
} from '../shared/types/multiplayer';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const COUNTDOWN_SECONDS = 3;

interface StandingState {
  entry: StandingEntry;
  timeTaken: number;
}

interface RoomState {
  roomId: string;
  players: Map<string, PlayerInfo>;
  status: LobbyStatus;
  countdownTimer: ReturnType<typeof setInterval> | null;
  raceId: string | null;
  standings: Map<string, StandingState>;
  finishedCount: number;
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
    raceId: null,
    standings: new Map(),
    finishedCount: 0,
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

function broadcastStandings(io: Server, room: RoomState) {
  const entries = Array.from(room.standings.values()).map((s) => s.entry);
  io.to(room.roomId).emit('race:standings', entries);
}

function recomputePositions(room: RoomState) {
  const active = Array.from(room.standings.entries())
    .filter(([, s]) => !s.entry.finished)
    .sort((a, b) => b[1].entry.score - a[1].entry.score);

  let rank = room.finishedCount + 1;
  for (const [, s] of active) {
    s.entry.position = rank++;
  }
}

export function attachSocketIO(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null;

    socket.on('lobby:join', ({ username }) => {
      if (!username || username.trim().length === 0) {
        socket.emit('lobby:error', 'Username cannot be empty');
        return;
      }

      let room = findAvailableRoom();
      if (!room) room = createRoom();

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

        room.countdownTimer = setInterval(async () => {
          remaining -= 1;
          if (remaining > 0) {
            io.to(room.roomId).emit('lobby:countdown', remaining);
          } else {
            clearInterval(room.countdownTimer!);
            room.countdownTimer = null;
            room.status = 'starting';

            // Initialize race on server
            room.raceId = room.roomId;
            room.finishedCount = 0;
            room.standings = new Map();

            for (const p of room.players.values()) {
              room.standings.set(p.socketId, {
                entry: {
                  username: p.username,
                  colorIndex: p.colorIndex,
                  score: 0,
                  position: 0,
                  finished: false,
                },
                timeTaken: 0,
              });
            }

            recomputePositions(room);

            // Persist race session to DB
            try {
              await storage.createRace(room.roomId, room.players.size);
            } catch (e) {
              console.warn('[ws] Could not persist race to DB:', e);
            }

            io.to(room.roomId).emit('lobby:start', { raceId: room.roomId });
            broadcastStandings(io, room);

            setTimeout(() => {
              rooms.delete(room.roomId);
            }, 10 * 60 * 1000); // clean up after 10 min
          }
        }, 1000);
      }
    });

    socket.on('lobby:unready', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.status === 'starting') return;

      const player = room.players.get(socket.id);
      if (!player || !player.isReady) return;

      if (room.status === 'countdown') {
        cancelCountdown(room); // resets all players to not-ready and clears the timer
      } else {
        player.isReady = false;
      }

      io.to(room.roomId).emit('lobby:state', serializeRoom(room));
    });

    socket.on('race:update', ({ score, timeTaken }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || !room.standings.has(socket.id)) return;

      const state = room.standings.get(socket.id)!;
      if (state.entry.finished) return;
      state.entry.score = score;
      state.timeTaken = timeTaken;

      recomputePositions(room);
      broadcastStandings(io, room);
    });

    socket.on('race:finish', async ({ score, timeTaken }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || !room.standings.has(socket.id)) return;

      const state = room.standings.get(socket.id)!;
      if (state.entry.finished) return;

      room.finishedCount++;
      state.entry.score = score;
      state.entry.timeTaken = timeTaken;
      state.entry.finished = true;
      state.entry.position = room.finishedCount;
      state.timeTaken = timeTaken;

      broadcastStandings(io, room);

      // Persist to DB
      if (room.raceId) {
        try {
          await storage.createRaceResult({
            raceId: room.raceId,
            username: state.entry.username,
            score,
            timeTaken,
            position: room.finishedCount,
          });
        } catch (e) {
          console.warn('[ws] Could not persist race result to DB:', e);
        }
      }

      // If all players finished, emit final results
      if (room.finishedCount >= room.players.size) {
        const results: RaceResultEntry[] = Array.from(room.standings.values())
          .map((s) => ({
            position: s.entry.position,
            username: s.entry.username,
            score: s.entry.score,
            timeTaken: s.timeTaken,
          }))
          .sort((a, b) => a.position - b.position);

        io.to(room.roomId).emit('race:results', results);
      }
    });

    socket.on('lobby:leave', () => { handleLeave(); });
    socket.on('disconnect', () => { handleLeave(); });

    function handleLeave() {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;

      room.players.delete(socket.id);
      room.standings.delete(socket.id);
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

      if (room.status === 'starting' && room.standings.size > 0) {
        recomputePositions(room);
        broadcastStandings(io, room);

        // If all remaining players have finished, emit results
        const allDone = Array.from(room.standings.values()).every((s) => s.entry.finished);
        if (allDone && room.standings.size > 0) {
          const results: RaceResultEntry[] = Array.from(room.standings.values())
            .map((s) => ({
              position: s.entry.position,
              username: s.entry.username,
              score: s.entry.score,
              timeTaken: s.timeTaken,
            }))
            .sort((a, b) => a.position - b.position);
          io.to(room.roomId).emit('race:results', results);
        }
      }
    }
  });
}
