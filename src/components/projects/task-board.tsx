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
import { Trash2 } from "lucide-react";
import { moveProjectTaskAction, deleteProjectTaskAction } from "@/lib/actions/projects";

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

  function handleDelete(taskId: string) {
    if (!window.confirm("Delete this task?")) return;
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTransition(() => {
      deleteProjectTaskAction(taskId);
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={localTasks.filter((t) => t.status === col.id)}
            onDelete={handleDelete}
          />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} overlay />}</DragOverlay>
    </DndContext>
  );
}

function Column({
  id,
  label,
  tasks,
  onDelete,
}: {
  id: string;
  label: string;
  tasks: Task[];
  onDelete: (taskId: string) => void;
}) {
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
          <DraggableTask key={task.id} task={task} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function DraggableTask({ task, onDelete }: { task: Task; onDelete: (taskId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} onDelete={onDelete} />
    </div>
  );
}

function TaskCard({ task, overlay, onDelete }: { task: Task; overlay?: boolean; onDelete?: (taskId: string) => void }) {
  return (
    <div className={`group flex cursor-grab items-center justify-between gap-2 rounded-lg border border-border bg-bg p-2.5 text-sm text-fg active:cursor-grabbing ${overlay ? "rotate-2 shadow-2xl" : ""}`}>
      <span className="min-w-0 flex-1">{task.title}</span>
      {onDelete && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="shrink-0 text-fg-subtle opacity-0 hover:text-danger group-hover:opacity-100"
          title="Delete task"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
