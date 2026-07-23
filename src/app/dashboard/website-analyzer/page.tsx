import Link from "next/link";
import { Gauge } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { runWebsiteAuditAction } from "@/lib/actions/website-audit";
import { PageHeader, Card, Input, Button } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

function scoreTone(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 45) return "text-warning";
  return "text-danger";
}

export default async function WebsiteAnalyzerPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; url?: string }>;
}) {
  const session = await requireSession();
  const { leadId, url } = await searchParams;

  const audits = await db.websiteAudit.findMany({
    where: { organizationId: session.user.organizationId },
    include: { lead: true, client: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <PageHeader title="AI Website Analyzer" description="Paste any website to get a real, automated audit and sales pitch" />

      <div className="px-6 py-5">
        <Card className="mb-6 max-w-2xl p-6">
          <form action={runWebsiteAuditAction} className="space-y-4">
            {leadId && <input type="hidden" name="leadId" value={leadId} />}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-muted">Website URL</label>
              <div className="flex gap-2">
                <Input name="url" defaultValue={url} placeholder="https://example.com" required className="flex-1" />
                <Button type="submit">
                  <Gauge size={15} /> Analyze
                </Button>
              </div>
            </div>
            <p className="text-xs text-fg-subtle">
              Runs a real HTTP fetch + HTML analysis — SSL, meta tags, mobile viewport, analytics/pixel detection,
              CTAs, forms, booking links — and scores design, SEO, speed, mobile, and accessibility.
            </p>
          </form>
        </Card>

        {audits.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Gauge size={28} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No audits yet</p>
            <p className="mt-1 text-sm text-fg-muted">Paste a URL above to run your first analysis.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-subtle">
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium">Linked to</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr key={audit.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/website-analyzer/${audit.id}`} className="font-medium text-fg hover:text-brand">
                        {audit.url}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {audit.lead ? (
                        <Link href={`/dashboard/leads/${audit.lead.id}`} className="hover:text-brand">
                          {audit.lead.businessName}
                        </Link>
                      ) : audit.client ? (
                        <Link href={`/dashboard/clients/${audit.client.id}`} className="hover:text-brand">
                          {audit.client.businessName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${scoreTone(audit.overallScore)}`}>{audit.overallScore}/100</td>
                    <td className="px-4 py-3 text-fg-muted">{formatDate(audit.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
