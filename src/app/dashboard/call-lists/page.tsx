import Link from "next/link";
import { Plus, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PageHeader, Card, Badge, Button } from "@/components/ui/primitives";
import { formatDate, initials } from "@/lib/utils";

export default async function CallListsPage() {
  const session = await requireSession();
  const isAdmin = session.user.role === "owner" || session.user.role === "admin";

  const callLists = await db.callList.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(isAdmin ? {} : { assignedToId: session.user.id }),
    },
    include: {
      assignedTo: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      items: { select: { status: true } },
    },
    orderBy: [{ forDate: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Call Lists"
        description={
          isAdmin
            ? `${callLists.length} call list${callLists.length === 1 ? "" : "s"} across your team`
            : `${callLists.length} assigned to you`
        }
        action={
          isAdmin ? (
            <Link href="/dashboard/call-lists/new">
              <Button>
                <Plus size={15} /> New Call List
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="px-6 py-5">
        {callLists.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <Phone size={28} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">{isAdmin ? "No call lists yet" : "Nothing assigned to you yet"}</p>
            <p className="mt-1 text-sm text-fg-muted">
              {isAdmin ? "Build a daily call list from your leads and assign it to a rep." : "Ask an owner or admin to assign you a call list."}
            </p>
            {isAdmin && (
              <Link href="/dashboard/call-lists/new" className="mt-4">
                <Button>
                  <Plus size={15} /> New Call List
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {callLists.map((list) => {
              const total = list.items.length;
              const done = list.items.filter((i) => i.status !== "pending").length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Link key={list.id} href={`/dashboard/call-lists/${list.id}`}>
                  <Card className="p-4 transition-colors hover:border-brand/50">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-medium text-fg">{list.name}</p>
                      <Badge tone={list.status === "archived" ? "default" : "brand"}>{list.status}</Badge>
                    </div>
                    <p className="mb-3 text-xs text-fg-muted">{formatDate(list.forDate)}</p>

                    <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-bg">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-fg-subtle">
                      <span>
                        {done}/{total} called
                      </span>
                      <span className="flex items-center gap-1.5">
                        {list.assignedTo ? (
                          <>
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand/15 text-[9px] font-semibold text-brand">
                              {initials(list.assignedTo.name || list.assignedTo.email)}
                            </span>
                            {list.assignedTo.name || list.assignedTo.email}
                          </>
                        ) : (
                          "Unassigned"
                        )}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
