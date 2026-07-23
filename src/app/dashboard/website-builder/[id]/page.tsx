import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { publishWebsiteAction, unpublishWebsiteAction } from "@/lib/actions/website-builder";
import { PageHeader, Card, Badge, Button } from "@/components/ui/primitives";

export default async function WebsiteBuilderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const website = await db.website.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: { client: true, lead: true },
  });
  if (!website) notFound();

  const services: Array<{ title: string; description: string }> = website.servicesJson ? JSON.parse(website.servicesJson) : [];
  const sourceHref = website.client ? `/dashboard/clients/${website.client.id}` : website.lead ? `/dashboard/leads/${website.lead.id}` : null;
  const sourceName = website.client?.businessName ?? website.lead?.businessName ?? null;

  return (
    <div>
      <PageHeader
        title={website.businessName}
        description={
          sourceHref && sourceName ? (
            <Link href={sourceHref} className="hover:text-brand">
              {sourceName}
            </Link>
          ) : undefined
        }
        action={
          <div className="flex items-center gap-2">
            <Badge tone={website.status === "published" ? "success" : "default"}>{website.status}</Badge>
            {website.status === "published" ? (
              <>
                <a href={`/site/${website.publishedSlug}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink size={13} /> View live
                  </Button>
                </a>
                <form action={unpublishWebsiteAction.bind(null, website.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Unpublish
                  </Button>
                </form>
              </>
            ) : (
              <form action={publishWebsiteAction.bind(null, website.id)}>
                <Button type="submit" size="sm">
                  Publish
                </Button>
              </form>
            )}
          </div>
        }
      />

      <div className="px-6 py-5">
        <Card className="overflow-hidden">
          <div className="bg-bg px-8 py-16 text-center">
            <h1 className="text-3xl font-bold text-fg">{website.heroHeadline}</h1>
            <p className="mx-auto mt-3 max-w-md text-fg-muted">{website.heroSubheadline}</p>
          </div>

          {website.aboutContent && (
            <div className="border-t border-border px-8 py-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-fg-subtle">About</h2>
              <p className="text-fg-muted">{website.aboutContent}</p>
            </div>
          )}

          {services.length > 0 && (
            <div className="border-t border-border px-8 py-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Services</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {services.map((s, i) => (
                  <div key={i} className="rounded-lg bg-bg p-4">
                    <p className="font-medium text-fg">{s.title}</p>
                    <p className="mt-1 text-sm text-fg-muted">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {website.contactContent && (
            <div className="border-t border-border px-8 py-8 text-center">
              <p className="text-fg">{website.contactContent}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
