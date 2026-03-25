import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types";
import {
  getRoom,
  getQueue,
  verifyOwner,
  addParticipant,
  removeParticipant,
  leaveQueue,
  advanceQueue,
  reorderQueue,
  isQueueEmpty,
  deleteRoom,
} from "./db";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function broadcastQueue(io: IOServer, roomId: string) {
  const participants = getQueue(roomId);
  io.to(roomId).emit("queue:updated", { participants });
}

function checkAndCleanEmpty(io: IOServer, roomId: string) {
  if (isQueueEmpty(roomId)) {
    deleteRoom(roomId);
    io.to(roomId).emit("room:closed");
  }
}

export function setupSocketHandlers(io: IOServer) {
  io.on("connection", (socket: IOSocket) => {
    socket.on("room:join", ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit("room:error", { message: "Комната не найдена" });
        return;
      }
      socket.join(roomId);
      const participants = getQueue(roomId);
      socket.emit("queue:updated", { participants });
    });

    socket.on("queue:join", ({ roomId, name }) => {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit("room:error", { message: "Комната не найдена" });
        return;
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        socket.emit("room:error", { message: "Введите имя" });
        return;
      }

      const participant = addParticipant(roomId, trimmedName);

      // If this is the first participant, make them active
      const queue = getQueue(roomId);
      if (queue.length === 1) {
        advanceQueue(roomId);
      }

      socket.emit("queue:joined", {
        participantToken: participant.user_token,
        participantId: participant.id,
      });

      broadcastQueue(io, roomId);
    });

    socket.on("queue:leave", ({ roomId, participantToken }) => {
      leaveQueue(roomId, participantToken);
      broadcastQueue(io, roomId);
      checkAndCleanEmpty(io, roomId);
    });

    socket.on("queue:advance", ({ roomId, ownerToken }) => {
      if (!verifyOwner(roomId, ownerToken)) {
        socket.emit("room:error", {
          message: "Нет прав для управления очередью",
        });
        return;
      }
      advanceQueue(roomId);
      broadcastQueue(io, roomId);
    });

    socket.on("queue:remove", ({ roomId, ownerToken, participantId }) => {
      if (!verifyOwner(roomId, ownerToken)) {
        socket.emit("room:error", {
          message: "Нет прав для управления очередью",
        });
        return;
      }
      removeParticipant(roomId, participantId);
      broadcastQueue(io, roomId);
      checkAndCleanEmpty(io, roomId);
    });

    socket.on("queue:reorder", ({ roomId, ownerToken, orderedIds }) => {
      if (!verifyOwner(roomId, ownerToken)) {
        socket.emit("room:error", {
          message: "Нет прав для управления очередью",
        });
        return;
      }
      reorderQueue(roomId, orderedIds);
      broadcastQueue(io, roomId);
    });

    socket.on("room:close", ({ roomId, ownerToken }) => {
      if (!verifyOwner(roomId, ownerToken)) {
        socket.emit("room:error", {
          message: "Нет прав для закрытия комнаты",
        });
        return;
      }
      deleteRoom(roomId);
      io.to(roomId).emit("room:closed");
    });
  });
}
