import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Star,
  Pencil,
  ArrowRightCircle,
  Search,
  Bot,
  Globe,
  Phone,
  MessageSquare,
  Mail,
  Share2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  DollarSign,
  CalendarClock,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { addLeadNoteAction, convertLeadToClientAction } from "@/lib/actions/leads";
import { generateWebsiteAction } from "@/lib/actions/website-builder";
import { PageHeader, Card, Badge, Button, Textarea } from "@/components/ui/primitives";
import { EnrichButton } from "@/components/leads/enrich-button";
import { FavoriteToggle } from "@/components/leads/favorite-toggle";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TONE = {
  new: "brand",
  contacted: "warning",
  qualified: "success",
  converted: "success",
  dead: "danger",
} as const;

function scoreTone(score: number | null) {
  if (score === null) return "text-fg-subtle";
  if (score >= 75) return "text-danger";
  if (score >= 45) return "text-warning";
  return "text-success";
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const lead = await db.lead.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      owner: true,
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      activities: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 },
      websiteAudits: { orderBy: { createdAt: "desc" } },
      appointments: { where: { status: "scheduled" }, orderBy: { startAt: "asc" }, take: 3 },
      websites: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) notFound();

  const labels: string[] = lead.labelsJson ? JSON.parse(lead.labelsJson) : [];
  const breakdown: Array<{ factor: string; points: number; detail: string }> = lead.scoreBreakdownJson ? JSON.parse(lead.scoreBreakdownJson) : [];
  const recommendedServices: string[] = lead.recommendedServicesJson ? JSON.parse(lead.recommendedServicesJson) : [];
  const techStack: string[] = lead.techStackJson ? JSON.parse(lead.techStackJson) : [];

  const domainAgeYears = lead.domainCreatedAt ? (new Date().getTime() - lead.domainCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 365.25) : null;

  const signals: Array<{ label: string; value: boolean | null; detail?: string }> = [
    { label: "SSL Certificate", value: lead.hasSsl },
    { label: "Google Analytics / GTM", value: lead.hasGoogleAnalytics },
    { label: "Meta Pixel", value: lead.hasMetaPixel },
    { label: "TikTok Pixel", value: lead.hasTikTokPixel },
    { label: "LinkedIn Insight Tag", value: lead.hasLinkedInInsight },
    { label: "Schema.org Markup", value: lead.hasSchema },
    { label: "Open Graph Tags", value: lead.hasOpenGraph },
    { label: "Favicon", value: lead.hasFavicon },
    { label: "Privacy Policy", value: lead.hasPrivacyPolicy },
    { label: "Chat Widget", value: lead.hasChatWidget, detail: lead.chatWidgetVendor ?? undefined },
  ];

  return (
    <div>
      <PageHeader
        title={lead.businessName}
        description={lead.industry || undefined}
        action={
          <div className="flex items-center gap-2">
            <FavoriteToggle leadId={lead.id} favorited={lead.favorited} />
            <Badge tone={STATUS_TONE[lead.status as keyof typeof STATUS_TONE] ?? "default"}>{lead.status}</Badge>
            <Link href={`/dashboard/leads/${lead.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil size={13} /> Edit
              </Button>
            </Link>
            {lead.status !== "converted" && (
              <form action={convertLeadToClientAction.bind(null, lead.id)}>
                <Button type="submit" size="sm">
                  <ArrowRightCircle size={13} /> Convert to Client
                </Button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Card className="p-5 text-center">
            <p className={`text-5xl font-bold ${scoreTone(lead.opportunityScore)}`}>{lead.opportunityScore ?? "—"}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-fg-subtle">Opportunity Score</p>
            {labels.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {labels.map((l) => (
                  <span key={l} className="rounded-full bg-bg px-2 py-1 text-xs text-fg-muted">
                    {l}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-center">
              <EnrichButton leadId={lead.id} hasBeenEnriched={Boolean(lead.lastEnrichedAt)} />
            </div>
            {lead.lastEnrichedAt && <p className="mt-2 text-[11px] text-fg-subtle">Last enriched {formatDate(lead.lastEnrichedAt)}</p>}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-fg hover:border-brand/50">
                  <Phone size={13} /> Call
                </a>
              )}
              {lead.phone && (
                <a href={`sms:${lead.phone}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-fg hover:border-brand/50">
                  <MessageSquare size={13} /> Text
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-fg hover:border-brand/50">
                  <Mail size={13} /> Email
                </a>
              )}
              {lead.website && (
                <a href={ensureUrl(lead.website)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-fg hover:border-brand/50">
                  <Globe size={13} /> Site
                </a>
              )}
              {lead.facebookUrl && (
                <a href={ensureUrl(lead.facebookUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-fg hover:border-brand/50">
                  <Share2 size={13} /> Facebook
                </a>
              )}
              {lead.instagramUrl && (
                <a href={ensureUrl(lead.instagramUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-fg hover:border-brand/50">
                  <Share2 size={13} /> Instagram
                </a>
              )}
              {lead.linkedinUrl && (
                <a href={ensureUrl(lead.linkedinUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-fg hover:border-brand/50">
                  <Share2 size={13} /> LinkedIn
                </a>
              )}
            </div>

            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              {lead.website && (
                <Link href={`/dashboard/website-analyzer?leadId=${lead.id}&url=${encodeURIComponent(lead.website)}`}>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <Globe size={13} /> Generate AI Audit
                  </Button>
                </Link>
              )}
              <Link href={`/dashboard/ai-assistant?leadId=${lead.id}`}>
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <Bot size={13} /> Draft outreach with AI
                </Button>
              </Link>
              <Link href={`/dashboard/ai-assistant?leadId=${lead.id}&kind=call_prep`}>
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <Phone size={13} /> Generate call prep
                </Button>
              </Link>
              <Link href={`/dashboard/appointments/new?leadId=${lead.id}`}>
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <CalendarClock size={13} /> Schedule follow-up
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Profile</h3>
            <dl className="space-y-2.5 text-sm">
              {lead.ownerName && <Row label="Owner">{lead.ownerName}</Row>}
              {lead.phone && <Row label="Phone">{lead.phone}</Row>}
              {lead.email && <Row label="Email">{lead.email}</Row>}
              {lead.website && (
                <Row label="Website">
                  <a href={ensureUrl(lead.website)} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover">
                    {lead.website}
                  </a>
                </Row>
              )}
              {lead.address && <Row label="Address">{lead.address}</Row>}
              {(lead.city || lead.state) && <Row label="Location">{[lead.city, lead.state, lead.zip].filter(Boolean).join(", ")}</Row>}
              {lead.estimatedRevenue && <Row label="Est. revenue">{lead.estimatedRevenue}</Row>}
              {lead.employees && <Row label="Employees">{lead.employees}</Row>}
              {lead.timeline && <Row label="Timeline">{lead.timeline}</Row>}
              {domainAgeYears !== null && <Row label="Domain age">{domainAgeYears.toFixed(1)} years</Row>}
              {lead.dnsProvider && <Row label="DNS provider">{lead.dnsProvider}</Row>}
              {lead.mxProvider && <Row label="Email provider">{lead.mxProvider}</Row>}
              <Row label="Rep">{lead.owner?.name || lead.owner?.email || "Unassigned"}</Row>
            </dl>
            {(lead.googleRating !== null || lead.googleReviews !== null) && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-bg p-2.5 text-sm">
                <Star size={14} className="text-warning" fill="currentColor" />
                {lead.googleRating ?? "—"} · {lead.googleReviews ?? 0} reviews
                <span className="ml-auto text-[10px] text-fg-subtle">manually entered</span>
              </div>
            )}
            {lead.appointments.length > 0 && (
              <div className="mt-3 space-y-1.5 rounded-lg bg-bg p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Upcoming</p>
                {lead.appointments.map((a) => (
                  <p key={a.id} className="text-sm text-fg">
                    {a.title} · {formatDate(a.startAt)}
                  </p>
                ))}
              </div>
            )}
            {lead.painPoints && (
              <div className="mt-3 rounded-lg bg-bg p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Pain points</p>
                <p className="mt-1 text-sm text-fg">{lead.painPoints}</p>
              </div>
            )}
            {techStack.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {techStack.map((t) => (
                  <Badge key={t} tone="default">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {breakdown.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Why this score</h3>
              <div className="space-y-2">
                {breakdown.map((b, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-bg px-3 py-2 text-sm">
                    <div>
                      <p className="text-fg">{b.factor}</p>
                      <p className="text-xs text-fg-subtle">{b.detail}</p>
                    </div>
                    <span className="shrink-0 font-medium text-warning">+{b.points}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {recommendedServices.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                <DollarSign size={12} /> Recommended Services & Estimated Deal Size
              </h3>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {recommendedServices.map((s) => (
                  <Badge key={s} tone="brand">
                    {s}
                  </Badge>
                ))}
              </div>
              {lead.estimatedDealSetup || lead.estimatedDealMonthly ? (
                <div className="flex gap-4 rounded-lg bg-bg p-3">
                  {lead.estimatedDealSetup && (
                    <div>
                      <p className="text-lg font-semibold text-fg">{formatCurrency(lead.estimatedDealSetup)}</p>
                      <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Est. setup</p>
                    </div>
                  )}
                  {lead.estimatedDealMonthly && (
                    <div>
                      <p className="text-lg font-semibold text-fg">{formatCurrency(lead.estimatedDealMonthly)}/mo</p>
                      <p className="text-[10px] uppercase tracking-wide text-fg-subtle">Est. recurring</p>
                    </div>
                  )}
                  <p className="ml-auto self-center text-[10px] text-fg-subtle">based on your agency&apos;s own closed deals</p>
                </div>
              ) : (
                <p className="text-xs text-fg-subtle">
                  No deal-size estimate yet — close a few real {recommendedServices[0]?.toLowerCase()} projects or set Client
                  Service pricing, and estimates will appear here automatically.
                </p>
              )}
            </Card>
          )}

          {lead.website && lead.hasSsl !== null && (
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Technical Signals</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {signals.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-sm">
                    {s.value === true ? (
                      <CheckCircle2 size={14} className="shrink-0 text-success" />
                    ) : s.value === false ? (
                      <XCircle size={14} className="shrink-0 text-danger" />
                    ) : (
                      <MinusCircle size={14} className="shrink-0 text-fg-subtle" />
                    )}
                    <span className="text-fg-muted">
                      {s.label}
                      {s.detail && <span className="text-fg-subtle"> ({s.detail})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                <Globe size={12} /> AI Website Mockup
              </h3>
              <form action={generateWebsiteAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <Button type="submit" size="sm" variant="secondary">
                  {lead.websites.length > 0 ? "Regenerate mockup" : "Generate mockup"}
                </Button>
              </form>
            </div>
            {lead.websites.length === 0 ? (
              <p className="text-sm text-fg-subtle">
                Generate an AI-written &quot;what it could look like&quot; homepage preview to show during your pitch —
                useful when this business has no website or an outdated one.
              </p>
            ) : (
              <div className="space-y-2">
                {lead.websites.map((w) => (
                  <Link key={w.id} href={`/dashboard/website-builder/${w.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:border-brand/50">
                    <span className="text-sm text-fg">{w.heroHeadline || w.businessName}</span>
                    <Badge tone={w.status === "published" ? "success" : "default"}>{w.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {lead.websiteAudits.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                <Search size={12} /> Website Audits
              </h3>
              <div className="space-y-2">
                {lead.websiteAudits.map((audit) => (
                  <Link
                    key={audit.id}
                    href={`/dashboard/website-analyzer/${audit.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:border-brand/50"
                  >
                    <span className="text-sm text-fg">{audit.url}</span>
                    <span className="text-sm font-medium text-brand">{audit.overallScore}/100</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Notes</h3>
            <form action={addLeadNoteAction.bind(null, lead.id)} className="mb-4 space-y-2">
              <Textarea name="body" placeholder="Add a note…" rows={2} required />
              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  Add note
                </Button>
              </div>
            </form>
            <div className="space-y-3">
              {lead.notes.length === 0 && <p className="text-sm text-fg-subtle">No notes yet.</p>}
              {lead.notes.map((note) => (
                <div key={note.id} className="rounded-lg bg-bg px-3 py-2.5">
                  <p className="text-sm text-fg">{note.body}</p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    {note.author?.name || note.author?.email || "Team"} · {formatDate(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Activity</h3>
            <div className="space-y-3">
              {lead.activities.length === 0 && <p className="text-sm text-fg-subtle">No activity yet.</p>}
              {lead.activities.map((a) => (
                <div key={a.id} className="flex gap-2.5 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="text-fg">{a.description}</p>
                    <p className="text-xs text-fg-subtle">
                      {a.user?.name || a.user?.email || "System"} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-fg-subtle">{label}</dt>
      <dd className="text-right text-fg">{children}</dd>
    </div>
  );
}

function ensureUrl(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}
