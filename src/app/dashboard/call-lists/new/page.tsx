import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import { createCallListAction, importCallListCsvAction } from "@/lib/actions/call-lists";
import { CallListLeadPicker, type PickableLead } from "@/components/leads/call-list-lead-picker";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui/primitives";

function toPickable(lead: {
  id: string;
  businessName: string;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  opportunityScore: number | null;
}): PickableLead {
  return lead;
}

export default async function NewCallListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; preselect?: string; error?: string }>;
}) {
  const session = await requireAdminSession();
  const { q, preselect, error } = await searchParams;
  const orgId = session.user.organizationId;

  const pickFields = {
    id: true,
    businessName: true,
    phone: true,
    website: true,
    city: true,
    state: true,
    opportunityScore: true,
  } as const;

  const preselectIds = preselect ? preselect.split(",").filter(Boolean) : [];

  const [leads, preselectedLeads, team] = await Promise.all([
    db.lead.findMany({
      where: {
        organizationId: orgId,
        status: { not: "converted" },
        ...(q ? { businessName: { contains: q } } : {}),
      },
      select: pickFields,
      orderBy: { opportunityScore: "desc" },
      take: 100,
    }),
    preselectIds.length > 0
      ? db.lead.findMany({ where: { id: { in: preselectIds }, organizationId: orgId }, select: pickFields })
      : Promise.resolve([]),
    db.user.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, email: true } }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="New Call List" description="Build a daily call list and assign it to a rep" />

      <div className="px-6 py-5">
        <Card className="max-w-3xl p-6">
          {error === "missing_fields" && (
            <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              Give the list a name and select at least one lead (or a CSV file).
            </p>
          )}
          {error === "empty_csv" && (
            <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              That CSV didn&apos;t have any usable rows. Check the file and try again.
            </p>
          )}
          {error === "no_name_column" && (
            <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              Couldn&apos;t find a name/business/company column in that CSV&apos;s header row.
            </p>
          )}
          <div className="mb-5">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">Search leads</span>
            <form>
              {preselect && <input type="hidden" name="preselect" value={preselect} />}
              <Input type="text" name="q" defaultValue={q} placeholder="Search by business name…" />
            </form>
          </div>

          <form action={createCallListAction} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="List name" required>
                <Input name="name" placeholder={`Call List — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`} required />
              </Field>
              <Field label="Date">
                <Input name="forDate" type="date" defaultValue={today} />
              </Field>
              <Field label="Assign to">
                <Select name="assignedToId" defaultValue="">
                  <option value="">Unassigned</option>
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-fg-muted">Select leads</span>
              <CallListLeadPicker leads={leads.map(toPickable)} preselected={preselectedLeads.map(toPickable)} />
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="submit">Create call list</Button>
            </div>
          </form>
        </Card>

        <Card className="mt-5 max-w-3xl p-6">
          <h2 className="mb-1 text-sm font-semibold text-fg">Import from CSV</h2>
          <p className="mb-4 text-xs text-fg-muted">
            Header row required. Recognized columns: <code>name</code> (required), <code>phone</code>,{" "}
            <code>email</code>, <code>website</code>, <code>city</code>, <code>state</code>. Businesses that don&apos;t
            already exist as a lead are created automatically.
          </p>
          <form action={importCallListCsvAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="List name" required>
              <Input name="name" placeholder="Imported list" required />
            </Field>
            <Field label="Date">
              <Input name="forDate" type="date" defaultValue={today} />
            </Field>
            <Field label="Assign to">
              <Select name="assignedToId" defaultValue="">
                <option value="">Unassigned</option>
                {team.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="CSV file" required>
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                required
                className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-fg"
              />
            </Field>
            <div className="flex items-end sm:col-span-2 sm:justify-end">
              <Button type="submit">Import &amp; create list</Button>
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
