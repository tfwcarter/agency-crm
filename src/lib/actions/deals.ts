"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { runAutomations } from "@/lib/automations";

const dealSchema = z.object({
  title: z.string().min(1, "Title is required"),
  value: z.coerce.number().min(0).default(0),
  stageId: z.string().min(1),
  clientId: z.string().optional(),
  ownerId: z.string().optional(),
  source: z.string().optional(),
  expectedCloseDate: z.string().optional(),
});

export async function createDealAction(formData: FormData) {
  const session = await requireSession();
  const data = dealSchema.parse({
    title: formData.get("title"),
    value: formData.get("value") || 0,
    stageId: formData.get("stageId"),
    clientId: formData.get("clientId") || undefined,
    ownerId: formData.get("ownerId") || undefined,
    source: formData.get("source") || undefined,
    expectedCloseDate: formData.get("expectedCloseDate") || undefined,
  });

  const deal = await db.deal.create({
    data: {
      organizationId: session.user.organizationId,
      title: data.title,
      value: data.value,
      stageId: data.stageId,
      clientId: data.clientId || null,
      ownerId: data.ownerId || session.user.id,
      source: data.source,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "deal_created",
      description: `Deal "${deal.title}" created`,
      dealId: deal.id,
      clientId: deal.clientId,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard/pipeline");
  redirect("/dashboard/pipeline");
}

export async function moveDealStageAction(dealId: string, stageId: string) {
  const session = await requireSession();

  const [deal, stage] = await Promise.all([
    db.deal.findFirst({ where: { id: dealId, organizationId: session.user.organizationId } }),
    db.pipelineStage.findFirst({ where: { id: stageId, organizationId: session.user.organizationId } }),
  ]);
  if (!deal || !stage) return;

  const isWon = stage.name.toLowerCase() === "won";
  const isLost = stage.name.toLowerCase() === "lost";

  await db.deal.update({
    where: { id: dealId },
    data: {
      stageId,
      status: isWon ? "won" : isLost ? "lost" : "open",
      closedAt: isWon || isLost ? new Date() : null,
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: isWon ? "deal_won" : isLost ? "deal_lost" : "deal_stage_changed",
      description: `"${deal.title}" moved to ${stage.name}`,
      dealId,
      clientId: deal.clientId,
      userId: session.user.id,
    },
  });

  await runAutomations(session.user.organizationId, isWon ? "deal_won" : isLost ? "deal_lost" : "deal_stage_changed", {
    clientId: deal.clientId,
    dealId: deal.id,
    entityName: deal.title,
  });

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard");
}

export async function addDealNoteAction(dealId: string, formData: FormData) {
  const session = await requireSession();
  const body = formData.get("body");
  if (typeof body !== "string" || !body.trim()) return;

  const deal = await db.deal.findFirst({ where: { id: dealId, organizationId: session.user.organizationId } });
  if (!deal) return;

  await db.note.create({
    data: {
      organizationId: session.user.organizationId,
      body,
      dealId,
      authorId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/pipeline/deals/${dealId}`);
}
