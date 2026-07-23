import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createClientAction } from "@/lib/actions/clients";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui/primitives";

export default async function NewClientPage() {
  const session = await requireSession();
  const team = await db.user.findMany({ where: { organizationId: session.user.organizationId } });

  return (
    <div>
      <PageHeader title="New Client" description="Set up a workspace for a new client" />

      <div className="px-6 py-5">
        <Card className="max-w-2xl p-6">
          <form action={createClientAction} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Business name" required>
                <Input name="businessName" placeholder="Acme Plumbing" required />
              </Field>
              <Field label="Industry">
                <Input name="industry" placeholder="Home Services" />
              </Field>
              <Field label="Primary contact">
                <Input name="contactName" placeholder="Jane Doe" />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" placeholder="jane@acme.com" />
              </Field>
              <Field label="Phone">
                <Input name="phone" placeholder="(555) 123-4567" />
              </Field>
              <Field label="Website">
                <Input name="website" placeholder="https://acme.com" />
              </Field>
              <Field label="Google Business Profile">
                <Input name="googleBusinessProfile" placeholder="Maps URL" />
              </Field>
              <Field label="Address">
                <Input name="address" placeholder="123 Main St, City, ST" />
              </Field>
              <Field label="Account manager">
                <Select name="accountManagerId" defaultValue="">
                  <option value="">Unassigned</option>
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Facebook">
                <Input name="facebookUrl" placeholder="facebook.com/acme" />
              </Field>
              <Field label="Instagram">
                <Input name="instagramUrl" placeholder="instagram.com/acme" />
              </Field>
              <Field label="LinkedIn">
                <Input name="linkedinUrl" placeholder="linkedin.com/company/acme" />
              </Field>
              <Field label="Monthly package">
                <Input name="monthlyPackage" placeholder="SEO + Google Ads" />
              </Field>
              <Field label="Monthly spend ($)">
                <Input name="monthlySpend" type="number" min="0" step="1" defaultValue="0" />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue="active">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="churned">Churned</option>
                </Select>
              </Field>
              <Field label="Contract start">
                <Input name="contractStart" type="date" />
              </Field>
              <Field label="Contract end">
                <Input name="contractEnd" type="date" />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="submit">Create client</Button>
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
