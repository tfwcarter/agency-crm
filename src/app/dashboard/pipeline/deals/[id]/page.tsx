import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { addDealNoteAction } from "@/lib/actions/deals";
import { PageHeader, Card, Badge, Textarea, Button } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TONE = { open: "brand", won: "success", lost: "danger" } as const;

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const deal = await db.deal.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      stage: true,
      client: true,
      owner: true,
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!deal) notFound();

  return (
    <div>
      <PageHeader
        title={deal.title}
        description={deal.client?.businessName}
        action={<Badge tone={STATUS_TONE[deal.status as keyof typeof STATUS_TONE] ?? "default"}>{deal.status}</Badge>}
      />

      <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Details</h3>
          <dl className="space-y-2.5 text-sm">
            <Row label="Value">{formatCurrency(deal.value)}</Row>
            <Row label="Stage">{deal.stage.name}</Row>
            {deal.client && (
              <Row label="Client">
                <Link href={`/dashboard/clients/${deal.client.id}`} className="text-brand hover:text-brand-hover">
                  {deal.client.businessName}
                </Link>
              </Row>
            )}
            <Row label="Owner">{deal.owner?.name || deal.owner?.email || "Unassigned"}</Row>
            {deal.source && <Row label="Source">{deal.source}</Row>}
            {deal.expectedCloseDate && <Row label="Expected close">{formatDate(deal.expectedCloseDate)}</Row>}
            {deal.closedAt && <Row label="Closed">{formatDate(deal.closedAt)}</Row>}
            <Row label="Created">{formatDate(deal.createdAt)}</Row>
          </dl>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Notes</h3>
          <form action={addDealNoteAction.bind(null, deal.id)} className="mb-4 space-y-2">
            <Textarea name="body" placeholder="Add a note about this deal…" rows={2} required />
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                Add note
              </Button>
            </div>
          </form>
          <div className="space-y-3">
            {deal.notes.length === 0 && <p className="text-sm text-fg-subtle">No notes yet.</p>}
            {deal.notes.map((note) => (
              <div key={note.id} className="rounded-lg bg-bg px-3 py-2.5">
                <p className="text-sm text-fg">{note.body}</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {note.author?.name || note.author?.email || "Team"} · {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-fg-subtle">{label}</dt>
      <dd className="text-right text-fg">{children}</dd>
    </div>
  );
}
