"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { RoomIdentity } from "@/types";

const STORAGE_KEY = "hookah_queue_identity";

interface RoomInfo {
  roomId: string;
  identity: RoomIdentity;
  name: string | null;
  exists: boolean;
}

export default function MyRooms() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRooms() {
      let all: Record<string, RoomIdentity> = {};
      try {
        all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      } catch {
        setLoading(false);
        return;
      }

      const roomIds = Object.keys(all);
      if (roomIds.length === 0) {
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        roomIds.map(async (roomId) => {
          try {
            const res = await fetch(`/api/rooms?id=${roomId}`);
            if (!res.ok) return { roomId, identity: all[roomId], name: null, exists: false };
            const data = await res.json();
            return { roomId, identity: all[roomId], name: data.name, exists: true };
          } catch {
            return { roomId, identity: all[roomId], name: null, exists: false };
          }
        })
      );

      // Clean up dead rooms from localStorage
      const dead = results.filter((r) => !r.exists);
      if (dead.length > 0) {
        const cleaned = { ...all };
        dead.forEach((r) => delete cleaned[r.roomId]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }

      setRooms(results.filter((r) => r.exists));
      setLoading(false);
    }

    loadRooms();
  }, []);

  if (loading || rooms.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      <h2 className="text-sm text-white/40 text-center">Мои комнаты</h2>
      <div className="space-y-2">
        {rooms.map((room) => (
          <Link
            key={room.roomId}
            href={`/room/${room.roomId}`}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <span className="text-white truncate">{room.name}</span>
            {room.identity.ownerToken ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 shrink-0 ml-2">
                Владелец
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40 shrink-0 ml-2">
                Участник
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
