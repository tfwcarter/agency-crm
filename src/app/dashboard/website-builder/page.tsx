import Link from "next/link";
import { Globe, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { aiAvailable } from "@/lib/ai";
import { generateWebsiteAction } from "@/lib/actions/website-builder";
import { NoAiKeyBanner } from "@/components/ai/no-ai-key-banner";
import { PageHeader, Card, Select, Input, Button, Badge } from "@/components/ui/primitives";

export default async function WebsiteBuilderPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireSession();
  const { error } = await searchParams;

  const [websites, clients, leads, hasAiKey] = await Promise.all([
    db.website.findMany({ where: { organizationId: session.user.organizationId }, include: { client: true, lead: true }, orderBy: { createdAt: "desc" } }),
    db.client.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { businessName: "asc" } }),
    db.lead.findMany({ where: { organizationId: session.user.organizationId, status: { not: "converted" } }, orderBy: { businessName: "asc" } }),
    aiAvailable(session.user.organizationId),
  ]);

  return (
    <div>
      <PageHeader title="AI Website Builder" description="Generate real, publishable website copy for a client in seconds" />

      <div className="px-6 py-5">
        {!hasAiKey && <NoAiKeyBanner feature="website copy generation" />}
        {error === "no_api_key" && (
          <Card className="mb-5 p-4 text-sm text-danger">Generation failed — no AI key connected. Add one in Settings.</Card>
        )}

        <Card className="mb-6 p-5">
          <form action={generateWebsiteAction} className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-fg-muted">Client</span>
              <Select name="clientId" className="w-52">
                <option value="">— none —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                  </option>
                ))}
              </Select>
            </label>
            <span className="pb-2.5 text-xs text-fg-subtle">or</span>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-fg-muted">Lead (mockup for a pitch)</span>
              <Select name="leadId" className="w-52">
                <option value="">— none —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.businessName}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs font-medium text-fg-muted">Tone / angle (optional)</span>
              <Input name="tagline" placeholder="Friendly, family-owned, 20 years of experience" />
            </label>
            <Button type="submit">
              <Sparkles size={15} /> Generate site
            </Button>
          </form>
          <p className="mt-2 text-xs text-fg-subtle">Pick a client to build their real site, or a lead to generate a &quot;what it could look like&quot; mockup for your pitch.</p>
        </Card>

        {websites.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Globe size={28} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No websites generated yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {websites.map((w) => (
              <Link key={w.id} href={`/dashboard/website-builder/${w.id}`}>
                <Card className="p-4 hover:border-brand/50">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-fg">{w.businessName}</p>
                    <Badge tone={w.status === "published" ? "success" : "default"}>{w.status}</Badge>
                  </div>
                  <p className="text-xs text-fg-muted">
                    {w.client?.businessName ?? w.lead?.businessName}
                    {w.lead && <Badge tone="brand" className="ml-1.5">lead mockup</Badge>}
                  </p>
                  {w.heroHeadline && <p className="mt-2 text-sm text-fg-muted">&ldquo;{w.heroHeadline}&rdquo;</p>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
