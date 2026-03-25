"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Participant } from "@/types";
import QueueItem from "./QueueItem";

interface QueueListProps {
  participants: Participant[];
  isOwner: boolean;
  myParticipantId?: string;
  onRemove?: (participantId: string) => void;
  onReorder?: (orderedIds: string[]) => void;
}

export default function QueueList({
  participants,
  isOwner,
  myParticipantId,
  onRemove,
  onReorder,
}: QueueListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;

    const oldIndex = participants.findIndex((p) => p.id === active.id);
    const newIndex = participants.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...participants];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorder(reordered.map((p) => p.id));
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-12 text-white/40">
        <p className="text-lg">Очередь пуста</p>
        <p className="text-sm mt-1">Пока никто не записался</p>
      </div>
    );
  }

  const list = participants.map((p, i) => (
    <QueueItem
      key={p.id}
      participant={p}
      position={i + 1}
      isOwner={isOwner}
      isMe={p.id === myParticipantId}
      onRemove={onRemove}
    />
  ));

  if (isOwner) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={participants.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">{list}</div>
        </SortableContext>
      </DndContext>
    );
  }

  return <div className="space-y-2">{list}</div>;
}
