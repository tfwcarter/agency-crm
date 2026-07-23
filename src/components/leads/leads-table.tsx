"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Download, X, Star, Phone, Trash2, Ban } from "lucide-react";
import { enrichLeadAction } from "@/lib/actions/lead-enrichment";
import { exportLeadsCsvAction } from "@/lib/actions/lead-export";
import { toggleFavoriteLeadAction } from "@/lib/actions/lead-enrichment";
import { deleteLeadsAction, bulkUpdateLeadStatusAction } from "@/lib/actions/leads";
import { Table, Thead, Th, Tr, Td, Badge, Button } from "@/components/ui/primitives";

export type LeadRow = {
  id: string;
  businessName: string;
  website: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  opportunityScore: number | null;
  status: string;
  labelsJson: string | null;
  favorited: boolean;
  updatedAt: string;
  owner: { name: string | null; email: string } | null;
};

const STATUS_TONE: Record<string, "brand" | "warning" | "success" | "danger" | "default"> = {
  new: "brand",
  contacted: "warning",
  qualified: "success",
  converted: "success",
  dead: "danger",
};

function scoreTone(score: number | null) {
  if (score === null) return "text-fg-subtle";
  if (score >= 75) return "text-danger";
  if (score >= 45) return "text-warning";
  return "text-success";
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function LeadsTable({ leads, isAdmin = false }: { leads: LeadRow[]; isAdmin?: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const router = useRouter();

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function enrichSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBusy(true);
    setProgress({ done: 0, total: ids.length });

    const queue = [...ids];
    let done = 0;
    async function worker() {
      while (queue.length > 0) {
        const id = queue.shift();
        if (!id) return;
        await enrichLeadAction(id);
        done += 1;
        setProgress({ done, total: ids.length });
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, ids.length) }, worker));
    setBusy(false);
    setProgress(null);
    setSelected(new Set());
    router.refresh();
  }

  async function exportSelected() {
    const ids = selected.size > 0 ? Array.from(selected) : leads.map((l) => l.id);
    const { csv, filename } = await exportLeadsCsvAction(ids);
    downloadCsv(csv, filename);
  }

  async function toggleFavorite(id: string, current: boolean) {
    await toggleFavoriteLeadAction(id, !current);
    router.refresh();
  }

  function addToCallList() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    router.push(`/dashboard/call-lists/new?preselect=${ids.join(",")}`);
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const confirmed = window.confirm(`Delete ${ids.length} selected lead${ids.length === 1 ? "" : "s"}? This can't be undone.`);
    if (!confirmed) return;
    setBusy(true);
    await deleteLeadsAction(ids);
    setBusy(false);
    setSelected(new Set());
    router.refresh();
  }

  async function markSelectedDead() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBusy(true);
    await bulkUpdateLeadStatusAction(ids, "dead");
    setBusy(false);
    setSelected(new Set());
    router.refresh();
  }

  async function deleteOne(id: string, name: string) {
    const confirmed = window.confirm(`Delete "${name}"? This can't be undone.`);
    if (!confirmed) return;
    await deleteLeadsAction([id]);
    router.refresh();
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-brand/30 bg-brand/10 px-4 py-2.5">
          <span className="text-sm font-medium text-fg">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            {progress ? (
              <span className="text-xs text-fg-muted">
                Enriching {progress.done}/{progress.total}…
              </span>
            ) : (
              <>
                <Button type="button" size="sm" variant="secondary" onClick={enrichSelected} disabled={busy}>
                  Enrich selected
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={exportSelected}>
                  <Download size={13} /> Export CSV
                </Button>
                {isAdmin && (
                  <Button type="button" size="sm" variant="secondary" onClick={addToCallList}>
                    <Phone size={13} /> Add to Call List
                  </Button>
                )}
                <Button type="button" size="sm" variant="secondary" onClick={markSelectedDead} disabled={busy}>
                  <Ban size={13} /> Mark dead
                </Button>
                <Button type="button" size="sm" variant="danger" onClick={deleteSelected} disabled={busy}>
                  <Trash2 size={13} /> Delete selected
                </Button>
              </>
            )}
            <button type="button" onClick={() => setSelected(new Set())} className="text-fg-subtle hover:text-fg">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {selected.size === 0 && leads.length > 0 && (
        <div className="mb-3 flex justify-end">
          <Button type="button" size="sm" variant="ghost" onClick={exportSelected}>
            <Download size={13} /> Export all ({leads.length})
          </Button>
        </div>
      )}

      <Table>
        <Thead>
          <tr>
            <Th className="w-8">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-brand" />
            </Th>
            <Th>Business</Th>
            <Th>Score</Th>
            <Th>Labels</Th>
            <Th>Location</Th>
            <Th>Industry</Th>
            <Th>Assigned</Th>
            <Th>Status</Th>
            <Th />
            <Th />
          </tr>
        </Thead>
        <tbody>
          {leads.map((lead) => {
            const labels: string[] = lead.labelsJson ? JSON.parse(lead.labelsJson) : [];
            return (
              <Tr key={lead.id}>
                <Td>
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} className="accent-brand" />
                </Td>
                <Td>
                  <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-fg hover:text-brand">
                    {lead.businessName}
                  </Link>
                  {lead.website ? (
                    <p className="flex items-center gap-1 text-xs text-fg-muted">
                      <Globe size={10} /> {lead.website.replace(/^https?:\/\//, "")}
                    </p>
                  ) : (
                    <p className="text-xs text-fg-subtle">No website</p>
                  )}
                </Td>
                <Td>
                  <span className={`text-base font-semibold ${scoreTone(lead.opportunityScore)}`}>
                    {lead.opportunityScore ?? "—"}
                  </span>
                </Td>
                <Td>
                  <div className="flex max-w-[220px] flex-wrap gap-1">
                    {labels.slice(0, 2).map((l) => (
                      <span key={l} className="whitespace-nowrap rounded-full bg-bg px-1.5 py-0.5 text-[10px] text-fg-muted">
                        {l}
                      </span>
                    ))}
                    {labels.length > 2 && <span className="text-[10px] text-fg-subtle">+{labels.length - 2}</span>}
                  </div>
                </Td>
                <Td className="text-fg-muted">{[lead.city, lead.state].filter(Boolean).join(", ") || "—"}</Td>
                <Td className="text-fg-muted">{lead.industry ?? "—"}</Td>
                <Td className="text-fg-muted">{lead.owner?.name || lead.owner?.email || "Unassigned"}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[lead.status] ?? "default"}>{lead.status}</Badge>
                </Td>
                <Td>
                  <button type="button" onClick={() => toggleFavorite(lead.id, lead.favorited)} className="text-fg-subtle hover:text-warning">
                    <Star size={14} fill={lead.favorited ? "currentColor" : "none"} className={lead.favorited ? "text-warning" : ""} />
                  </button>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => deleteOne(lead.id, lead.businessName)}
                    className="text-fg-subtle hover:text-danger"
                    title="Delete lead"
                  >
                    <Trash2 size={14} />
                  </button>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
