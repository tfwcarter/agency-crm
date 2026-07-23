import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PageHeader, Button } from "@/components/ui/primitives";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { formatCurrency } from "@/lib/utils";

export default async function PipelinePage() {
  const session = await requireSession();

  const stages = await db.pipelineStage.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { order: "asc" },
    include: {
      deals: {
        include: { client: { select: { businessName: true } }, owner: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const openValue = stages
    .flatMap((s) => s.deals)
    .filter((d) => d.status === "open")
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description={`${formatCurrency(openValue)} in open pipeline value`}
        action={
          <Link href="/dashboard/pipeline/new">
            <Button>
              <Plus size={15} /> New Deal
            </Button>
          </Link>
        }
      />
      <div className="pt-5">
        <KanbanBoard stages={stages} />
      </div>
    </div>
  );
}
