"use client";

import { useState } from "react";

interface JoinFormProps {
  onJoin: (name: string) => void;
}

export default function JoinForm({ onJoin }: JoinFormProps) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin(name.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ваше имя"
        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-lg focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
        maxLength={30}
        autoFocus
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold text-lg transition-colors"
      >
        Встать в очередь
      </button>
    </form>
  );
}
