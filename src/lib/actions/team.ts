"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

const inviteSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["owner", "admin", "member"]),
  jobTitle: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100).default(0),
});

export async function inviteTeamMemberAction(formData: FormData) {
  const session = await requireSession();
  const parsed = inviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    jobTitle: formData.get("jobTitle") || undefined,
    commissionRate: formData.get("commissionRate") || 0,
  });
  if (!parsed.success) return;

  const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.user.create({
    data: {
      organizationId: session.user.organizationId,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role,
      jobTitle: parsed.data.jobTitle,
      commissionRate: parsed.data.commissionRate,
    },
  });

  revalidatePath("/dashboard/team");
}

export async function updateTeamMemberAction(userId: string, formData: FormData) {
  const session = await requireSession();
  const role = formData.get("role") as string;
  const commissionRate = Number(formData.get("commissionRate")) || 0;
  const jobTitle = (formData.get("jobTitle") as string) || null;

  await db.user.update({
    where: { id: userId, organizationId: session.user.organizationId },
    data: { role, commissionRate, jobTitle },
  });

  revalidatePath("/dashboard/team");
}

export async function removeTeamMemberAction(userId: string) {
  const session = await requireSession();
  if (userId === session.user.id) return;
  await db.user.delete({ where: { id: userId, organizationId: session.user.organizationId } });
  revalidatePath("/dashboard/team");
}

export async function postAnnouncementAction(formData: FormData) {
  const session = await requireSession();
  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  if (!title?.trim() || !body?.trim()) return;

  await db.announcement.create({
    data: { organizationId: session.user.organizationId, title, body, authorId: session.user.id },
  });

  revalidatePath("/dashboard/team");
}
