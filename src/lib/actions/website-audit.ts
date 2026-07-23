"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { auditWebsite } from "@/lib/website-audit";
import { aiAvailable, generateAiText, logAiGeneration } from "@/lib/ai";
import { getOrgApiKeys } from "@/lib/api-keys";
import { enrichLeadAction } from "@/lib/actions/lead-enrichment";

export async function runWebsiteAuditAction(formData: FormData) {
  const session = await requireSession();
  const url = formData.get("url");
  const leadId = (formData.get("leadId") as string) || undefined;
  const clientId = (formData.get("clientId") as string) || undefined;
  if (typeof url !== "string" || !url.trim()) return;

  const keys = await getOrgApiKeys(session.user.organizationId);
  const result = await auditWebsite(url.trim(), keys.pagespeedApiKey);

  let pitch: string | null = null;
  if (await aiAvailable(session.user.organizationId)) {
    const prompt = `A prospect's website "${url}" was just audited. Overall score: ${result.overallScore}/100.
Findings:
${result.findings.map((f) => `- ${f}`).join("\n")}

Write a short, specific 3-4 sentence cold outreach pitch for a marketing agency to send this business, referencing
1-2 of the most impactful findings above and the concrete business impact of fixing them (lost leads, poor mobile
experience, etc). No greeting/signature, just the pitch body. Confident, not salesy.`;
    try {
      pitch = await generateAiText({ organizationId: session.user.organizationId, prompt, maxTokens: 300 });
      await logAiGeneration(session.user.organizationId, "website_audit_pitch", url, prompt, pitch);
    } catch {
      pitch = null;
    }
  }

  const audit = await db.websiteAudit.create({
    data: {
      organizationId: session.user.organizationId,
      leadId: leadId || null,
      clientId: clientId || null,
      url: url.trim(),
      overallScore: result.overallScore,
      designScore: result.designScore,
      seoScore: result.seoScore,
      speedScore: result.speedScore,
      mobileScore: result.mobileScore,
      accessibilityScore: result.accessibilityScore,
      hasSSL: result.hasSsl,
      hasGoogleAnalytics: result.hasGoogleAnalytics,
      hasGoogleTagManager: result.hasGoogleTagManager,
      hasMetaPixel: result.hasMetaPixel,
      hasTikTokPixel: result.hasTikTokPixel,
      hasLinkedInInsight: result.hasLinkedInInsight,
      hasContactForm: result.hasContactForm,
      hasBookingLink: result.hasBookingLink,
      hasViewportMeta: result.hasViewportMeta,
      hasSchema: result.hasSchema,
      hasOpenGraph: result.hasOpenGraph,
      hasFavicon: result.hasFavicon,
      hasPrivacyPolicy: result.hasPrivacyPolicy,
      hasChatWidget: result.hasChatWidget,
      chatWidgetVendor: result.chatWidgetVendor,
      brokenLinkCount: result.brokenLinkCount,
      copyrightYear: result.copyrightYear,
      techStackJson: JSON.stringify(result.techStack),
      cfRay: result.cfRay,
      findingsJson: JSON.stringify(result.findings),
      recommendationsJson: JSON.stringify(result.recommendations),
      pitch,
    },
  });

  if (leadId) {
    // Keep the lead's own website field in sync with whatever URL was just analyzed,
    // then run it through the same deterministic scoring pipeline as bulk enrichment
    // so a single analyzer run and a bulk "Enrich" click always agree.
    await db.lead.update({ where: { id: leadId }, data: { website: url.trim() } });
    await enrichLeadAction(leadId);

    await db.activity.create({
      data: {
        organizationId: session.user.organizationId,
        type: "website_audited",
        description: `Website audit run — scored ${result.overallScore}/100`,
        leadId,
        userId: session.user.id,
      },
    });
    revalidatePath(`/dashboard/leads/${leadId}`);
  }

  if (clientId) {
    revalidatePath(`/dashboard/clients/${clientId}`);
  }

  revalidatePath("/dashboard/website-analyzer");
  redirect(`/dashboard/website-analyzer/${audit.id}`);
}
