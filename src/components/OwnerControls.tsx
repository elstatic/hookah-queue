"use client";

import type { Participant } from "@/types";

interface OwnerControlsProps {
  participants: Participant[];
  onAdvance: () => void;
}

export default function OwnerControls({
  participants,
  onAdvance,
}: OwnerControlsProps) {
  const hasActive = participants.some((p) => p.status === "active");
  const hasWaiting = participants.some((p) => p.status === "waiting");

  if (participants.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={onAdvance}
        disabled={!hasActive && !hasWaiting}
        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-black font-semibold text-lg transition-colors"
      >
        {hasActive ? "Следующий" : "Начать"}
      </button>
    </div>
  );
}
