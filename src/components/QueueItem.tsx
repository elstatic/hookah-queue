"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Participant } from "@/types";

interface QueueItemProps {
  participant: Participant;
  position: number;
  isOwner: boolean;
  isMe: boolean;
  onRemove?: (participantId: string) => void;
}

export default function QueueItem({
  participant,
  position,
  isOwner,
  isMe,
  onRemove,
}: QueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: participant.id, disabled: !isOwner });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isActive = participant.status === "active";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        isActive
          ? "bg-amber-500/20 border border-amber-500/40"
          : isMe
          ? "bg-white/10 border border-white/20"
          : "bg-white/5 border border-white/10"
      }`}
    >
      {isOwner && (
        <button
          {...attributes}
          {...listeners}
          className="touch-none text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing"
          aria-label="Перетащить"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
      )}

      <span
        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${
          isActive
            ? "bg-amber-500 text-black"
            : "bg-white/10 text-white/60"
        }`}
      >
        {position}
      </span>

      <span
        className={`flex-1 text-lg truncate ${
          isActive ? "text-amber-400 font-semibold" : "text-white"
        }`}
      >
        {participant.name}
        {isMe && (
          <span className="text-xs text-white/40 ml-2">(вы)</span>
        )}
      </span>

      {isActive && (
        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/30 text-amber-300 shrink-0">
          Курит
        </span>
      )}

      {isOwner && onRemove && (
        <button
          onClick={() => onRemove(participant.id)}
          className="text-white/30 hover:text-red-400 transition-colors shrink-0"
          aria-label="Удалить"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
