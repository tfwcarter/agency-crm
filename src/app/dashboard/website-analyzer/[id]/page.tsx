import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PageHeader, Card, Badge } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function WebsiteAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const audit = await db.websiteAudit.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: { lead: true, client: true },
  });

  if (!audit) notFound();

  const findings: string[] = JSON.parse(audit.findingsJson);
  const recommendations: string[] = JSON.parse(audit.recommendationsJson);

  const checks = [
    { label: "SSL Certificate", pass: audit.hasSSL },
    { label: "Mobile Viewport", pass: audit.hasViewportMeta },
    { label: "Contact Form", pass: audit.hasContactForm },
    { label: "Online Booking", pass: audit.hasBookingLink },
    { label: "Google Analytics", pass: audit.hasGoogleAnalytics },
    { label: "Meta Pixel", pass: audit.hasMetaPixel },
  ];

  return (
    <div>
      <PageHeader
        title={audit.url}
        description={`Audited ${formatDate(audit.createdAt)}`}
        action={
          audit.lead ? (
            <Link href={`/dashboard/leads/${audit.lead.id}`}>
              <Badge tone="brand">{audit.lead.businessName}</Badge>
            </Link>
          ) : audit.client ? (
            <Link href={`/dashboard/clients/${audit.client.id}`}>
              <Badge tone="brand">{audit.client.businessName}</Badge>
            </Link>
          ) : undefined
        }
      />

      <div className="px-6 py-5">
        <Card className="mb-5 p-6 text-center">
          <p className="text-5xl font-bold text-fg">{audit.overallScore}</p>
          <p className="mt-1 text-sm text-fg-muted">Overall Website Score</p>
        </Card>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <ScoreCard label="Design" value={audit.designScore} />
          <ScoreCard label="SEO" value={audit.seoScore} />
          <ScoreCard label="Speed" value={audit.speedScore} />
          <ScoreCard label="Mobile" value={audit.mobileScore} />
          <ScoreCard label="Accessibility" value={audit.accessibilityScore} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Technical Checks</h3>
            <div className="space-y-2">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-sm">
                  <span className="text-fg">{c.label}</span>
                  {c.pass ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : (
                    <XCircle size={16} className="text-danger" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Findings</h3>
            <ul className="space-y-2">
              {findings.map((f, i) => (
                <li key={i} className="text-sm text-fg-muted">
                  · {f}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="mt-5 p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Redesign Proposal</h3>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-fg">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {r}
              </li>
            ))}
          </ul>
        </Card>

        {audit.pitch ? (
          <Card className="mt-5 p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <Sparkles size={12} className="text-brand" /> AI-Generated Sales Pitch
            </h3>
            <p className="whitespace-pre-wrap text-sm text-fg">{audit.pitch}</p>
          </Card>
        ) : (
          <Card className="mt-5 flex items-center justify-between gap-3 p-5 text-sm text-fg-subtle">
            <span>Connect a free AI key in Settings to auto-generate a tailored sales pitch for every audit.</span>
            <Link href="/dashboard/settings" className="shrink-0 whitespace-nowrap underline">
              Add key →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3 text-center">
      <p className={`text-xl font-semibold ${value >= 75 ? "text-success" : value >= 45 ? "text-warning" : "text-danger"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-fg-subtle">{label}</p>
    </Card>
  );
}
