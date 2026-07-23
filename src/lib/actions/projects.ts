"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

const projectSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1, "Project name is required"),
  type: z.string().min(1),
  budget: z.coerce.number().min(0).default(0),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function createProjectAction(formData: FormData) {
  const session = await requireSession();
  const data = projectSchema.parse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    type: formData.get("type"),
    budget: formData.get("budget") || 0,
    startDate: formData.get("startDate") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });

  const project = await db.project.create({
    data: {
      organizationId: session.user.organizationId,
      clientId: data.clientId,
      name: data.name,
      type: data.type,
      budget: data.budget,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "project_created",
      description: `Project "${project.name}" created`,
      clientId: data.clientId,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard/projects");
  redirect(`/dashboard/projects/${project.id}`);
}

export async function updateProjectStatusAction(projectId: string, status: string) {
  const session = await requireSession();
  await db.project.update({
    where: { id: projectId, organizationId: session.user.organizationId },
    data: { status },
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/projects");
}

export async function updateProjectProgressAction(projectId: string, formData: FormData) {
  const session = await requireSession();
  const progress = Number(formData.get("progress")) || 0;
  await db.project.update({
    where: { id: projectId, organizationId: session.user.organizationId },
    data: { progress: Math.max(0, Math.min(100, progress)) },
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addProjectTaskAction(projectId: string, formData: FormData) {
  await requireSession();
  const title = formData.get("title");
  if (typeof title !== "string" || !title.trim()) return;

  const count = await db.projectTask.count({ where: { projectId } });
  await db.projectTask.create({
    data: { projectId, title, order: count },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function moveProjectTaskAction(taskId: string, status: string) {
  const task = await db.projectTask.update({ where: { id: taskId }, data: { status }, include: { project: true } });
  revalidatePath(`/dashboard/projects/${task.projectId}`);
}

export async function addProjectCommentAction(projectId: string, formData: FormData) {
  const session = await requireSession();
  const body = formData.get("body");
  if (typeof body !== "string" || !body.trim()) return;
  const isClientVisible = formData.get("isClientVisible") === "on";

  await db.projectComment.create({
    data: {
      projectId,
      body,
      isClientVisible,
      authorId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function logProjectTimeAction(projectId: string, formData: FormData) {
  const session = await requireSession();
  const hours = Number(formData.get("hours"));
  if (!hours || hours <= 0) return;

  const project = await db.project.findFirst({ where: { id: projectId, organizationId: session.user.organizationId } });
  if (!project) return;

  await db.timeEntry.create({
    data: {
      organizationId: session.user.organizationId,
      userId: session.user.id,
      projectId,
      clientId: project.clientId,
      hours,
      description: (formData.get("description") as string) || null,
    },
  });

  await db.project.update({
    where: { id: projectId },
    data: { hoursLogged: { increment: hours } },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}
