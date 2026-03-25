"use client";

import { useCallback } from "react";
import type { RoomIdentity } from "@/types";

const STORAGE_KEY = "hookah_queue_identity";

function getAllIdentities(): Record<string, RoomIdentity> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAllIdentities(data: Record<string, RoomIdentity>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useIdentity(roomId: string) {
  const getIdentity = useCallback((): RoomIdentity => {
    return getAllIdentities()[roomId] || {};
  }, [roomId]);

  const setOwnerToken = useCallback(
    (ownerToken: string) => {
      const all = getAllIdentities();
      all[roomId] = { ...all[roomId], ownerToken };
      saveAllIdentities(all);
    },
    [roomId]
  );

  const setParticipant = useCallback(
    (participantToken: string, participantId: string, name: string) => {
      const all = getAllIdentities();
      all[roomId] = { ...all[roomId], participantToken, participantId, name };
      saveAllIdentities(all);
    },
    [roomId]
  );

  const clearIdentity = useCallback(() => {
    const all = getAllIdentities();
    delete all[roomId];
    saveAllIdentities(all);
  }, [roomId]);

  return { getIdentity, setOwnerToken, setParticipant, clearIdentity };
}
