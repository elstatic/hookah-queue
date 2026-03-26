import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, Participant } from "@/types";
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
import { sendQueuePushNotifications } from "./push";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function broadcastQueue(io: IOServer, roomId: string, prevQueue?: Participant[]) {
  const participants = getQueue(roomId);
  io.to(roomId).emit("queue:updated", { participants });
  sendQueuePushNotifications(roomId, participants, prevQueue);
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

      const prevQueue = getQueue(roomId);
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

      broadcastQueue(io, roomId, prevQueue);
    });

    socket.on("queue:leave", ({ roomId, participantToken }) => {
      const prevQueue = getQueue(roomId);
      leaveQueue(roomId, participantToken);
      broadcastQueue(io, roomId, prevQueue);
      checkAndCleanEmpty(io, roomId);
    });

    socket.on("queue:advance", ({ roomId, ownerToken }) => {
      if (!verifyOwner(roomId, ownerToken)) {
        socket.emit("room:error", {
          message: "Нет прав для управления очередью",
        });
        return;
      }
      const prevQueue = getQueue(roomId);
      advanceQueue(roomId);
      broadcastQueue(io, roomId, prevQueue);
    });

    socket.on("queue:remove", ({ roomId, ownerToken, participantId }) => {
      if (!verifyOwner(roomId, ownerToken)) {
        socket.emit("room:error", {
          message: "Нет прав для управления очередью",
        });
        return;
      }
      const prevQueue = getQueue(roomId);
      removeParticipant(roomId, participantId);
      broadcastQueue(io, roomId, prevQueue);
      checkAndCleanEmpty(io, roomId);
    });

    socket.on("queue:reorder", ({ roomId, ownerToken, orderedIds }) => {
      if (!verifyOwner(roomId, ownerToken)) {
        socket.emit("room:error", {
          message: "Нет прав для управления очередью",
        });
        return;
      }
      const prevQueue = getQueue(roomId);
      reorderQueue(roomId, orderedIds);
      broadcastQueue(io, roomId, prevQueue);
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
