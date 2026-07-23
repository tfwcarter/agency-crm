"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put, del } from "@vercel/blob";
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

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Vercel's filesystem is read-only at runtime, so uploads go to Blob storage
  // there (BLOB_READ_WRITE_TOKEN is auto-injected once a Blob store is attached
  // to the project). Local dev without that token falls back to public/uploads.
  let storedPath: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(storedName, buffer, { access: "public" });
    storedPath = blob.url;
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, storedName), buffer);
    storedPath = `/uploads/${storedName}`;
  }

  const existingCount = clientId
    ? await db.fileAsset.count({ where: { clientId, name: file.name } })
    : 0;

  await db.fileAsset.create({
    data: {
      organizationId: session.user.organizationId,
      clientId,
      projectId,
      name: file.name,
      path: storedPath,
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
  const asset = await db.fileAsset.delete({
    where: { id: fileId, organizationId: session.user.organizationId },
  });

  if (asset.path.startsWith("https://") && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(asset.path).catch(() => {});
  }

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/dashboard/files");
}
