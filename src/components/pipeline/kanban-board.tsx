"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { moveDealStageAction } from "@/lib/actions/deals";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

type Deal = {
  id: string;
  title: string;
  value: number;
  status: string;
  stageId: string;
  client: { businessName: string } | null;
  owner: { name: string | null; email: string } | null;
};

type Stage = {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
};

export function KanbanBoard({ stages }: { stages: Stage[] }) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [localStages, setLocalStages] = useState(stages);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(event: DragStartEvent) {
    const deal = localStages.flatMap((s) => s.deals).find((d) => d.id === event.active.id);
    setActiveDeal(deal ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;

    const dealId = active.id as string;
    const targetStageId = over.id as string;

    const sourceStage = localStages.find((s) => s.deals.some((d) => d.id === dealId));
    if (!sourceStage || sourceStage.id === targetStageId) return;

    const deal = sourceStage.deals.find((d) => d.id === dealId)!;

    setLocalStages((prev) =>
      prev.map((s) => {
        if (s.id === sourceStage.id) return { ...s, deals: s.deals.filter((d) => d.id !== dealId) };
        if (s.id === targetStageId) return { ...s, deals: [{ ...deal, stageId: targetStageId }, ...s.deals] };
        return s;
      })
    );

    startTransition(() => {
      moveDealStageAction(dealId, targetStageId);
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="scrollbar-thin flex gap-4 overflow-x-auto px-6 pb-6">
        {localStages.map((stage) => (
          <Column key={stage.id} stage={stage} />
        ))}
      </div>
      <DragOverlay>{activeDeal && <DealCard deal={activeDeal} overlay />}</DragOverlay>
    </DndContext>
  );
}

function Column({ stage }: { stage: Stage }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = stage.deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-card border border-border bg-surface transition-colors ${
        isOver ? "border-brand bg-brand/5" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-medium text-fg">{stage.name}</span>
          <span className="text-xs text-fg-subtle">{stage.deals.length}</span>
        </div>
        {total > 0 && <span className="text-xs text-fg-muted">{formatCurrency(total)}</span>}
      </div>
      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 80 }}>
        {stage.deals.map((deal) => (
          <DraggableDeal key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}

function DraggableDeal({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <DealCard deal={deal} />
    </div>
  );
}

function DealCard({ deal, overlay }: { deal: Deal; overlay?: boolean }) {
  return (
    <Link
      href={`/dashboard/pipeline/deals/${deal.id}`}
      className={`block cursor-grab rounded-lg border border-border bg-bg p-3 active:cursor-grabbing ${
        overlay ? "rotate-2 shadow-2xl" : "hover:border-brand/50"
      }`}
      onClick={(e) => overlay && e.preventDefault()}
    >
      <p className="text-sm font-medium text-fg">{deal.title}</p>
      {deal.client && <p className="mt-0.5 text-xs text-fg-muted">{deal.client.businessName}</p>}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-medium text-brand">{formatCurrency(deal.value)}</span>
        {deal.status !== "open" && (
          <Badge tone={deal.status === "won" ? "success" : "danger"} className="text-[9px]">
            {deal.status}
          </Badge>
        )}
      </div>
    </Link>
  );
}
