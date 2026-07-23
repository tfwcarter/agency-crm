import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { updateInvoiceStatusAction, signInvoiceAction } from "@/lib/actions/invoices";
import { PageHeader, Card, Badge, Button, Input } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TONE = { draft: "default", sent: "brand", viewed: "brand", paid: "success", overdue: "danger", void: "danger" } as const;

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const invoice = await db.invoice.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: { client: true, lineItems: { orderBy: { order: "asc" } } },
  });
  if (!invoice) notFound();

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div>
      <PageHeader
        title={invoice.number}
        description={
          <Link href={`/dashboard/clients/${invoice.client.id}`} className="hover:text-brand">
            {invoice.client.businessName}
          </Link>
        }
        action={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[invoice.status as keyof typeof STATUS_TONE] ?? "default"}>{invoice.status}</Badge>
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">
                <FileDown size={13} /> PDF
              </Button>
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-subtle">
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Unit Price</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-fg">{item.description}</td>
                    <td className="px-4 py-3 text-fg-muted">{item.quantity}</td>
                    <td className="px-4 py-3 text-fg-muted">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-fg">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t border-border p-4 text-right text-sm">
              <p className="text-fg-muted">Subtotal: {formatCurrency(invoice.subtotal)}</p>
              <p className="text-fg-muted">Tax: {formatCurrency(invoice.tax)}</p>
              <p className="text-base font-semibold text-fg">Total: {formatCurrency(invoice.total)}</p>
            </div>
          </Card>

          {invoice.notes && (
            <Card className="mt-5 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Notes</h3>
              <p className="text-sm text-fg">{invoice.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Details</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Issued">{formatDate(invoice.issueDate)}</Row>
              {invoice.dueDate && <Row label="Due">{formatDate(invoice.dueDate)}</Row>}
              {invoice.isRecurring && <Row label="Recurring">{invoice.recurringInterval}</Row>}
              {invoice.paidAt && <Row label="Paid">{formatDate(invoice.paidAt)}</Row>}
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Actions</h3>
            <div className="space-y-2">
              {invoice.status === "draft" && (
                <form action={updateInvoiceStatusAction.bind(null, invoice.id, "sent")}>
                  <Button type="submit" size="sm" className="w-full">
                    Mark as sent
                  </Button>
                </form>
              )}
              {invoice.status !== "paid" && invoice.status !== "void" && (
                <form action={updateInvoiceStatusAction.bind(null, invoice.id, "paid")}>
                  <Button type="submit" size="sm" variant="secondary" className="w-full">
                    Mark as paid
                  </Button>
                </form>
              )}
              {invoice.status !== "void" && invoice.status !== "paid" && (
                <form action={updateInvoiceStatusAction.bind(null, invoice.id, "void")}>
                  <Button type="submit" size="sm" variant="ghost" className="w-full">
                    Void
                  </Button>
                </form>
              )}
            </div>
            {!stripeConfigured && (
              <p className="mt-3 text-xs text-fg-subtle">
                Online payment collection needs a <code className="rounded bg-bg px-1 py-0.5">STRIPE_SECRET_KEY</code>.
                Until then, mark invoices paid manually once payment is received.
              </p>
            )}
          </Card>

          {(invoice.type === "quote" || invoice.type === "contract") && (
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Digital Signature</h3>
              {invoice.signedByName ? (
                <p className="text-sm text-fg">
                  Signed by <span className="font-medium">{invoice.signedByName}</span> on{" "}
                  {invoice.signedAt ? formatDate(invoice.signedAt) : ""}
                </p>
              ) : (
                <form action={signInvoiceAction.bind(null, invoice.id)} className="space-y-2">
                  <Input name="signedByName" placeholder="Type full name to sign" required />
                  <Button type="submit" size="sm" className="w-full">
                    Sign {invoice.type}
                  </Button>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  );
}
