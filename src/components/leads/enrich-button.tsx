"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { enrichLeadAction } from "@/lib/actions/lead-enrichment";
import { Button } from "@/components/ui/primitives";

export function EnrichButton({ leadId, hasBeenEnriched }: { leadId: string; hasBeenEnriched: boolean }) {
  const [running, setRunning] = useState(false);
  const router = useRouter();

  async function run() {
    setRunning(true);
    await enrichLeadAction(leadId);
    setRunning(false);
    router.refresh();
  }

  return (
    <Button type="button" size="sm" onClick={run} disabled={running}>
      {running ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
      {running ? "Analyzing…" : hasBeenEnriched ? "Re-enrich" : "Enrich lead"}
    </Button>
  );
}
