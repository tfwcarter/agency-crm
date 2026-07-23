"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { generateInsightsAction, type InsightsState } from "@/lib/actions/insights";
import { Card, Button } from "@/components/ui/primitives";

export function AiInsightsCard() {
  const [state, formAction, pending] = useActionState<InsightsState, FormData>(generateInsightsAction, {});

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Sparkles size={13} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-fg">AI Coach</h3>
            <p className="text-xs text-fg-subtle">Watching your pipeline, invoices, and clients</p>
          </div>
        </div>
        <form action={formAction}>
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending ? "Analyzing…" : state.output ? "Refresh" : "Generate"}
          </Button>
        </form>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.output ? (
        <ul className="space-y-2">
          {state.output
            .split("\n")
            .filter((l) => l.trim())
            .map((line, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-bg px-3 py-2 text-sm text-fg">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {line.trim()}
              </li>
            ))}
        </ul>
      ) : (
        !state.error && (
          <p className="text-sm text-fg-subtle">
            e.g. &ldquo;3 leads haven&apos;t been contacted in a week&rdquo; or &ldquo;This client hasn&apos;t been invoiced&rdquo; — generate recommendations from your live data.
          </p>
        )
      )}
    </Card>
  );
}
