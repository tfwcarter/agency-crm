import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createLeadAction } from "@/lib/actions/leads";
import { PageHeader, Card, Input, Select, Textarea, Button } from "@/components/ui/primitives";

export default async function NewLeadPage() {
  const session = await requireSession();
  const team = await db.user.findMany({ where: { organizationId: session.user.organizationId } });

  return (
    <div>
      <PageHeader title="New Lead" description="Manually add a prospect" />

      <div className="px-6 py-5">
        <Card className="max-w-2xl p-6">
          <form action={createLeadAction} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Business name" required>
                <Input name="businessName" placeholder="Joe's Auto Repair" required />
              </Field>
              <Field label="Industry">
                <Input name="industry" placeholder="Automotive" />
              </Field>
              <Field label="Owner name">
                <Input name="ownerName" placeholder="Joe Smith" />
              </Field>
              <Field label="Phone">
                <Input name="phone" placeholder="(555) 123-4567" />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" placeholder="joe@autorepair.com" />
              </Field>
              <Field label="Website">
                <Input name="website" placeholder="https://joesauto.com" />
              </Field>
              <Field label="Address">
                <Input name="address" placeholder="123 Main St" />
              </Field>
              <Field label="City">
                <Input name="city" placeholder="Austin" />
              </Field>
              <Field label="State">
                <Input name="state" placeholder="TX" />
              </Field>
              <Field label="Zip">
                <Input name="zip" placeholder="78701" />
              </Field>
              <Field label="Owner (rep)">
                <Select name="ownerId" defaultValue={session.user.id}>
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Google rating">
                <Input name="googleRating" type="number" step="0.1" min="0" max="5" placeholder="4.2" />
              </Field>
              <Field label="Google reviews">
                <Input name="googleReviews" type="number" min="0" placeholder="18" />
              </Field>
              <Field label="Estimated revenue">
                <Input name="estimatedRevenue" placeholder="$500K - $1M" />
              </Field>
              <Field label="Employees">
                <Input name="employees" placeholder="5-10" />
              </Field>
              <Field label="Facebook">
                <Input name="facebookUrl" placeholder="facebook.com/joesauto" />
              </Field>
              <Field label="Instagram">
                <Input name="instagramUrl" placeholder="instagram.com/joesauto" />
              </Field>
              <Field label="LinkedIn">
                <Input name="linkedinUrl" placeholder="linkedin.com/company/joesauto" />
              </Field>
              <Field label="TikTok">
                <Input name="tiktokUrl" placeholder="tiktok.com/@joesauto" />
              </Field>
              <Field label="Timeline">
                <Input name="timeline" placeholder="Ready to buy in 30 days" />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue="new">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="dead">Dead</option>
                </Select>
              </Field>
            </div>
            <Field label="Pain points">
              <Textarea name="painPoints" placeholder="No website, outdated design, no online booking…" rows={2} />
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="submit">Create lead</Button>
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
