import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PageHeader, Card, Badge, Button } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TONE = { draft: "default", sent: "brand", viewed: "brand", paid: "success", overdue: "danger", void: "danger" } as const;
const TYPE_LABEL: Record<string, string> = { invoice: "Invoice", quote: "Quote", contract: "Contract" };

export default async function InvoicesPage() {
  const session = await requireSession();

  const invoices = await db.invoice.findMany({
    where: { organizationId: session.user.organizationId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  const outstanding = invoices.filter((i) => i.type === "invoice" && i.status !== "paid" && i.status !== "void").reduce((sum, i) => sum + i.total, 0);
  const paidThisMonth = invoices.filter((i) => i.status === "paid" && i.paidAt && i.paidAt.getMonth() === new Date().getMonth()).reduce((sum, i) => sum + i.total, 0);

  return (
    <div>
      <PageHeader
        title="Invoices & Billing"
        description={`${formatCurrency(outstanding)} outstanding · ${formatCurrency(paidThisMonth)} collected this month`}
        action={
          <Link href="/dashboard/invoices/new">
            <Button>
              <Plus size={15} /> New Invoice
            </Button>
          </Link>
        }
      />

      <div className="px-6 py-5">
        {invoices.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <Receipt size={28} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No invoices yet</p>
            <p className="mt-1 text-sm text-fg-muted">Create an invoice, quote, or contract for a client.</p>
            <Link href="/dashboard/invoices/new" className="mt-4">
              <Button>
                <Plus size={15} /> New Invoice
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-subtle">
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/invoices/${inv.id}`} className="font-medium text-fg hover:text-brand">
                        {inv.number}
                      </Link>
                      {inv.isRecurring && <p className="text-xs text-fg-muted">Recurring {inv.recurringInterval}</p>}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{inv.client.businessName}</td>
                    <td className="px-4 py-3 text-fg-muted">{TYPE_LABEL[inv.type] ?? inv.type}</td>
                    <td className="px-4 py-3 text-fg">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 text-fg-muted">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[inv.status as keyof typeof STATUS_TONE] ?? "default"}>{inv.status}</Badge>
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
