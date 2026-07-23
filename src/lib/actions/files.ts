"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function uploadFileAction(formData: FormData) {
  const session = await requireSession();
  const file = formData.get("file") as File | null;
  const clientId = (formData.get("clientId") as string) || null;
  const projectId = (formData.get("projectId") as string) || null;
  const redirectPath = formData.get("redirectPath") as string;

  if (!file || file.size === 0) return;

  await mkdir(UPLOAD_DIR, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  const existingCount = clientId
    ? await db.fileAsset.count({ where: { clientId, name: file.name } })
    : 0;

  await db.fileAsset.create({
    data: {
      organizationId: session.user.organizationId,
      clientId,
      projectId,
      name: file.name,
      path: `/uploads/${storedName}`,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      version: existingCount + 1,
      uploadedById: session.user.id,
    },
  });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/dashboard/files");
}

export async function deleteFileAction(fileId: string, redirectPath: string) {
  const session = await requireSession();
  await db.fileAsset.delete({ where: { id: fileId, organizationId: session.user.organizationId } });
  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/dashboard/files");
}
