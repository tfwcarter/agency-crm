"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { moveProjectTaskAction } from "@/lib/actions/projects";

type Task = { id: string; title: string; status: string };

const COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(localTasks.find((t) => t.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const taskId = active.id as string;
    const status = over.id as string;

    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    startTransition(() => {
      moveProjectTaskAction(taskId, status);
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <Column key={col.id} id={col.id} label={col.label} tasks={localTasks.filter((t) => t.status === col.id)} />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} overlay />}</DragOverlay>
    </DndContext>
  );
}

function Column({ id, label, tasks }: { id: string; label: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[120px] flex-col rounded-card border border-border bg-surface transition-colors ${isOver ? "border-brand bg-brand/5" : ""}`}
    >
      <div className="border-b border-border px-3 py-2 text-xs font-medium text-fg-muted">
        {label} <span className="text-fg-subtle">({tasks.length})</span>
      </div>
      <div className="flex-1 space-y-2 p-2">
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function DraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, overlay }: { task: Task; overlay?: boolean }) {
  return (
    <div className={`cursor-grab rounded-lg border border-border bg-bg p-2.5 text-sm text-fg active:cursor-grabbing ${overlay ? "rotate-2 shadow-2xl" : ""}`}>
      {task.title}
    </div>
  );
}
