"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { generateReportSummaryAction, type ReportSummaryState } from "@/lib/actions/reports";
import { Button } from "@/components/ui/primitives";

export function AiSummaryForm({ metrics }: { metrics: string }) {
  const [state, formAction, pending] = useActionState<ReportSummaryState, FormData>(generateReportSummaryAction, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="metrics" value={metrics} />
      {!state.output && (
        <Button type="submit" disabled={pending} size="sm">
          <Sparkles size={13} /> {pending ? "Generating…" : "Generate AI summary"}
        </Button>
      )}
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state.output && <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{state.output}</p>}
    </form>
  );
}
