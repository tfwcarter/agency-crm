import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createAppointmentAction } from "@/lib/actions/appointments";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui/primitives";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; leadId?: string }>;
}) {
  const session = await requireSession();
  const { clientId, leadId } = await searchParams;

  const [clients, leads, team] = await Promise.all([
    db.client.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { businessName: "asc" } }),
    db.lead.findMany({ where: { organizationId: session.user.organizationId, status: { not: "converted" } }, orderBy: { businessName: "asc" } }),
    db.user.findMany({ where: { organizationId: session.user.organizationId } }),
  ]);

  return (
    <div>
      <PageHeader title="New Appointment" description="Schedule a call or meeting" />

      <div className="px-6 py-5">
        <Card className="max-w-xl p-6">
          <form action={createAppointmentAction} className="space-y-4">
            <Field label="Title" required>
              <Input name="title" placeholder="Discovery call with Coastal Plumbing" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select name="type" defaultValue="discovery_call">
                  <option value="discovery_call">Discovery Call</option>
                  <option value="strategy_session">Strategy Session</option>
                  <option value="sales_call">Sales Call</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="client_review">Client Review</option>
                </Select>
              </Field>
              <Field label="Assigned to">
                <Select name="assignedToId" defaultValue={session.user.id}>
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start">
                <Input name="startAt" type="datetime-local" required />
              </Field>
              <Field label="End">
                <Input name="endAt" type="datetime-local" required />
              </Field>
              <Field label="Client (optional)">
                <Select name="clientId" defaultValue={clientId ?? ""}>
                  <option value="">None</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Lead (optional)">
                <Select name="leadId" defaultValue={leadId ?? ""}>
                  <option value="">None</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.businessName}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Location / meeting link">
              <Input name="location" placeholder="Zoom link, office address, or phone number" />
            </Field>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="submit">Schedule</Button>
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
