import { Users } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  updateOrgNameAction,
  saveApiKeyAction,
  clearApiKeyAction,
  createStageAction,
  updateStageAction,
  deleteStageAction,
  reorderStageAction,
  type ApiKeyField,
} from "@/lib/actions/settings";
import { PageHeader, Card, Input, Button, Badge } from "@/components/ui/primitives";

const INTEGRATIONS: { field: ApiKeyField; label: string; hint: string; docs: string }[] = [
  {
    field: "groqApiKey",
    label: "Groq — free AI",
    hint: "Powers AI Sales Assistant, AI Coach, Website Builder copy, and report summaries. Free, no credit card.",
    docs: "https://console.groq.com/keys",
  },
  {
    field: "anthropicApiKey",
    label: "Anthropic — optional paid override",
    hint: "Used instead of Groq if set. Not required.",
    docs: "https://console.anthropic.com",
  },
  {
    field: "pagespeedApiKey",
    label: "Google PageSpeed",
    hint: "Improves the AI Website Analyzer's speed score accuracy. Falls back to a heuristic without it.",
    docs: "https://developers.google.com/speed/docs/insights/v5/get-started",
  },
  {
    field: "tomtomApiKey",
    label: "TomTom — free business data",
    hint: "Recommended for the Lead Finder: real commercial business listings (far denser than OpenStreetMap). Free 2,500 searches/day, no credit card.",
    docs: "https://developer.tomtom.com/user/register",
  },
  {
    field: "googlePlacesApiKey",
    label: "Google Places",
    hint: "Powers the Lead Finder with real Google Business data — accurate website presence, ratings, and review counts. Falls back to free OpenStreetMap without it.",
    docs: "https://developers.google.com/maps/documentation/places/web-service/get-api-key",
  },
  {
    field: "stripeSecretKey",
    label: "Stripe",
    hint: "Enables real online invoice payments. Invoices work fully without it (manual mark-as-paid).",
    docs: "https://dashboard.stripe.com/apikeys",
  },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireSession();
  const { error } = await searchParams;

  const [org, stages] = await Promise.all([
    db.organization.findUnique({ where: { id: session.user.organizationId } }),
    db.pipelineStage.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { order: "asc" } }),
  ]);

  if (!org) return null;

  return (
    <div>
      <PageHeader title="Settings" description="Agency profile, integrations, and pipeline configuration" />

      <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Agency Profile</h3>
            <form action={updateOrgNameAction} className="flex gap-2">
              <Input name="name" defaultValue={org.name} required className="flex-1" />
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <Users size={12} /> Team & Security
            </h3>
            <p className="mb-2 text-sm text-fg-muted">
              Manage team roles, commissions, and access from the Team page.
            </p>
            <Link href="/dashboard/team">
              <Button variant="secondary" size="sm">
                Go to Team →
              </Button>
            </Link>
          </Card>

          <Card className="p-5">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Integrations</h3>
            <p className="mb-4 text-xs text-fg-subtle">
              Paste a key below and it works immediately — no .env editing, no restart.
            </p>
            <div className="space-y-5">
              {INTEGRATIONS.map((i) => {
                const connected = Boolean(org[i.field]);
                return (
                  <div key={i.field}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-fg">{i.label}</span>
                      <Badge tone={connected ? "success" : "default"}>{connected ? "Connected" : "Not connected"}</Badge>
                    </div>
                    <p className="mb-2 text-xs text-fg-muted">{i.hint}</p>
                    <form action={saveApiKeyAction.bind(null, i.field)} className="flex gap-2">
                      <Input
                        type="password"
                        name="value"
                        placeholder={connected ? "•••••••••• (paste to replace)" : "Paste your key"}
                        className="flex-1"
                        autoComplete="off"
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        Save
                      </Button>
                    </form>
                    <div className="mt-1.5 flex items-center gap-3 text-xs">
                      <a href={i.docs} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover">
                        Get a free key →
                      </a>
                      {connected && (
                        <form action={clearApiKeyAction.bind(null, i.field)}>
                          <button type="submit" className="text-fg-subtle hover:text-danger">
                            Remove
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Pipeline Stages</h3>
          {error === "stage_has_deals" && (
            <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              Move or close deals in that stage before deleting it.
            </p>
          )}
          <div className="mb-4 space-y-2">
            {stages.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <div className="flex flex-col">
                  <form action={reorderStageAction.bind(null, stage.id, "up")}>
                    <button type="submit" disabled={i === 0} className="text-fg-subtle hover:text-fg disabled:opacity-30">
                      ▲
                    </button>
                  </form>
                  <form action={reorderStageAction.bind(null, stage.id, "down")}>
                    <button type="submit" disabled={i === stages.length - 1} className="text-fg-subtle hover:text-fg disabled:opacity-30">
                      ▼
                    </button>
                  </form>
                </div>
                <form action={updateStageAction.bind(null, stage.id)} className="flex flex-1 items-center gap-2">
                  <input type="color" name="color" defaultValue={stage.color} className="h-7 w-7 shrink-0 rounded border border-border bg-transparent" />
                  <Input name="name" defaultValue={stage.name} className="flex-1" />
                  <Button type="submit" size="sm" variant="secondary">
                    Save
                  </Button>
                </form>
                <form action={deleteStageAction.bind(null, stage.id)}>
                  <button type="submit" className="text-xs text-fg-subtle hover:text-danger">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
          <form action={createStageAction} className="flex items-center gap-2 border-t border-border pt-4">
            <input type="color" name="color" defaultValue="#6366f1" className="h-9 w-9 shrink-0 rounded border border-border bg-transparent" />
            <Input name="name" placeholder="New stage name" className="flex-1" required />
            <Button type="submit" size="sm">
              Add stage
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
