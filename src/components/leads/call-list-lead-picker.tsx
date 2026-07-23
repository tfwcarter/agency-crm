"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/primitives";

export type PickableLead = {
  id: string;
  businessName: string;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  opportunityScore: number | null;
};

export function CallListLeadPicker({
  leads,
  preselected,
}: {
  leads: PickableLead[];
  preselected: PickableLead[];
}) {
  const [selected, setSelected] = useState<Map<string, PickableLead>>(() => {
    const map = new Map<string, PickableLead>();
    for (const lead of preselected) map.set(lead.id, lead);
    return map;
  });

  function toggle(lead: PickableLead) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(lead.id)) {
        next.delete(lead.id);
      } else {
        next.set(lead.id, lead);
      }
      return next;
    });
  }

  function remove(id: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  const visibleIds = leads.map((l) => l.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Map(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const lead of leads) next.set(lead.id, lead);
      }
      return next;
    });
  }

  return (
    <div>
      {Array.from(selected.values()).map((lead) => (
        <input key={lead.id} type="hidden" name="leadIds" value={lead.id} />
      ))}

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-fg-muted">
          {selected.size} lead{selected.size === 1 ? "" : "s"} selected
        </span>
        {leads.length > 0 && (
          <button type="button" onClick={toggleAllVisible} className="text-xs text-brand hover:text-brand-hover">
            {allVisibleSelected ? "Deselect visible" : "Select all visible"}
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Array.from(selected.values()).map((lead) => (
            <span key={lead.id} className="flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-xs text-brand">
              {lead.businessName}
              <button type="button" onClick={() => remove(lead.id)} className="hover:text-danger">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="scrollbar-thin max-h-80 overflow-y-auto rounded-lg border border-border">
        {leads.length === 0 ? (
          <p className="p-4 text-center text-sm text-fg-subtle">No leads match this search.</p>
        ) : (
          leads.map((lead) => (
            <label
              key={lead.id}
              className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 last:border-0 hover:bg-surface-hover"
            >
              <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead)} className="accent-brand" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{lead.businessName}</p>
                <p className="truncate text-xs text-fg-muted">
                  {[lead.city, lead.state].filter(Boolean).join(", ") || lead.website || lead.phone || "No details"}
                </p>
              </div>
              {lead.opportunityScore != null && (
                <Badge tone={lead.opportunityScore >= 75 ? "danger" : lead.opportunityScore >= 45 ? "warning" : "success"}>
                  {lead.opportunityScore}
                </Badge>
              )}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
