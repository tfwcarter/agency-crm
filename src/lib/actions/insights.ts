"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { aiAvailable, generateAiText, logAiGeneration } from "@/lib/ai";

export type InsightsState = { output?: string; error?: string };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateInsightsAction(_prev: InsightsState, _formData: FormData): Promise<InsightsState> {
  const session = await requireSession();
  if (!(await aiAvailable(session.user.organizationId))) {
    return { error: "Add a free AI key in Settings to enable AI insights." };
  }

  const orgId = session.user.organizationId;
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [staleDeals, overdueInvoices, atRiskClients, oldLeads, openDeals] = await Promise.all([
    db.deal.findMany({ where: { organizationId: orgId, status: "open", updatedAt: { lt: staleThreshold } }, include: { client: true }, take: 5 }),
    db.invoice.findMany({ where: { organizationId: orgId, status: { in: ["sent", "viewed"] }, dueDate: { lt: now } }, include: { client: true }, take: 5 }),
    db.client.findMany({ where: { organizationId: orgId, status: { in: ["paused", "churned"] } }, take: 5 }),
    db.lead.findMany({ where: { organizationId: orgId, status: "new", createdAt: { lt: staleThreshold } }, take: 5 }),
    db.deal.findMany({ where: { organizationId: orgId, status: "open" } }),
  ]);

  const openValue = openDeals.reduce((s, d) => s + d.value, 0);

  const metrics = `
Open deals not updated in 7+ days: ${staleDeals.map((d) => `"${d.title}" (${d.client?.businessName ?? "no client"})`).join(", ") || "none"}
Overdue invoices: ${overdueInvoices.map((i) => `${i.number} for ${i.client.businessName}`).join(", ") || "none"}
At-risk clients (paused/churned): ${atRiskClients.map((c) => `${c.businessName} (${c.status})`).join(", ") || "none"}
New leads untouched for 7+ days: ${oldLeads.map((l) => l.businessName).join(", ") || "none"}
Total open pipeline value: $${openValue.toLocaleString()}
`.trim();

  const prompt = `Here is a marketing agency's real current CRM state:

${metrics}

Give exactly 3 short, specific, actionable recommendations for the agency owner, one per line, no numbering or
bullet characters, each under 20 words. Only reference the data given — do not invent details.`;

  try {
    const output = await generateAiText({ organizationId: orgId, prompt, maxTokens: 300 });
    await logAiGeneration(orgId, "ai_insight", null, prompt, output);
    return { output };
  } catch {
    return { error: "AI generation failed — check that your key in Settings is valid." };
  }
}
