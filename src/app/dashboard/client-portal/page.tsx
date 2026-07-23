import Link from "next/link";
import { MonitorSmartphone } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PageHeader, Card, Badge } from "@/components/ui/primitives";

export default async function ClientPortalOverviewPage() {
  const session = await requireSession();

  const clients = await db.client.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { businessName: "asc" },
  });

  const enabledCount = clients.filter((c) => c.portalEnabled).length;

  return (
    <div>
      <PageHeader title="Client Portal" description={`${enabledCount} of ${clients.length} clients have portal access`} />

      <div className="px-6 py-5">
        <Card className="mb-5 flex items-start gap-3 p-4">
          <MonitorSmartphone size={18} className="mt-0.5 shrink-0 text-brand" />
          <p className="text-sm text-fg-muted">
            Clients log in separately at <code className="rounded bg-bg px-1 py-0.5">/portal/login</code> to view their
            projects, invoices, and files, and to approve work or request revisions. Enable access from any client&apos;s
            profile page.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-subtle">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Portal Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/clients/${c.id}`} className="font-medium text-fg hover:text-brand">
                      {c.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{c.portalEmail || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.portalEnabled ? "success" : "default"}>{c.portalEnabled ? "active" : "not enabled"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
