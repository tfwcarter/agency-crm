"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function updateOrgNameAction(formData: FormData) {
  const session = await requireSession();
  const name = formData.get("name") as string;
  if (!name?.trim()) return;

  await db.organization.update({ where: { id: session.user.organizationId }, data: { name } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

const API_KEY_FIELDS = ["groqApiKey", "anthropicApiKey", "pagespeedApiKey", "stripeSecretKey", "googlePlacesApiKey", "tomtomApiKey"] as const;
export type ApiKeyField = (typeof API_KEY_FIELDS)[number];

function assertApiKeyField(field: string): asserts field is ApiKeyField {
  if (!API_KEY_FIELDS.includes(field as ApiKeyField)) {
    throw new Error(`Unknown API key field: ${field}`);
  }
}

// Pasting a key here saves it straight to the database and takes effect on the very
// next request — no .env editing, no server restart. Leaving the input blank on submit
// keeps whatever key was already saved (use the explicit "Remove" action to clear it).
export async function saveApiKeyAction(field: string, formData: FormData) {
  assertApiKeyField(field);
  const session = await requireSession();
  const value = (formData.get("value") as string)?.trim();
  if (!value) return;

  await db.organization.update({ where: { id: session.user.organizationId }, data: { [field]: value } });
  revalidatePath("/dashboard/settings");
}

export async function clearApiKeyAction(field: string) {
  assertApiKeyField(field);
  const session = await requireSession();
  await db.organization.update({ where: { id: session.user.organizationId }, data: { [field]: null } });
  revalidatePath("/dashboard/settings");
}

export async function createStageAction(formData: FormData) {
  const session = await requireSession();
  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6366f1";
  if (!name?.trim()) return;

  const count = await db.pipelineStage.count({ where: { organizationId: session.user.organizationId } });
  await db.pipelineStage.create({
    data: { organizationId: session.user.organizationId, name, color, order: count },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/pipeline");
}

export async function updateStageAction(stageId: string, formData: FormData) {
  const session = await requireSession();
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;

  await db.pipelineStage.update({
    where: { id: stageId, organizationId: session.user.organizationId },
    data: { name, color },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/pipeline");
}

export async function deleteStageAction(stageId: string) {
  const session = await requireSession();
  const dealCount = await db.deal.count({ where: { stageId } });
  if (dealCount > 0) redirect("/dashboard/settings?error=stage_has_deals");

  await db.pipelineStage.delete({ where: { id: stageId, organizationId: session.user.organizationId } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/pipeline");
}

export async function reorderStageAction(stageId: string, direction: "up" | "down") {
  const session = await requireSession();
  const stages = await db.pipelineStage.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { order: "asc" },
  });

  const index = stages.findIndex((s) => s.id === stageId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= stages.length) return;

  const a = stages[index];
  const b = stages[swapWith];

  await db.$transaction([
    db.pipelineStage.update({ where: { id: a.id }, data: { order: b.order } }),
    db.pipelineStage.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/pipeline");
}
