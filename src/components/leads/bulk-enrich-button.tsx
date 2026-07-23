"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { enrichLeadAction } from "@/lib/actions/lead-enrichment";
import { Button } from "@/components/ui/primitives";

const CONCURRENCY = 3;

export function BulkEnrichButton({ leadIds, label }: { leadIds: string[]; label?: string }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const router = useRouter();

  async function run() {
    if (leadIds.length === 0 || running) return;
    setRunning(true);
    setDone(0);
    setFailed(0);

    const queue = [...leadIds];
    let doneCount = 0;
    let failCount = 0;

    async function worker() {
      while (queue.length > 0) {
        const id = queue.shift();
        if (!id) return;
        const result = await enrichLeadAction(id);
        doneCount += 1;
        if (result.error) failCount += 1;
        setDone(doneCount);
        setFailed(failCount);
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, leadIds.length) }, worker));
    setRunning(false);
    router.refresh();
  }

  if (running) {
    const pct = Math.round((done / leadIds.length) * 100);
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
        <Loader2 size={14} className="animate-spin text-brand" />
        <div className="w-32">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="text-xs text-fg-muted">
          {done}/{leadIds.length}
          {failed > 0 && ` · ${failed} failed`}
        </span>
      </div>
    );
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={run} disabled={leadIds.length === 0}>
      <Sparkles size={13} /> {label ?? `Enrich ${leadIds.length} lead${leadIds.length === 1 ? "" : "s"}`}
    </Button>
  );
}
