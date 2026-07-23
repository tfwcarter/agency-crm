import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createProjectAction } from "@/lib/actions/projects";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui/primitives";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const session = await requireSession();
  const { clientId } = await searchParams;
  const clients = await db.client.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { businessName: "asc" } });

  return (
    <div>
      <PageHeader title="New Project" description="Kick off a new deliverable for a client" />

      <div className="px-6 py-5">
        <Card className="max-w-xl p-6">
          <form action={createProjectAction} className="space-y-4">
            <Field label="Project name" required>
              <Input name="name" placeholder="Website Redesign" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
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
                <Select name="type" defaultValue="website">
                  <option value="website">Website</option>
                  <option value="seo">SEO</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="facebook_ads">Facebook Ads</option>
                  <option value="branding">Branding</option>
                  <option value="automation">AI Automation</option>
                  <option value="landing_page">Landing Page</option>
                  <option value="funnel">Funnel</option>
                  <option value="email_campaign">Email Campaign</option>
                </Select>
              </Field>
              <Field label="Budget ($)">
                <Input name="budget" type="number" min="0" step="1" defaultValue="0" />
              </Field>
              <Field label="Start date">
                <Input name="startDate" type="date" />
              </Field>
              <Field label="Due date">
                <Input name="dueDate" type="date" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="submit">Create project</Button>
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
