"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  QueueState,
  Participant,
} from "@/types";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(roomId: string) {
  const socketRef = useRef<TypedSocket | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);

  useEffect(() => {
    const socket: TypedSocket = io({
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("room:join", { roomId });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("queue:updated", (data: QueueState) => {
      setParticipants(data.participants);
    });

    socket.on("room:error", ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    socket.on("room:closed", () => {
      setRoomClosed(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const joinQueue = useCallback(
    (name: string) => {
      socketRef.current?.emit("queue:join", { roomId, name });
    },
    [roomId]
  );

  const leaveQueue = useCallback(
    (participantToken: string) => {
      socketRef.current?.emit("queue:leave", { roomId, participantToken });
    },
    [roomId]
  );

  const advance = useCallback(
    (ownerToken: string) => {
      socketRef.current?.emit("queue:advance", { roomId, ownerToken });
    },
    [roomId]
  );

  const remove = useCallback(
    (ownerToken: string, participantId: string) => {
      socketRef.current?.emit("queue:remove", {
        roomId,
        ownerToken,
        participantId,
      });
    },
    [roomId]
  );

  const reorder = useCallback(
    (ownerToken: string, orderedIds: string[]) => {
      socketRef.current?.emit("queue:reorder", {
        roomId,
        ownerToken,
        orderedIds,
      });
    },
    [roomId]
  );

  const closeRoom = useCallback(
    (ownerToken: string) => {
      socketRef.current?.emit("room:close", { roomId, ownerToken });
    },
    [roomId]
  );

  const onJoined = useCallback(
    (
      callback: (data: {
        participantToken: string;
        participantId: string;
      }) => void
    ) => {
      socketRef.current?.on("queue:joined", callback);
      return () => {
        socketRef.current?.off("queue:joined", callback);
      };
    },
    []
  );

  return {
    participants,
    connected,
    error,
    roomClosed,
    joinQueue,
    leaveQueue,
    advance,
    remove,
    reorder,
    closeRoom,
    onJoined,
  };
}
