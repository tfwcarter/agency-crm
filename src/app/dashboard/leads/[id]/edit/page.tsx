import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { updateLeadAction, deleteLeadAction } from "@/lib/actions/leads";
import { PageHeader, Card, Input, Select, Textarea, Button } from "@/components/ui/primitives";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const [lead, team] = await Promise.all([
    db.lead.findFirst({ where: { id, organizationId: session.user.organizationId } }),
    db.user.findMany({ where: { organizationId: session.user.organizationId } }),
  ]);

  if (!lead) notFound();

  async function update(formData: FormData) {
    "use server";
    await updateLeadAction(id, formData);
    redirect(`/dashboard/leads/${id}`);
  }

  return (
    <div>
      <PageHeader title={`Edit ${lead.businessName}`} />

      <div className="px-6 py-5">
        <Card className="max-w-2xl p-6">
          <form action={update} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Business name" required>
                <Input name="businessName" defaultValue={lead.businessName} required />
              </Field>
              <Field label="Industry">
                <Input name="industry" defaultValue={lead.industry ?? ""} />
              </Field>
              <Field label="Owner name">
                <Input name="ownerName" defaultValue={lead.ownerName ?? ""} />
              </Field>
              <Field label="Phone">
                <Input name="phone" defaultValue={lead.phone ?? ""} />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" defaultValue={lead.email ?? ""} />
              </Field>
              <Field label="Website">
                <Input name="website" defaultValue={lead.website ?? ""} />
              </Field>
              <Field label="Address">
                <Input name="address" defaultValue={lead.address ?? ""} />
              </Field>
              <Field label="City">
                <Input name="city" defaultValue={lead.city ?? ""} />
              </Field>
              <Field label="State">
                <Input name="state" defaultValue={lead.state ?? ""} />
              </Field>
              <Field label="Zip">
                <Input name="zip" defaultValue={lead.zip ?? ""} />
              </Field>
              <Field label="Rep">
                <Select name="ownerId" defaultValue={lead.ownerId ?? ""}>
                  <option value="">Unassigned</option>
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Google rating">
                <Input name="googleRating" type="number" step="0.1" min="0" max="5" defaultValue={lead.googleRating ?? ""} />
              </Field>
              <Field label="Google reviews">
                <Input name="googleReviews" type="number" min="0" defaultValue={lead.googleReviews ?? ""} />
              </Field>
              <Field label="Estimated revenue">
                <Input name="estimatedRevenue" defaultValue={lead.estimatedRevenue ?? ""} />
              </Field>
              <Field label="Employees">
                <Input name="employees" defaultValue={lead.employees ?? ""} />
              </Field>
              <Field label="Facebook">
                <Input name="facebookUrl" defaultValue={lead.facebookUrl ?? ""} />
              </Field>
              <Field label="Instagram">
                <Input name="instagramUrl" defaultValue={lead.instagramUrl ?? ""} />
              </Field>
              <Field label="LinkedIn">
                <Input name="linkedinUrl" defaultValue={lead.linkedinUrl ?? ""} />
              </Field>
              <Field label="TikTok">
                <Input name="tiktokUrl" defaultValue={lead.tiktokUrl ?? ""} />
              </Field>
              <Field label="Timeline">
                <Input name="timeline" defaultValue={lead.timeline ?? ""} />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={lead.status}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="dead">Dead</option>
                </Select>
              </Field>
            </div>
            <Field label="Pain points">
              <Textarea name="painPoints" defaultValue={lead.painPoints ?? ""} rows={2} />
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="submit">Save changes</Button>
            </div>
          </form>

          <form action={deleteLeadAction.bind(null, id)} className="mt-4 flex justify-end border-t border-border pt-4">
            <Button type="submit" variant="danger" size="sm">
              Delete lead
            </Button>
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
