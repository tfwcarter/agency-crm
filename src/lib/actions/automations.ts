"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function createAutomationAction(formData: FormData) {
  const session = await requireSession();

  const name = formData.get("name") as string;
  const trigger = formData.get("trigger") as string;
  const actionType = formData.get("actionType") as string;

  const actionConfig: Record<string, string> = {};
  if (actionType === "log_activity") actionConfig.message = (formData.get("message") as string) || "";
  if (actionType === "add_note") actionConfig.note = (formData.get("note") as string) || "";
  if (actionType === "create_invoice_draft") {
    actionConfig.amount = (formData.get("amount") as string) || "0";
    actionConfig.description = (formData.get("description") as string) || "";
  }
  if (actionType === "flag_client_status") actionConfig.status = (formData.get("status") as string) || "active";

  await db.automationRule.create({
    data: {
      organizationId: session.user.organizationId,
      name,
      trigger,
      actionType,
      actionConfig: JSON.stringify(actionConfig),
    },
  });

  revalidatePath("/dashboard/automations");
}

export async function toggleAutomationAction(id: string, enabled: boolean) {
  const session = await requireSession();
  await db.automationRule.update({
    where: { id, organizationId: session.user.organizationId },
    data: { enabled },
  });
  revalidatePath("/dashboard/automations");
}

export async function deleteAutomationAction(id: string) {
  const session = await requireSession();
  await db.automationRule.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath("/dashboard/automations");
}
