"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Globe, ChevronUp, ChevronDown, Trash2, MessageSquareText } from "lucide-react";
import {
  updateCallListItemStatusAction,
  reorderCallListItemAction,
  removeCallListItemAction,
} from "@/lib/actions/call-lists";
import { Badge, Button, Textarea } from "@/components/ui/primitives";

export type CallListItemData = {
  id: string;
  status: string;
  outcomeNotes: string | null;
  calledAt: string | null;
  calledBy: { name: string | null; email: string } | null;
  lead: {
    id: string;
    businessName: string;
    phone: string | null;
    website: string | null;
    city: string | null;
    state: string | null;
    opportunityScore: number | null;
    labelsJson: string | null;
  };
};

const STATUS_OPTIONS: { value: string; label: string; tone: "success" | "warning" | "danger" | "brand" | "default" }[] = [
  { value: "called", label: "Called", tone: "brand" },
  { value: "no_answer", label: "No Answer", tone: "warning" },
  { value: "voicemail", label: "Voicemail", tone: "warning" },
  { value: "callback", label: "Callback", tone: "warning" },
  { value: "not_interested", label: "Not Interested", tone: "danger" },
  { value: "booked", label: "Booked", tone: "success" },
];

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "brand" | "default"> = {
  pending: "default",
  called: "brand",
  no_answer: "warning",
  voicemail: "warning",
  callback: "warning",
  not_interested: "danger",
  booked: "success",
};

export function CallListItemRow({
  item,
  index,
  total,
  canEdit,
  canManage,
}: {
  item: CallListItemData;
  index: number;
  total: number;
  canEdit: boolean;
  canManage: boolean;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const labels: string[] = item.lead.labelsJson ? JSON.parse(item.lead.labelsJson) : [];

  return (
    <div className={`p-4 ${item.status !== "pending" ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        {canEdit && (
          <div className="mt-0.5 flex flex-col text-fg-subtle">
            <form action={reorderCallListItemAction.bind(null, item.id, "up")}>
              <button type="submit" disabled={index === 0} className="hover:text-fg disabled:opacity-30">
                <ChevronUp size={14} />
              </button>
            </form>
            <form action={reorderCallListItemAction.bind(null, item.id, "down")}>
              <button type="submit" disabled={index === total - 1} className="hover:text-fg disabled:opacity-30">
                <ChevronDown size={14} />
              </button>
            </form>
          </div>
        )}

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg text-xs font-semibold text-fg-muted">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/dashboard/leads/${item.lead.id}`} className="font-medium text-fg hover:text-brand">
              {item.lead.businessName}
            </Link>
            <Badge tone={STATUS_TONE[item.status]}>{item.status.replace("_", " ")}</Badge>
            {item.lead.opportunityScore != null && (
              <span className="text-xs text-fg-subtle">Score {item.lead.opportunityScore}</span>
            )}
            {labels.slice(0, 2).map((l) => (
              <span key={l} className="rounded-full bg-bg px-1.5 py-0.5 text-[10px] text-fg-muted">
                {l}
              </span>
            ))}
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">
            {[item.lead.city, item.lead.state].filter(Boolean).join(", ") || "No location on file"}
            {item.calledAt && ` · ${item.status.replace("_", " ")} by ${item.calledBy?.name || item.calledBy?.email || "someone"}`}
          </p>
          {item.outcomeNotes && <p className="mt-1 rounded-lg bg-bg px-2.5 py-1.5 text-xs text-fg-muted">{item.outcomeNotes}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {item.lead.phone && (
            <a href={`tel:${item.lead.phone}`}>
              <Button type="button" size="sm" variant="accent">
                <Phone size={12} /> Call
              </Button>
            </a>
          )}
          {item.lead.website && (
            <a href={item.lead.website.startsWith("http") ? item.lead.website : `https://${item.lead.website}`} target="_blank" rel="noopener noreferrer">
              <Button type="button" size="sm" variant="ghost">
                <Globe size={12} />
              </Button>
            </a>
          )}
          {canEdit && (
            <button type="button" onClick={() => setShowNotes((v) => !v)} className="text-fg-subtle hover:text-fg">
              <MessageSquareText size={14} />
            </button>
          )}
          {canManage && (
            <form action={removeCallListItemAction.bind(null, item.id)}>
              <button type="submit" className="text-fg-subtle hover:text-danger">
                <Trash2 size={14} />
              </button>
            </form>
          )}
        </div>
      </div>

      {canEdit && showNotes && (
        <form action={updateCallListItemStatusAction.bind(null, item.id)} className="mt-3 space-y-2 pl-16">
          <Textarea name="outcomeNotes" defaultValue={item.outcomeNotes ?? ""} placeholder="What happened on the call?" rows={2} />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="submit"
                name="status"
                value={opt.value}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-fg-muted hover:border-brand hover:text-brand"
              >
                {opt.label}
              </button>
            ))}
            {item.status !== "pending" && (
              <button
                type="submit"
                name="status"
                value="pending"
                className="rounded-full border border-border px-2.5 py-1 text-xs text-fg-subtle hover:text-fg"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
