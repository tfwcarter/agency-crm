"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function addQuickNoteAction(formData: FormData) {
  const session = await requireSession();
  const body = formData.get("body") as string;
  if (!body?.trim()) return;

  await db.note.create({
    data: { organizationId: session.user.organizationId, body, authorId: session.user.id },
  });

  revalidatePath("/dashboard");
}

export async function deleteQuickNoteAction(noteId: string) {
  const session = await requireSession();
  await db.note.delete({ where: { id: noteId, organizationId: session.user.organizationId } });
  revalidatePath("/dashboard");
}
