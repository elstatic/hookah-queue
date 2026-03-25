"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useIdentity } from "@/hooks/useIdentity";
import JoinForm from "@/components/JoinForm";
import QueueList from "@/components/QueueList";
import SharePanel from "@/components/SharePanel";
import OwnerControls from "@/components/OwnerControls";
import PositionBanner from "@/components/PositionBanner";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { getIdentity, setParticipant, clearIdentity } = useIdentity(roomId);
  const {
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
  } = useSocket(roomId);

  const [roomName, setRoomName] = useState<string>("");
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [identity, setIdentityState] = useState(() => getIdentity());

  // Fetch room info
  useEffect(() => {
    fetch(`/api/rooms?id=${roomId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => setRoomName(data.name))
      .catch(() => setRoomNotFound(true));
  }, [roomId]);

  // Listen for join confirmation
  useEffect(() => {
    return onJoined(({ participantToken, participantId }) => {
      const current = getIdentity();
      if (!current.participantToken) {
        setParticipant(participantToken, participantId, "");
        setIdentityState(getIdentity());
      }
    });
  }, [onJoined, getIdentity, setParticipant]);

  // Refresh identity when participants change
  useEffect(() => {
    setIdentityState(getIdentity());
  }, [participants, getIdentity]);

  // Clean up identity when room is closed
  useEffect(() => {
    if (roomClosed) {
      clearIdentity();
    }
  }, [roomClosed, clearIdentity]);

  const isOwner = !!identity.ownerToken;
  const isInQueue = !!identity.participantToken;
  const myParticipantId = identity.participantId;

  const stillInQueue =
    isInQueue && participants.some((p) => p.id === myParticipantId);

  const handleJoin = useCallback(
    (name: string) => {
      joinQueue(name);
    },
    [joinQueue]
  );

  const handleLeave = useCallback(() => {
    if (identity.participantToken) {
      leaveQueue(identity.participantToken);
    }
  }, [identity.participantToken, leaveQueue]);

  const handleAdvance = useCallback(() => {
    if (identity.ownerToken) {
      advance(identity.ownerToken);
    }
  }, [identity.ownerToken, advance]);

  const handleRemove = useCallback(
    (participantId: string) => {
      if (identity.ownerToken) {
        remove(identity.ownerToken, participantId);
      }
    },
    [identity.ownerToken, remove]
  );

  const handleReorder = useCallback(
    (orderedIds: string[]) => {
      if (identity.ownerToken) {
        reorder(identity.ownerToken, orderedIds);
      }
    },
    [identity.ownerToken, reorder]
  );

  const handleCloseRoom = useCallback(() => {
    if (identity.ownerToken && confirm("Завершить сессию? Комната будет удалена.")) {
      closeRoom(identity.ownerToken);
    }
  }, [identity.ownerToken, closeRoom]);

  if (roomNotFound || roomClosed) {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh p-6">
        <div className="text-center space-y-4">
          <p className="text-xl text-white/60">
            {roomClosed ? "Сессия завершена" : "Комната не найдена"}
          </p>
          <p className="text-white/40">
            {roomClosed
              ? "Владелец закрыл комнату"
              : "Возможно, она уже истекла"}
          </p>
          <a
            href="/"
            className="inline-block py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors"
          >
            Создать новую
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="px-4 py-3 border-b border-white/10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white truncate">
              {roomName || "..."}
            </h1>
            <p className="text-xs text-white/40">
              {connected ? (
                `${participants.length} в очереди`
              ) : (
                <span className="text-amber-400">Подключение...</span>
              )}
            </p>
          </div>
          {isOwner && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
              Владелец
            </span>
          )}
        </div>
      </header>

      {/* Error toast */}
      {error && (
        <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/30 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Share panel */}
          <SharePanel roomId={roomId} />

          {/* Position banner */}
          {stillInQueue && (
            <PositionBanner
              participants={participants}
              myParticipantId={myParticipantId}
            />
          )}

          {/* Queue */}
          <QueueList
            participants={participants}
            isOwner={isOwner}
            myParticipantId={myParticipantId}
            onRemove={isOwner ? handleRemove : undefined}
            onReorder={isOwner ? handleReorder : undefined}
          />

          {/* Owner controls */}
          {isOwner && (
            <OwnerControls
              participants={participants}
              onAdvance={handleAdvance}
            />
          )}

          {/* Join form */}
          {!stillInQueue && (
            <div className="pt-2">
              <JoinForm onJoin={handleJoin} />
            </div>
          )}

          {/* Leave button */}
          {stillInQueue && (
            <button
              onClick={handleLeave}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/70 text-sm transition-colors"
            >
              Покинуть очередь
            </button>
          )}

          {/* Close room (owner) */}
          {isOwner && (
            <button
              onClick={handleCloseRoom}
              className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400/70 hover:text-red-400 text-sm transition-colors"
            >
              Завершить сессию
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
