"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { aiAvailable, generateAiText, logAiGeneration } from "@/lib/ai";

export type AssistantState = { output?: string; error?: string };

const KIND_LABEL: Record<string, string> = {
  sales_email: "cold outreach email",
  sales_sms: "short SMS message",
  call_script: "phone call script",
  follow_up: "follow-up email",
  proposal: "short proposal summary",
  objection_handling: "objection-handling talking points",
  call_prep: "pre-call briefing",
};

export async function generateAssistantContentAction(_prev: AssistantState, formData: FormData): Promise<AssistantState> {
  const session = await requireSession();

  if (!(await aiAvailable(session.user.organizationId))) {
    return { error: "Add a free AI key in Settings to enable the AI Sales Assistant." };
  }

  const kind = formData.get("kind") as string;
  const leadId = formData.get("leadId") as string;
  const clientId = formData.get("clientId") as string;
  const customContext = (formData.get("customContext") as string) || "";

  let subject: { name: string; industry?: string | null; painPoints?: string | null; website?: string | null } | null = null;
  let contextLabel = "";
  let intelBlock = "";

  if (leadId) {
    const lead = await db.lead.findFirst({ where: { id: leadId, organizationId: session.user.organizationId } });
    if (lead) {
      subject = { name: lead.businessName, industry: lead.industry, painPoints: lead.painPoints, website: lead.website };
      contextLabel = lead.businessName;

      if (kind === "call_prep") {
        const breakdown: Array<{ factor: string; detail: string }> = lead.scoreBreakdownJson ? JSON.parse(lead.scoreBreakdownJson) : [];
        const services: string[] = lead.recommendedServicesJson ? JSON.parse(lead.recommendedServicesJson) : [];
        const labels: string[] = lead.labelsJson ? JSON.parse(lead.labelsJson) : [];
        intelBlock = `
Opportunity score: ${lead.opportunityScore ?? "not yet enriched"}/100
Labels: ${labels.join(", ") || "none"}
Detected issues: ${breakdown.map((b) => `${b.factor} (${b.detail})`).join("; ") || "none detected yet — enrich this lead first for a richer briefing"}
Recommended services to pitch: ${services.join(", ") || "unknown"}
${lead.googleRating !== null ? `Google rating: ${lead.googleRating} (${lead.googleReviews ?? 0} reviews)\n` : ""}${lead.estimatedDealSetup ? `Estimated deal size: $${lead.estimatedDealSetup} setup${lead.estimatedDealMonthly ? ` + $${lead.estimatedDealMonthly}/mo` : ""}\n` : ""}`;
      }
    }
  } else if (clientId) {
    const client = await db.client.findFirst({ where: { id: clientId, organizationId: session.user.organizationId } });
    if (client) {
      subject = { name: client.businessName, industry: client.industry, website: client.website };
      contextLabel = client.businessName;
    }
  }

  const subjectBlock = subject
    ? `Business: ${subject.name}\nIndustry: ${subject.industry ?? "unknown"}\n${subject.painPoints ? `Known pain points: ${subject.painPoints}\n` : ""}${subject.website ? `Website: ${subject.website}\n` : ""}`
    : "";

  const prompt =
    kind === "call_prep"
      ? `Build a pre-call briefing for a marketing agency rep about to call this prospect. Ground every claim ONLY in
the real data below — never invent statistics, reviews, or facts not given here.

${subjectBlock}${intelBlock}${customContext ? `Additional context: ${customContext}\n` : ""}
Structure the output with these exact section headers, each 2-4 sentences or bullet points:
COMPANY SUMMARY
LIKELY PAIN POINTS
TALKING POINTS
PERSONALIZED OPENING LINE
OBJECTION RESPONSES
CLOSING STRATEGY
CROSS-SELL OPPORTUNITIES

No markdown formatting (no #, no **) — plain text section headers in capitals as shown above.`
      : `Write a ${KIND_LABEL[kind] ?? kind} for the marketing agency to send/use.

${subjectBlock}${customContext ? `Additional context: ${customContext}\n` : ""}
Only output the content itself — no preamble, no explanation, no markdown headers.`;

  try {
    const output = await generateAiText({ organizationId: session.user.organizationId, prompt, maxTokens: 500 });
    await logAiGeneration(session.user.organizationId, kind, contextLabel || null, prompt, output);
    return { output };
  } catch {
    return { error: "AI generation failed — check that your key in Settings is valid." };
  }
}
