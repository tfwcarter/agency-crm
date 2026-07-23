"use server";

import { requireSession } from "@/lib/session";
import { aiAvailable, generateAiText, logAiGeneration } from "@/lib/ai";

export type ReportSummaryState = { output?: string; error?: string };

export async function generateReportSummaryAction(
  _prev: ReportSummaryState,
  formData: FormData
): Promise<ReportSummaryState> {
  const session = await requireSession();
  if (!(await aiAvailable(session.user.organizationId))) {
    return { error: "Add a free AI key in Settings to enable AI report summaries." };
  }

  const metrics = formData.get("metrics") as string;

  const prompt = `Here are this agency's real current metrics:

${metrics}

Write a concise 4-6 sentence monthly performance summary for agency leadership. Call out what's working, what's
lagging, and one concrete recommendation. Plain prose, no markdown headers or bullet lists.`;

  try {
    const output = await generateAiText({ organizationId: session.user.organizationId, prompt, maxTokens: 400 });
    await logAiGeneration(session.user.organizationId, "monthly_report", null, prompt, output);
    return { output };
  } catch {
    return { error: "AI generation failed — check that your key in Settings is valid." };
  }
}
