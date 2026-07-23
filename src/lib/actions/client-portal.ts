"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession, requirePortalSession } from "@/lib/session";
import { signIn, signOut } from "@/auth";

const enableSchema = z.object({
  portalEmail: z.string().email(),
  password: z.string().min(8),
});

export async function enablePortalAction(clientId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = enableSchema.safeParse({
    portalEmail: formData.get("portalEmail"),
    password: formData.get("password"),
  });
  if (!parsed.success) return;

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.client.update({
    where: { id: clientId, organizationId: session.user.organizationId },
    data: {
      portalEmail: parsed.data.portalEmail.toLowerCase(),
      portalPasswordHash: passwordHash,
      portalEnabled: true,
    },
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function disablePortalAction(clientId: string) {
  const session = await requireSession();
  await db.client.update({
    where: { id: clientId, organizationId: session.user.organizationId },
    data: { portalEnabled: false },
  });
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export type PortalLoginState = { error?: string };

export async function portalLoginAction(_prev: PortalLoginState, formData: FormData): Promise<PortalLoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required" };
  }

  try {
    await signIn("portal-credentials", { email, password, redirectTo: "/portal" });
  } catch (err) {
    if (err instanceof Error && err.message.includes("CredentialsSignin")) {
      return { error: "Invalid email or password" };
    }
    throw err;
  }

  return {};
}

export async function portalSignOutAction() {
  await signOut({ redirectTo: "/portal/login" });
}

export async function addPortalCommentAction(projectId: string, formData: FormData) {
  const session = await requirePortalSession();
  const body = formData.get("body") as string;
  if (!body?.trim()) return;

  const isRevisionRequest = formData.get("type") === "revision";

  const project = await db.project.findFirst({ where: { id: projectId, clientId: session.user.id } });
  if (!project) return;

  await db.projectComment.create({
    data: {
      projectId,
      body,
      isClientVisible: true,
      authorIsClient: true,
      isApproval: formData.get("type") === "approval",
      isRevisionRequest,
    },
  });

  revalidatePath(`/portal/projects/${projectId}`);
}
