"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { RoomIdentity } from "@/types";

const STORAGE_KEY = "hookah_queue_identity";
const SWIPE_THRESHOLD = 60;

function getRoomIds(): string[] {
  try {
    const all: Record<string, RoomIdentity> = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );
    return Object.keys(all);
  } catch {
    return [];
  }
}

export function useSwipeRooms(currentRoomId: string) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [roomIds, setRoomIds] = useState<string[]>([]);

  useEffect(() => {
    setRoomIds(getRoomIds());
  }, [currentRoomId]);

  const currentIndex = roomIds.indexOf(currentRoomId);
  const totalRooms = roomIds.length;

  const navigateTo = useCallback(
    (direction: "prev" | "next") => {
      if (totalRooms < 2) return;
      const idx = direction === "next"
        ? (currentIndex + 1) % totalRooms
        : (currentIndex - 1 + totalRooms) % totalRooms;
      router.push(`/room/${roomIds[idx]}`);
    },
    [currentIndex, totalRooms, roomIds, router]
  );

  useEffect(() => {
    if (totalRooms < 2) return;

    function onTouchStart(e: TouchEvent) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    function onTouchEnd(e: TouchEvent) {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;

      // Ignore vertical swipes
      if (Math.abs(dy) > Math.abs(dx)) return;

      if (dx < -SWIPE_THRESHOLD) navigateTo("next");
      else if (dx > SWIPE_THRESHOLD) navigateTo("prev");
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [totalRooms, navigateTo]);

  return { currentIndex, totalRooms };
}
