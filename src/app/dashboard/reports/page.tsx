import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { RevenueByMonthChart, StageFunnelChart } from "@/components/reports/report-charts";
import { AiSummaryForm } from "@/components/reports/ai-summary-form";
import { PageHeader, Card, Badge } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await requireSession();
  const orgId = session.user.organizationId;

  const [clients, leads, deals, stages, paidInvoices] = await Promise.all([
    db.client.findMany({ where: { organizationId: orgId } }),
    db.lead.findMany({ where: { organizationId: orgId } }),
    db.deal.findMany({ where: { organizationId: orgId } }),
    db.pipelineStage.findMany({ where: { organizationId: orgId }, orderBy: { order: "asc" }, include: { deals: true } }),
    db.invoice.findMany({ where: { organizationId: orgId, status: "paid" } }),
  ]);

  const activeClients = clients.filter((c) => c.status === "active");
  const mrr = activeClients.reduce((s, c) => s + c.monthlySpend, 0);
  const churned = clients.filter((c) => c.status === "churned").length;

  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");
  const winRate = wonDeals.length + lostDeals.length > 0 ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 : 0;

  const convertedLeads = leads.filter((l) => l.status === "converted").length;
  const leadConversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;

  const now = new Date();
  const monthLabels: string[] = [];
  const revenueByMonth: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    monthLabels.push(label);
    const revenue = paidInvoices
      .filter((inv) => inv.paidAt && inv.paidAt.getFullYear() === d.getFullYear() && inv.paidAt.getMonth() === d.getMonth())
      .reduce((s, inv) => s + inv.total, 0);
    revenueByMonth.push({ month: label, revenue });
  }

  const stageFunnel = stages.map((s) => ({ name: s.name, count: s.deals.length, color: s.color }));

  const metrics = `
Active clients: ${activeClients.length} (${churned} churned)
MRR: ${formatCurrency(mrr)}
Total leads: ${leads.length}, converted: ${convertedLeads} (${leadConversionRate.toFixed(0)}% conversion)
Deals won: ${wonDeals.length}, lost: ${lostDeals.length} (${winRate.toFixed(0)}% win rate)
Revenue collected last 6 months: ${revenueByMonth.map((m) => `${m.month} $${m.revenue}`).join(", ")}
`.trim();

  return (
    <div>
      <PageHeader title="Marketing Reports" description="Real performance data pulled live from your CRM" />

      <div className="px-6 py-5">
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="MRR" value={formatCurrency(mrr)} />
          <Stat label="Win Rate" value={`${winRate.toFixed(0)}%`} />
          <Stat label="Lead Conversion" value={`${leadConversionRate.toFixed(0)}%`} />
          <Stat label="Active Clients" value={String(activeClients.length)} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Revenue Collected (6 mo)</h3>
            <RevenueByMonthChart data={revenueByMonth} />
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Pipeline Funnel</h3>
            <StageFunnelChart data={stageFunnel} />
          </Card>
        </div>

        <Card className="mt-5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">AI Monthly Summary</h3>
            <Badge tone="default">based on live data above</Badge>
          </div>
          <AiSummaryForm metrics={metrics} />
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-2xl font-semibold text-fg">{value}</p>
      <p className="mt-0.5 text-xs text-fg-subtle">{label}</p>
    </Card>
  );
}
