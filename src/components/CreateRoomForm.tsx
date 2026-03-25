"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "hookah_queue_identity";

export default function CreateRoomForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save owner token
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      all[data.roomId] = { ownerToken: data.ownerToken };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

      router.push(`/room/${data.roomId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка создания комнаты");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название комнаты"
        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-lg focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        maxLength={50}
        autoFocus
      />
      <button
        type="submit"
        disabled={!name.trim() || loading}
        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-black font-semibold text-lg transition-colors"
      >
        {loading ? "Создаю..." : "Создать комнату"}
      </button>
    </form>
  );
}
