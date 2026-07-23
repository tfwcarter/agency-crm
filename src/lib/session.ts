import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user || session.user.userType !== "staff") redirect("/login");
  return session;
}

export async function requirePortalSession() {
  const session = await auth();
  if (!session?.user || session.user.userType !== "client") redirect("/portal/login");
  return session;
}

// Owner/admin only — used for org-wide actions like building and assigning call lists.
export async function requireAdminSession() {
  const session = await requireSession();
  if (session.user.role !== "owner" && session.user.role !== "admin") redirect("/dashboard/call-lists");
  return session;
}
