import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getOrgApiKeys } from "@/lib/api-keys";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function aiAvailable(organizationId: string): Promise<boolean> {
  const keys = await getOrgApiKeys(organizationId);
  return Boolean(keys.groqApiKey || keys.anthropicApiKey);
}

const AGENCY_SYSTEM_PROMPT = `You are an AI assistant embedded inside a marketing agency's CRM. The agency sells
websites, SEO, Google Ads, Meta Ads, branding, AI automation, social media management, and lead generation to
small and mid-sized businesses. Write like a sharp, experienced account executive — confident, specific, never
generic corporate filler. Ground every claim in the real data provided; never invent statistics, testimonials,
or client names that weren't given to you.`;

async function generateWithGroq(apiKey: string, params: { system: string; prompt: string; maxTokens: number }): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: params.maxTokens,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.prompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed: ${res.status} ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateWithAnthropic(apiKey: string, params: { system: string; prompt: string; maxTokens: number }): Promise<string> {
  const client = new Anthropic({ apiKey });
  const stream = await client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: params.maxTokens,
    thinking: { type: "adaptive" },
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });

  const response = await stream.finalMessage();
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

/**
 * Groq (free, no cost) is tried first since it requires no paid account. An Anthropic
 * key — pasted in Settings or set as ANTHROPIC_API_KEY — is used instead if present
 * and Groq isn't. Keys pasted into Settings (stored per-organization) always take
 * priority over env vars — see getOrgApiKeys.
 */
export async function generateAiText(params: {
  organizationId: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const keys = await getOrgApiKeys(params.organizationId);
  const args = { system: params.system ?? AGENCY_SYSTEM_PROMPT, prompt: params.prompt, maxTokens: params.maxTokens ?? 600 };

  if (keys.groqApiKey) {
    return generateWithGroq(keys.groqApiKey, args);
  }
  if (keys.anthropicApiKey) {
    return generateWithAnthropic(keys.anthropicApiKey, args);
  }
  throw new Error("No AI provider configured");
}

export async function logAiGeneration(
  organizationId: string,
  kind: string,
  context: string | null,
  prompt: string,
  output: string
) {
  await db.aiGeneration.create({
    data: { organizationId, kind, context, prompt, output },
  });
}
