import { Workflow, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { toggleAutomationAction, deleteAutomationAction } from "@/lib/actions/automations";
import { AutomationBuilder } from "@/components/automations/automation-builder";
import { PageHeader, Card, Badge, Button } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

const TRIGGER_LABEL: Record<string, string> = {
  lead_created: "Lead created",
  client_created: "Client created",
  deal_won: "Deal won",
  deal_lost: "Deal lost",
  deal_stage_changed: "Deal stage changed",
  invoice_paid: "Invoice paid",
  appointment_booked: "Appointment booked",
};

const ACTION_LABEL: Record<string, string> = {
  log_activity: "Log activity",
  add_note: "Add note",
  create_invoice_draft: "Create draft invoice",
  flag_client_status: "Set client status",
};

export default async function AutomationsPage() {
  const session = await requireSession();

  const rules = await db.automationRule.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Automations" description="Real trigger → action rules that run against live CRM events" />

      <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">New automation</h3>
          <AutomationBuilder />
        </Card>

        <div className="space-y-3 lg:col-span-2">
          {rules.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <Workflow size={28} className="mb-3 text-fg-subtle" />
              <p className="text-sm font-medium text-fg">No automations yet</p>
              <p className="mt-1 text-sm text-fg-muted">Build your first rule on the left.</p>
            </Card>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-medium text-fg">{rule.name}</p>
                      <Badge tone={rule.enabled ? "success" : "default"}>{rule.enabled ? "enabled" : "disabled"}</Badge>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                      <Zap size={11} className="text-brand" />
                      {TRIGGER_LABEL[rule.trigger] ?? rule.trigger} → {ACTION_LABEL[rule.actionType] ?? rule.actionType}
                    </p>
                    <p className="mt-1 text-xs text-fg-subtle">
                      Ran {rule.runCount} times{rule.lastRunAt ? ` · last ${formatDate(rule.lastRunAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <form action={toggleAutomationAction.bind(null, rule.id, !rule.enabled)}>
                      <Button type="submit" size="sm" variant="secondary">
                        {rule.enabled ? "Disable" : "Enable"}
                      </Button>
                    </form>
                    <form action={deleteAutomationAction.bind(null, rule.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
