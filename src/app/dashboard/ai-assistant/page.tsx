import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { aiAvailable } from "@/lib/ai";
import { AssistantForm } from "@/components/ai/assistant-form";
import { NoAiKeyBanner } from "@/components/ai/no-ai-key-banner";
import { PageHeader, Card } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function AiAssistantPage({ searchParams }: { searchParams: Promise<{ leadId?: string; kind?: string }> }) {
  const session = await requireSession();
  const { leadId, kind } = await searchParams;

  const [leads, clients, recent, hasAiKey] = await Promise.all([
    db.lead.findMany({ where: { organizationId: session.user.organizationId, status: { not: "converted" } }, orderBy: { businessName: "asc" } }),
    db.client.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { businessName: "asc" } }),
    db.aiGeneration.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { createdAt: "desc" }, take: 8 }),
    aiAvailable(session.user.organizationId),
  ]);

  return (
    <div>
      <PageHeader title="AI Sales Assistant" description="Generate outreach, scripts, and proposals grounded in real lead/client data" />

      <div className="px-6 py-5">
        {!hasAiKey && <NoAiKeyBanner feature="real AI generation" />}

        <AssistantForm leads={leads} clients={clients} defaultLeadId={leadId} defaultKind={kind} />

        {recent.length > 0 && (
          <Card className="mt-5 p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Recent generations</h3>
            <div className="space-y-3">
              {recent.map((g) => (
                <div key={g.id} className="rounded-lg bg-bg px-3 py-2.5">
                  <p className="text-xs text-fg-subtle">
                    {g.kind.replace(/_/g, " ")} {g.context && `· ${g.context}`} · {formatDate(g.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{g.output}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
