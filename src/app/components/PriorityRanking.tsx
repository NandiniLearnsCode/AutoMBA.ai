import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Card } from "@/app/components/ui/card";

export type PriorityType = "recruiting" | "socials" | "sleep" | "clubs" | "homework";

export interface PriorityItem {
  id: PriorityType;
  label: string;
  icon: string;
}

const defaultPriorities: PriorityItem[] = [
  { id: "recruiting", label: "Recruiting", icon: "💼" },
  { id: "socials", label: "Socials", icon: "🎉" },
  { id: "sleep", label: "Sleep", icon: "😴" },
  { id: "clubs", label: "Clubs", icon: "👥" },
  { id: "homework", label: "Homework", icon: "📚" },
];

interface SortableItemProps {
  item: PriorityItem;
  rank: number;
}

function SortableItem({ item, rank }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="px-2 py-1.5 flex items-center gap-1.5 cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors shrink-0">
        <div
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="w-3 h-3" />
        </div>
        <span className="text-sm">{item.icon}</span>
        <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
        <div className="text-xs text-muted-foreground">#{rank}</div>
      </Card>
    </div>
  );
}

interface PriorityRankingProps {
  priorities: PriorityItem[];
  onPrioritiesChange: (priorities: PriorityItem[]) => void;
}

export function PriorityRanking({
  priorities,
  onPrioritiesChange,
}: PriorityRankingProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = priorities.findIndex((p) => p.id === active.id);
      const newIndex = priorities.findIndex((p) => p.id === over.id);

      const newPriorities = arrayMove(priorities, oldIndex, newIndex);
      onPrioritiesChange(newPriorities);
    }
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={priorities.map((p) => p.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {priorities.map((item, index) => (
              <SortableItem key={item.id} item={item} rank={index + 1} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export { defaultPriorities };
