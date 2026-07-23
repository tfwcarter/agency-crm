import { db } from "@/lib/db";

export type AutomationContext = {
  clientId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  entityName?: string;
};

/**
 * Runs every enabled automation rule matching `trigger` for the organization.
 * Called from inside the server actions that already perform the underlying
 * mutation (create client, move deal, mark invoice paid, etc.) so automations
 * execute against real, already-committed data — never simulated.
 */
export async function runAutomations(organizationId: string, trigger: string, context: AutomationContext) {
  const rules = await db.automationRule.findMany({
    where: { organizationId, trigger, enabled: true },
  });

  for (const rule of rules) {
    let config: Record<string, string> = {};
    try {
      config = JSON.parse(rule.actionConfig || "{}");
    } catch {
      config = {};
    }

    try {
      await executeAction(organizationId, rule.actionType, config, context);
      await db.automationLog.create({ data: { ruleId: rule.id, result: "success" } });
    } catch (err) {
      await db.automationLog.create({
        data: { ruleId: rule.id, result: "error", detail: err instanceof Error ? err.message : "Unknown error" },
      });
    }

    await db.automationRule.update({
      where: { id: rule.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
  }
}

async function executeAction(
  organizationId: string,
  actionType: string,
  config: Record<string, string>,
  context: AutomationContext
) {
  switch (actionType) {
    case "log_activity": {
      await db.activity.create({
        data: {
          organizationId,
          type: "automation",
          description: config.message || "Automation triggered",
          clientId: context.clientId || null,
          leadId: context.leadId || null,
          dealId: context.dealId || null,
        },
      });
      return;
    }
    case "add_note": {
      const body = (config.note || "Automated note").replace("{{name}}", context.entityName ?? "");
      await db.note.create({
        data: {
          organizationId,
          body,
          clientId: context.clientId || null,
          dealId: context.dealId || null,
          leadId: context.leadId || null,
        },
      });
      return;
    }
    case "create_invoice_draft": {
      if (!context.clientId) throw new Error("No client in context for create_invoice_draft");
      const amount = Number(config.amount) || 0;
      const count = await db.invoice.count({ where: { organizationId } });
      await db.invoice.create({
        data: {
          organizationId,
          clientId: context.clientId,
          number: `INV-${count + 1001}`,
          type: "invoice",
          subtotal: amount,
          tax: 0,
          total: amount,
          lineItems: { create: [{ description: config.description || "Automated invoice", quantity: 1, unitPrice: amount, order: 0 }] },
        },
      });
      return;
    }
    case "flag_client_status": {
      if (!context.clientId) throw new Error("No client in context for flag_client_status");
      await db.client.update({ where: { id: context.clientId }, data: { status: config.status || "active" } });
      return;
    }
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}
