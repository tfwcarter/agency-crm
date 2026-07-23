import Link from "next/link";
import { Users, DollarSign, TrendingUp, Briefcase, Plus, Trophy, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, HoverCard, Button, Badge } from "@/components/ui/primitives";
import { CountUp } from "@/components/ui/count-up";
import { Sparkline } from "@/components/dashboard/sparkline";
import { AiInsightsCard } from "@/components/dashboard/ai-insights-card";
import { TodaysFocus } from "@/components/dashboard/todays-focus";
import { PipelineSnapshot } from "@/components/dashboard/pipeline-snapshot";
import { MiniCalendar } from "@/components/dashboard/mini-calendar";
import { QuickNotes } from "@/components/dashboard/quick-notes";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

function dayBucket(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function last14Days() {
  const days: number[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.getTime());
  }
  return days;
}

export default async function DashboardPage() {
  const session = await requireSession();
  const orgId = session.user.organizationId;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    clients,
    stages,
    activities,
    users,
    leads,
    projects,
    paidInvoices,
    dueInvoices,
    recentInvoices,
    appointmentsWeek,
    tasksToday,
    quickNoteRows,
  ] = await Promise.all([
    db.client.findMany({ where: { organizationId: orgId } }),
    db.pipelineStage.findMany({ where: { organizationId: orgId }, orderBy: { order: "asc" }, include: { deals: true } }),
    db.activity.findMany({ where: { organizationId: orgId }, include: { user: true, client: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.user.findMany({ where: { organizationId: orgId }, include: { ownedDeals: true } }),
    db.lead.findMany({ where: { organizationId: orgId } }),
    db.project.findMany({ where: { organizationId: orgId } }),
    db.invoice.findMany({ where: { organizationId: orgId, status: "paid" } }),
    db.invoice.findMany({
      where: { organizationId: orgId, status: { in: ["sent", "viewed"] }, dueDate: { gte: startOfToday, lt: endOfToday } },
      include: { client: true },
    }),
    db.invoice.findMany({
      where: { organizationId: orgId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.appointment.findMany({
      where: { organizationId: orgId, startAt: { gte: startOfToday, lt: new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000) } },
    }),
    db.projectTask.findMany({
      where: { project: { organizationId: orgId }, status: { not: "done" }, dueDate: { gte: startOfToday, lt: endOfToday } },
      include: { project: true },
    }),
    db.note.findMany({ where: { organizationId: orgId, clientId: null, dealId: null, leadId: null }, orderBy: { createdAt: "desc" } }),
  ]);

  const allDeals = stages.flatMap((s) => s.deals);
  const activeClients = clients.filter((c) => c.status === "active");
  const activeProjects = projects.filter((p) => p.status === "active");

  const dealsToday = allDeals.filter((d) => d.expectedCloseDate && d.expectedCloseDate >= startOfToday && d.expectedCloseDate < endOfToday && d.status === "open");
  const dealsTodayWithClient = await db.deal.findMany({ where: { id: { in: dealsToday.map((d) => d.id) } }, include: { client: true } });

  // KPI: Monthly revenue (paid invoices, collected this month vs last month)
  const revenueThisMonth = paidInvoices.filter((i) => i.paidAt && i.paidAt >= startOfMonth).reduce((s, i) => s + i.total, 0);
  const revenueLastMonth = paidInvoices
    .filter((i) => i.paidAt && i.paidAt >= startOfLastMonth && i.paidAt < startOfMonth)
    .reduce((s, i) => s + i.total, 0);
  const revenueTrend = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : revenueThisMonth > 0 ? 100 : 0;

  // KPI: New leads this month vs last month
  const leadsThisMonth = leads.filter((l) => l.createdAt >= startOfMonth).length;
  const leadsLastMonth = leads.filter((l) => l.createdAt >= startOfLastMonth && l.createdAt < startOfMonth).length;
  const leadsTrend = leadsLastMonth > 0 ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100 : leadsThisMonth > 0 ? 100 : 0;

  // KPI: Active clients — new adds in last 30 days as growth signal
  const newActiveClients = activeClients.filter((c) => c.createdAt >= thirtyDaysAgo).length;
  const clientsTrend = activeClients.length - newActiveClients > 0 ? (newActiveClients / (activeClients.length - newActiveClients)) * 100 : newActiveClients > 0 ? 100 : 0;

  // KPI: Jobs in progress — new active projects in last 30 days as growth signal
  const newActiveProjects = activeProjects.filter((p) => p.createdAt >= thirtyDaysAgo).length;
  const projectsTrend = activeProjects.length - newActiveProjects > 0 ? (newActiveProjects / (activeProjects.length - newActiveProjects)) * 100 : newActiveProjects > 0 ? 100 : 0;

  // Sparklines (last 14 days, real derived series)
  const days = last14Days();
  const revenueSeries = days.map((day) => paidInvoices.filter((i) => i.paidAt && dayBucket(i.paidAt) === day).reduce((s, i) => s + i.total, 0));
  const leadsSeries = days.map((day) => leads.filter((l) => dayBucket(l.createdAt) === day).length);
  const clientsSeries = days.map((day) => clients.filter((c) => c.createdAt.getTime() <= day + 86400000).length);
  const projectsSeries = days.map((day) => projects.filter((p) => p.status === "active" && p.createdAt.getTime() <= day + 86400000).length);

  // Quick summary sentence (real data, no AI required)
  const newLeadsYesterday = leads.filter((l) => l.createdAt >= yesterday).length;
  const dealsWonYesterday = allDeals.filter((d) => d.status === "won" && d.closedAt && d.closedAt >= yesterday);
  const dealsWonYesterdayValue = dealsWonYesterday.reduce((s, d) => s + d.value, 0);
  const proposalStage = stages.find((s) => /proposal/i.test(s.name));
  const proposalsAwaiting = proposalStage?.deals.length ?? 0;

  const summaryClauses: string[] = [];
  if (newLeadsYesterday > 0) summaryClauses.push(`gained ${newLeadsYesterday} new lead${newLeadsYesterday === 1 ? "" : "s"} yesterday`);
  if (dealsWonYesterday.length > 0) summaryClauses.push(`closed ${dealsWonYesterday.length} deal${dealsWonYesterday.length === 1 ? "" : "s"} worth ${formatCurrency(dealsWonYesterdayValue)}`);
  const summaryLine =
    summaryClauses.length > 0
      ? `You ${summaryClauses.join(", ")}${proposalsAwaiting > 0 ? `, and have ${proposalsAwaiting} proposal${proposalsAwaiting === 1 ? "" : "s"} awaiting approval.` : "."}`
      : proposalsAwaiting > 0
        ? `You have ${proposalsAwaiting} proposal${proposalsAwaiting === 1 ? "" : "s"} awaiting approval.`
        : "No new activity in the last 24 hours — a great time to reach out to a lead.";

  const leaderboard = users
    .map((u) => ({ name: u.name || u.email, won: u.ownedDeals.filter((d) => d.status === "won") }))
    .map((u) => ({ name: u.name, count: u.won.length, value: u.won.reduce((s, d) => s + d.value, 0) }))
    .filter((u) => u.count > 0)
    .sort((a, b) => b.value - a.value);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (session.user.name || "").split(" ")[0] || "there";

  return (
    <div className="stagger px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {greeting}, <span className="gradient-text">{firstName}</span>.
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {formatDate(now)} · {summaryLine}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} label="Monthly Revenue" value={revenueThisMonth} currency trend={revenueTrend} series={revenueSeries} color="#2f6feb" />
        <Kpi icon={TrendingUp} label="New Leads" value={leadsThisMonth} trend={leadsTrend} series={leadsSeries} color="#10b981" />
        <Kpi icon={Users} label="Active Clients" value={activeClients.length} trend={clientsTrend} series={clientsSeries} color="#38bdf8" />
        <Kpi icon={Briefcase} label="Jobs In Progress" value={activeProjects.length} trend={projectsTrend} series={projectsSeries} color="#f59e0b" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TodaysFocus
          appointments={appointmentsWeek.filter((a) => a.startAt >= startOfToday && a.startAt < endOfToday && a.status === "scheduled")}
          tasks={tasksToday}
          invoices={dueInvoices}
          deals={dealsTodayWithClient}
        />
        <AiInsightsCard />
      </div>

      <div className="mb-5">
        <PipelineSnapshot stages={stages} totalDeals={allDeals.length} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">This Week</h3>
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm">
                View calendar →
              </Button>
            </Link>
          </div>
          <MiniCalendar appointments={appointmentsWeek} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Team Activity</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-fg-subtle">No activity yet — create a client or deal to get started.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-2.5 text-sm">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <div className="min-w-0">
                    <p className="text-fg">{a.description}</p>
                    <p className="text-xs text-fg-subtle">
                      {a.user?.name || a.user?.email || "System"} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
            <Link href="/dashboard/clients/new">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Plus size={13} /> Add client
              </Button>
            </Link>
            <Link href="/dashboard/pipeline/new">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Plus size={13} /> Add deal
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <Receipt size={12} /> Recent Invoices
            </h3>
            <Link href="/dashboard/invoices" className="text-xs text-brand hover:text-brand-hover">
              All →
            </Link>
          </div>
          <div className="space-y-2">
            {recentInvoices.length === 0 && <p className="text-xs text-fg-subtle">No invoices yet.</p>}
            {recentInvoices.map((inv) => (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="flex items-center justify-between text-xs hover:text-brand">
                <span className="truncate text-fg">{inv.number}</span>
                <span className="text-fg-muted">{formatCurrency(inv.total)}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <Users size={12} /> Recent Clients
            </h3>
            <Link href="/dashboard/clients" className="text-xs text-brand hover:text-brand-hover">
              All →
            </Link>
          </div>
          <div className="space-y-2">
            {clients.length === 0 && <p className="text-xs text-fg-subtle">No clients yet.</p>}
            {clients.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="flex items-center gap-2 text-xs hover:text-brand">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[9px] font-semibold text-brand">
                  {initials(c.businessName)}
                </span>
                <span className="truncate text-fg">{c.businessName}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            <Trophy size={12} /> Leaderboard
          </h3>
          <div className="space-y-2">
            {leaderboard.length === 0 && <p className="text-xs text-fg-subtle">No deals won yet.</p>}
            {leaderboard.slice(0, 4).map((u, i) => (
              <div key={u.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-fg">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand/15 text-[9px] font-semibold text-brand">{i + 1}</span>
                  {u.name}
                </span>
                <span className="text-fg-muted">{formatCurrency(u.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <QuickNotes notes={quickNoteRows} />
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  currency = false,
  trend,
  series,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  currency?: boolean;
  trend: number;
  series: number[];
  color: string;
}) {
  const positive = trend >= 0;
  return (
    <HoverCard className="group p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
          style={{ background: `${color}1a`, color }}
        >
          <Icon size={15} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <CountUp value={value} currency={currency} className="text-2xl font-semibold tracking-tight text-fg" />
          <Badge tone={positive ? "success" : "danger"} className="mt-1">
            {positive ? "▲" : "▼"} {Math.abs(trend).toFixed(0)}%
          </Badge>
        </div>
        <div className="w-20">
          <Sparkline data={series} color={color} />
        </div>
      </div>
    </HoverCard>
  );
}
