import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PageHeader, Card, Badge, Button } from "@/components/ui/primitives";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteClientAction } from "@/lib/actions/clients";
import { formatCurrency, initials } from "@/lib/utils";

const STATUS_TONE = { active: "success", paused: "warning", churned: "danger" } as const;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;

  const clients = await db.client.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(q ? { businessName: { contains: q } } : {}),
    },
    include: { accountManager: true, _count: { select: { deals: true } } },
    orderBy: { createdAt: "desc" },
  });

  const activeCount = clients.filter((c) => c.status === "active").length;
  const mrr = clients.filter((c) => c.status === "active").reduce((sum, c) => sum + c.monthlySpend, 0);

  return (
    <div>
      <PageHeader
        title="Clients"
        description={`${clients.length} total · ${activeCount} active · ${formatCurrency(mrr)} MRR`}
        action={
          <Link href="/dashboard/clients/new">
            <Button>
              <Plus size={15} /> New Client
            </Button>
          </Link>
        }
      />

      <div className="px-6 py-5">
        <form className="mb-4">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search clients…"
            className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand transition-colors"
          />
        </form>

        {clients.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 size={28} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No clients yet</p>
            <p className="mt-1 text-sm text-fg-muted">Add your first client to start tracking their workspace.</p>
            <Link href="/dashboard/clients/new" className="mt-4">
              <Button>
                <Plus size={15} /> New Client
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-subtle">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Industry</th>
                  <th className="px-4 py-3 font-medium">Package</th>
                  <th className="px-4 py-3 font-medium">Monthly Spend</th>
                  <th className="px-4 py-3 font-medium">Account Manager</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/clients/${client.id}`} className="font-medium text-fg hover:text-brand">
                        {client.businessName}
                      </Link>
                      {client.website && <p className="text-xs text-fg-muted">{client.website}</p>}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{client.industry || "—"}</td>
                    <td className="px-4 py-3 text-fg-muted">{client.monthlyPackage || "—"}</td>
                    <td className="px-4 py-3 text-fg">{formatCurrency(client.monthlySpend)}</td>
                    <td className="px-4 py-3">
                      {client.accountManager ? (
                        <span className="flex items-center gap-1.5 text-fg-muted">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20 text-[9px] font-semibold text-brand">
                            {initials(client.accountManager.name || client.accountManager.email)}
                          </span>
                          {client.accountManager.name || client.accountManager.email}
                        </span>
                      ) : (
                        <span className="text-fg-subtle">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[client.status as keyof typeof STATUS_TONE] ?? "default"}>
                        {client.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ConfirmDeleteButton
                        action={deleteClientAction.bind(null, client.id)}
                        confirmMessage={`Delete "${client.businessName}"? This permanently deletes their projects, files, invoices, notes, and contacts. This can't be undone.`}
                        iconOnly
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
