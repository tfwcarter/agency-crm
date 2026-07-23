"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function saveSmartListAction(name: string, filtersJson: string, resultCount: number) {
  const session = await requireSession();
  if (!name.trim()) return;

  await db.smartList.create({
    data: { organizationId: session.user.organizationId, name: name.trim(), filtersJson, resultCount, lastRunAt: new Date() },
  });

  revalidatePath("/dashboard/leads");
}

export async function deleteSmartListAction(id: string) {
  const session = await requireSession();
  await db.smartList.delete({ where: { id, organizationId: session.user.organizationId } });
  revalidatePath("/dashboard/leads");
}

export async function touchSmartListRunAction(id: string, resultCount: number) {
  const session = await requireSession();
  await db.smartList.update({
    where: { id, organizationId: session.user.organizationId },
    data: { lastRunAt: new Date(), resultCount },
  });
}
