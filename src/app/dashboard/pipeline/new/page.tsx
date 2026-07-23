import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createDealAction } from "@/lib/actions/deals";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui/primitives";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await requireSession();
  const { clientId } = await searchParams;

  const [stages, clients, team] = await Promise.all([
    db.pipelineStage.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { order: "asc" } }),
    db.client.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { businessName: "asc" } }),
    db.user.findMany({ where: { organizationId: session.user.organizationId } }),
  ]);

  return (
    <div>
      <PageHeader title="New Deal" description="Add a deal to your sales pipeline" />

      <div className="px-6 py-5">
        <Card className="max-w-xl p-6">
          <form action={createDealAction} className="space-y-4">
            <Field label="Deal title" required>
              <Input name="title" placeholder="Website Redesign — Acme Plumbing" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Value ($)">
                <Input name="value" type="number" min="0" step="1" defaultValue="0" />
              </Field>
              <Field label="Stage">
                <Select name="stageId" defaultValue={stages[0]?.id}>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Client (optional)">
                <Select name="clientId" defaultValue={clientId ?? ""}>
                  <option value="">No client linked</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Owner">
                <Select name="ownerId" defaultValue={session.user.id}>
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Source">
                <Input name="source" placeholder="Referral, Cold Outreach, Website…" />
              </Field>
              <Field label="Expected close date">
                <Input name="expectedCloseDate" type="date" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="submit">Create deal</Button>
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
