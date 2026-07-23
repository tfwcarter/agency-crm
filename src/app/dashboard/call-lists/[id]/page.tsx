import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { assignCallListAction, deleteCallListAction, updateCallListStatusAction, addLeadsToCallListAction } from "@/lib/actions/call-lists";
import { CallListItemRow } from "@/components/leads/call-list-item-row";
import { CallListLeadPicker, type PickableLead } from "@/components/leads/call-list-lead-picker";
import { PageHeader, Card, Badge, Button, Select } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function CallListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const isAdmin = session.user.role === "owner" || session.user.role === "admin";

  const callList = await db.callList.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      items: {
        include: {
          calledBy: { select: { name: true, email: true } },
          lead: {
            select: {
              id: true,
              businessName: true,
              phone: true,
              website: true,
              city: true,
              state: true,
              opportunityScore: true,
              labelsJson: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!callList) notFound();

  const isAssignee = callList.assignedToId === session.user.id;
  if (!isAdmin && !isAssignee) notFound();

  const total = callList.items.length;
  const done = callList.items.filter((i) => i.status !== "pending").length;
  const booked = callList.items.filter((i) => i.status === "booked").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const team = isAdmin ? await db.user.findMany({ where: { organizationId: session.user.organizationId }, select: { id: true, name: true, email: true } }) : [];

  const orgId = session.user.organizationId;
  const existingLeadIds = new Set(callList.items.map((i) => i.leadId));
  const moreLeads = isAdmin
    ? await db.lead.findMany({
        where: { organizationId: orgId, status: { not: "converted" }, id: { notIn: Array.from(existingLeadIds) } },
        select: { id: true, businessName: true, phone: true, website: true, city: true, state: true, opportunityScore: true },
        orderBy: { opportunityScore: "desc" },
        take: 100,
      })
    : [];

  return (
    <div>
      <PageHeader
        title={callList.name}
        description={`${formatDate(callList.forDate)} · ${done}/${total} called · ${booked} booked`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={callList.status === "archived" ? "default" : "brand"}>{callList.status}</Badge>
            {isAdmin && (
              <>
                {callList.status === "active" ? (
                  <form action={updateCallListStatusAction.bind(null, callList.id, "archived")}>
                    <Button type="submit" size="sm" variant="secondary">
                      Archive
                    </Button>
                  </form>
                ) : (
                  <form action={updateCallListStatusAction.bind(null, callList.id, "active")}>
                    <Button type="submit" size="sm" variant="secondary">
                      Reactivate
                    </Button>
                  </form>
                )}
                <form action={deleteCallListAction.bind(null, callList.id)}>
                  <Button type="submit" size="sm" variant="danger">
                    Delete
                  </Button>
                </form>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="mb-4 p-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            {callList.items.length === 0 ? (
              <p className="p-8 text-center text-sm text-fg-subtle">No leads on this call list yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {callList.items.map((item, i) => (
                  <CallListItemRow
                    key={item.id}
                    item={{
                      ...item,
                      calledAt: item.calledAt ? item.calledAt.toISOString() : null,
                    }}
                    index={i}
                    total={callList.items.length}
                    canEdit={isAdmin || isAssignee}
                    canManage={isAdmin}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-subtle">Created by</dt>
                <dd className="text-fg">{callList.createdBy?.name || callList.createdBy?.email || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-subtle">Date</dt>
                <dd className="text-fg">{formatDate(callList.forDate)}</dd>
              </div>
            </dl>

            {isAdmin ? (
              <form action={assignCallListAction.bind(null, callList.id)} className="mt-3 flex gap-2">
                <Select name="assignedToId" defaultValue={callList.assignedToId ?? ""} className="flex-1">
                  <option value="">Unassigned</option>
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" variant="secondary">
                  Assign
                </Button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-fg-muted">Assigned to {callList.assignedTo?.name || callList.assignedTo?.email || "no one"}</p>
            )}
          </Card>

          {isAdmin && moreLeads.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Add more leads</h3>
              <form action={addLeadsToCallListAction.bind(null, callList.id)}>
                <CallListLeadPicker leads={moreLeads as PickableLead[]} preselected={[]} />
                <div className="mt-3 flex justify-end">
                  <Button type="submit" size="sm">
                    Add selected
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
