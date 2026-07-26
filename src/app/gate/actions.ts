"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, checkGatePassword, gateToken } from "@/lib/site-gate";

function safeNext(raw: string | null): string {
  // Only allow same-site paths, never an open redirect.
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export async function unlockGateAction(formData: FormData) {
  const password = (formData.get("password") as string) ?? "";
  const next = safeNext(formData.get("next") as string | null);

  if (!(await checkGatePassword(password))) {
    const params = new URLSearchParams({ error: "1" });
    if (next !== "/") params.set("next", next);
    redirect(`/gate?${params.toString()}`);
  }

  const jar = await cookies();
  jar.set(GATE_COOKIE, await gateToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect(next);
}
