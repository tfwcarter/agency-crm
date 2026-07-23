import Link from "next/link";
import { auth } from "@/auth";
import { portalSignOutAction } from "@/lib/actions/client-portal";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isClientSession = session?.user?.userType === "client";

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {isClientSession && (
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
          <Link href="/portal" className="flex items-center gap-2 text-sm font-semibold text-fg">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-fg">
              {session.user.name?.[0] ?? "C"}
            </div>
            {session.user.name}
          </Link>
          <form action={portalSignOutAction}>
            <button type="submit" className="text-sm text-fg-muted hover:text-danger">
              Sign out
            </button>
          </form>
        </header>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
