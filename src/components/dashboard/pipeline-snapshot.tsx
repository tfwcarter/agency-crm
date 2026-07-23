import Link from "next/link";
import { Card } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";

type Stage = { id: string; name: string; color: string; deals: { value: number }[] };

export function PipelineSnapshot({ stages, totalDeals }: { stages: Stage[]; totalDeals: number }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Pipeline Snapshot</h3>
        <Link href="/dashboard/pipeline" className="text-xs text-brand hover:text-brand-hover">
          View full pipeline →
        </Link>
      </div>
      <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-1">
        {stages.map((stage) => {
          const value = stage.deals.reduce((s, d) => s + d.value, 0);
          const conversion = totalDeals > 0 ? (stage.deals.length / totalDeals) * 100 : 0;
          return (
            <Link
              key={stage.id}
              href="/dashboard/pipeline"
              className="min-w-[140px] flex-1 rounded-[var(--radius-control)] border border-border bg-bg p-3 transition-colors hover:border-border-strong"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="truncate text-xs font-medium text-fg">{stage.name}</span>
              </div>
              <p className="text-lg font-semibold text-fg">{stage.deals.length}</p>
              <p className="text-xs text-fg-muted">{formatCurrency(value)}</p>
              <p className="mt-1 text-[10px] text-fg-subtle">{conversion.toFixed(0)}% of pipeline</p>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
