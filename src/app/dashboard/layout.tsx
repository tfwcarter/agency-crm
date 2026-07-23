import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPaletteProvider } from "@/components/shell/command-palette-context";
import { CommandPalette } from "@/components/shell/command-palette";
import { WelcomeSplash } from "@/components/shell/welcome-splash";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "staff") redirect("/login");

  const org = await db.organization.findUnique({ where: { id: session.user.organizationId } });
  if (!org) redirect("/login");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (session.user.name || "").split(" ")[0] || "there";

  return (
    <CommandPaletteProvider>
      <WelcomeSplash greeting={greeting} firstName={firstName} orgName={org.name} />
      <div className="relative flex min-h-screen bg-bg">
        {/* subtle drifting aurora behind the whole shell — shows through gaps between cards */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="aurora" style={{ opacity: 0.16 }} />
          <div className="aurora aurora-2" style={{ opacity: 0.1 }} />
        </div>
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <Topbar userName={session.user.name ?? ""} userEmail={session.user.email ?? ""} />
          <main className="scrollbar-thin relative flex-1 overflow-y-auto animate-fade-in">{children}</main>
        </div>
      </div>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}
