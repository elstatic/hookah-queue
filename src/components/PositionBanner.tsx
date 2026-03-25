"use client";

import type { Participant } from "@/types";

interface PositionBannerProps {
  participants: Participant[];
  myParticipantId?: string;
}

export default function PositionBanner({
  participants,
  myParticipantId,
}: PositionBannerProps) {
  if (!myParticipantId) return null;

  const myIndex = participants.findIndex((p) => p.id === myParticipantId);
  if (myIndex === -1) return null;

  const me = participants[myIndex];
  const isActive = me.status === "active";

  if (isActive) {
    return (
      <div className="py-4 px-6 rounded-xl bg-amber-500/20 border border-amber-500/40 text-center">
        <p className="text-2xl font-bold text-amber-400">
          Ваша очередь!
        </p>
        <p className="text-sm text-amber-300/60 mt-1">Приятного курения</p>
      </div>
    );
  }

  const position = myIndex + 1;
  const waitingBefore = participants
    .slice(0, myIndex)
    .filter((p) => p.status !== "done").length;

  return (
    <div className="py-3 px-6 rounded-xl bg-white/5 border border-white/10 text-center">
      <p className="text-lg text-white/80">
        Вы <span className="font-bold text-white text-xl">#{position}</span> в
        очереди
      </p>
      {waitingBefore > 0 && (
        <p className="text-sm text-white/40 mt-0.5">
          Перед вами: {waitingBefore}
        </p>
      )}
    </div>
  );
}
