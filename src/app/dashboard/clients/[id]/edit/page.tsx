import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { updateClientAction } from "@/lib/actions/clients";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui/primitives";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const [client, team] = await Promise.all([
    db.client.findFirst({ where: { id, organizationId: session.user.organizationId } }),
    db.user.findMany({ where: { organizationId: session.user.organizationId } }),
  ]);

  if (!client) notFound();

  async function update(formData: FormData) {
    "use server";
    await updateClientAction(id, formData);
    redirect(`/dashboard/clients/${id}`);
  }

  return (
    <div>
      <PageHeader title={`Edit ${client.businessName}`} />

      <div className="px-6 py-5">
        <Card className="max-w-2xl p-6">
          <form action={update} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Business name" required>
                <Input name="businessName" defaultValue={client.businessName} required />
              </Field>
              <Field label="Industry">
                <Input name="industry" defaultValue={client.industry ?? ""} />
              </Field>
              <Field label="Primary contact">
                <Input name="contactName" defaultValue={client.contactName ?? ""} />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" defaultValue={client.email ?? ""} />
              </Field>
              <Field label="Phone">
                <Input name="phone" defaultValue={client.phone ?? ""} />
              </Field>
              <Field label="Website">
                <Input name="website" defaultValue={client.website ?? ""} />
              </Field>
              <Field label="Google Business Profile">
                <Input name="googleBusinessProfile" defaultValue={client.googleBusinessProfile ?? ""} />
              </Field>
              <Field label="Address">
                <Input name="address" defaultValue={client.address ?? ""} />
              </Field>
              <Field label="Account manager">
                <Select name="accountManagerId" defaultValue={client.accountManagerId ?? ""}>
                  <option value="">Unassigned</option>
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Facebook">
                <Input name="facebookUrl" defaultValue={client.facebookUrl ?? ""} />
              </Field>
              <Field label="Instagram">
                <Input name="instagramUrl" defaultValue={client.instagramUrl ?? ""} />
              </Field>
              <Field label="LinkedIn">
                <Input name="linkedinUrl" defaultValue={client.linkedinUrl ?? ""} />
              </Field>
              <Field label="Monthly package">
                <Input name="monthlyPackage" defaultValue={client.monthlyPackage ?? ""} />
              </Field>
              <Field label="Monthly spend ($)">
                <Input name="monthlySpend" type="number" min="0" step="1" defaultValue={client.monthlySpend} />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={client.status}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="churned">Churned</option>
                </Select>
              </Field>
              <Field label="Contract start">
                <Input
                  name="contractStart"
                  type="date"
                  defaultValue={client.contractStart ? client.contractStart.toISOString().slice(0, 10) : ""}
                />
              </Field>
              <Field label="Contract end">
                <Input
                  name="contractEnd"
                  type="date"
                  defaultValue={client.contractEnd ? client.contractEnd.toISOString().slice(0, 10) : ""}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="submit">Save changes</Button>
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
