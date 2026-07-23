import Link from "next/link";
import { FileDown } from "lucide-react";
import { db } from "@/lib/db";
import { requirePortalSession } from "@/lib/session";
import { PageHeader, Card, Badge } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";

const INVOICE_STATUS_TONE = { draft: "default", sent: "brand", viewed: "brand", paid: "success", overdue: "danger", void: "danger" } as const;

export default async function PortalHomePage() {
  const session = await requirePortalSession();

  const client = await db.client.findFirst({
    where: { id: session.user.id },
    include: {
      projects: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) return null;

  return (
    <div>
      <PageHeader title={`Welcome back, ${client.businessName}`} description="Your projects, invoices, and files" />

      <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Projects</h3>
          {client.projects.length === 0 ? (
            <p className="text-sm text-fg-subtle">No active projects yet.</p>
          ) : (
            <div className="space-y-2">
              {client.projects.map((p) => (
                <Link key={p.id} href={`/portal/projects/${p.id}`} className="block rounded-lg border border-border p-3 hover:border-brand/50">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-fg">{p.name}</span>
                    <Badge tone="brand">{p.progress}%</Badge>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${p.progress}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Invoices</h3>
          {client.invoices.length === 0 ? (
            <p className="text-sm text-fg-subtle">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {client.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-fg">{inv.number}</p>
                    <p className="text-xs text-fg-muted">{formatCurrency(inv.total)} {inv.dueDate && `· due ${formatDate(inv.dueDate)}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={INVOICE_STATUS_TONE[inv.status as keyof typeof INVOICE_STATUS_TONE] ?? "default"}>{inv.status}</Badge>
                    <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-fg-subtle hover:text-brand">
                      <FileDown size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Files</h3>
          {client.files.length === 0 ? (
            <p className="text-sm text-fg-subtle">No files shared yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {client.files.map((f) => (
                <a key={f.id} href={f.path} target="_blank" rel="noopener noreferrer" className="truncate rounded-lg border border-border px-3 py-2 text-sm text-brand hover:border-brand/50">
                  {f.name}
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
