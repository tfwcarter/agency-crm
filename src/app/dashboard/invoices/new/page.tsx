import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { LineItemsEditor } from "@/components/invoices/line-items-editor";
import { PageHeader, Card, Input, Select, Textarea, Button } from "@/components/ui/primitives";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const session = await requireSession();
  const { clientId } = await searchParams;
  const clients = await db.client.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { businessName: "asc" } });

  return (
    <div>
      <PageHeader title="New Invoice" description="Create an invoice, quote, or contract" />

      <div className="px-6 py-5">
        <Card className="max-w-2xl p-6">
          <form action={createInvoiceAction} className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Client" required>
                <Select name="clientId" defaultValue={clientId ?? ""} required>
                  <option value="" disabled>
                    Select a client
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Type">
                <Select name="type" defaultValue="invoice">
                  <option value="invoice">Invoice</option>
                  <option value="quote">Quote</option>
                  <option value="contract">Contract</option>
                </Select>
              </Field>
              <Field label="Due date">
                <Input name="dueDate" type="date" />
              </Field>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-fg-muted">Line items</span>
              <LineItemsEditor />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Tax rate (%)">
                <Input name="taxRate" type="number" min="0" step="0.1" defaultValue="0" />
              </Field>
              <Field label="Recurring">
                <label className="flex h-[38px] items-center gap-2 text-sm text-fg">
                  <input type="checkbox" name="isRecurring" className="accent-brand" /> Yes
                </label>
              </Field>
              <Field label="Interval">
                <Select name="recurringInterval" defaultValue="monthly">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </Field>
            </div>

            <Field label="Notes">
              <Textarea name="notes" placeholder="Payment terms, project scope, etc." rows={2} />
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-fg-muted">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}
