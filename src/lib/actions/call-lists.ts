"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, requireAdminSession } from "@/lib/session";

function getLeadIds(formData: FormData): string[] {
  return Array.from(new Set(formData.getAll("leadIds").map(String).filter(Boolean)));
}

export async function createCallListAction(formData: FormData) {
  const session = await requireAdminSession();

  const name = (formData.get("name") as string)?.trim();
  const forDateRaw = formData.get("forDate") as string;
  const assignedToId = (formData.get("assignedToId") as string) || null;
  const leadIds = getLeadIds(formData);

  if (!name || leadIds.length === 0) {
    redirect(`/dashboard/call-lists/new?error=missing_fields`);
  }

  const callList = await db.callList.create({
    data: {
      organizationId: session.user.organizationId,
      name,
      forDate: forDateRaw ? new Date(forDateRaw) : new Date(),
      createdById: session.user.id,
      assignedToId,
      items: {
        create: leadIds.map((leadId, i) => ({ leadId, order: i })),
      },
    },
  });

  revalidatePath("/dashboard/call-lists");
  redirect(`/dashboard/call-lists/${callList.id}`);
}

export async function addLeadsToCallListAction(callListId: string, formData: FormData) {
  const session = await requireAdminSession();
  const leadIds = getLeadIds(formData);
  if (leadIds.length === 0) return;

  const callList = await db.callList.findFirst({
    where: { id: callListId, organizationId: session.user.organizationId },
    include: { items: true },
  });
  if (!callList) return;

  const existingLeadIds = new Set(callList.items.map((i) => i.leadId));
  const newLeadIds = leadIds.filter((id) => !existingLeadIds.has(id));
  const startOrder = callList.items.reduce((max, i) => Math.max(max, i.order), -1) + 1;

  if (newLeadIds.length > 0) {
    await db.callListItem.createMany({
      data: newLeadIds.map((leadId, i) => ({ callListId, leadId, order: startOrder + i })),
    });
  }

  revalidatePath(`/dashboard/call-lists/${callListId}`);
}

export async function assignCallListAction(callListId: string, formData: FormData) {
  const session = await requireAdminSession();
  const assignedToId = (formData.get("assignedToId") as string) || null;

  await db.callList.update({
    where: { id: callListId, organizationId: session.user.organizationId },
    data: { assignedToId },
  });

  revalidatePath(`/dashboard/call-lists/${callListId}`);
  revalidatePath("/dashboard/call-lists");
}

export async function updateCallListStatusAction(callListId: string, status: string) {
  const session = await requireAdminSession();
  await db.callList.update({
    where: { id: callListId, organizationId: session.user.organizationId },
    data: { status },
  });
  revalidatePath(`/dashboard/call-lists/${callListId}`);
  revalidatePath("/dashboard/call-lists");
}

export async function deleteCallListAction(callListId: string) {
  const session = await requireAdminSession();
  await db.callList.delete({ where: { id: callListId, organizationId: session.user.organizationId } });
  revalidatePath("/dashboard/call-lists");
  redirect("/dashboard/call-lists");
}

const VALID_ITEM_STATUSES = new Set([
  "pending",
  "called",
  "no_answer",
  "voicemail",
  "callback",
  "not_interested",
  "booked",
]);

// Callable by the rep the list is assigned to, or by any owner/admin — not by other reps.
export async function updateCallListItemStatusAction(itemId: string, formData: FormData) {
  const session = await requireSession();
  const status = formData.get("status") as string;
  const outcomeNotes = (formData.get("outcomeNotes") as string) || null;
  if (!VALID_ITEM_STATUSES.has(status)) return;

  const item = await db.callListItem.findFirst({
    where: { id: itemId, callList: { organizationId: session.user.organizationId } },
    include: { callList: true },
  });
  if (!item) return;

  const isAdmin = session.user.role === "owner" || session.user.role === "admin";
  const isAssignee = item.callList.assignedToId === session.user.id;
  if (!isAdmin && !isAssignee) return;

  await db.callListItem.update({
    where: { id: itemId },
    data: {
      status,
      outcomeNotes,
      calledAt: status === "pending" ? null : new Date(),
      calledById: status === "pending" ? null : session.user.id,
    },
  });

  revalidatePath(`/dashboard/call-lists/${item.callListId}`);
  revalidatePath("/dashboard/call-lists");
}

export async function removeCallListItemAction(itemId: string) {
  const session = await requireAdminSession();
  const item = await db.callListItem.findFirst({
    where: { id: itemId, callList: { organizationId: session.user.organizationId } },
  });
  if (!item) return;

  await db.callListItem.delete({ where: { id: itemId } });
  revalidatePath(`/dashboard/call-lists/${item.callListId}`);
}

export async function reorderCallListItemAction(itemId: string, direction: "up" | "down") {
  const session = await requireSession();

  const item = await db.callListItem.findFirst({
    where: { id: itemId, callList: { organizationId: session.user.organizationId } },
    include: { callList: true },
  });
  if (!item) return;

  const isAdmin = session.user.role === "owner" || session.user.role === "admin";
  const isAssignee = item.callList.assignedToId === session.user.id;
  if (!isAdmin && !isAssignee) return;

  const items = await db.callListItem.findMany({
    where: { callListId: item.callListId },
    orderBy: { order: "asc" },
  });

  const index = items.findIndex((i) => i.id === itemId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= items.length) return;

  const a = items[index];
  const b = items[swapWith];

  await db.$transaction([
    db.callListItem.update({ where: { id: a.id }, data: { order: b.order } }),
    db.callListItem.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  revalidatePath(`/dashboard/call-lists/${item.callListId}`);
}
