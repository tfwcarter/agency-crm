import Link from "next/link";
import { PhoneCall, Calendar, CheckSquare, Receipt, FileSignature } from "lucide-react";
import { updateAppointmentStatusAction } from "@/lib/actions/appointments";
import { moveProjectTaskAction } from "@/lib/actions/projects";
import { updateInvoiceStatusAction } from "@/lib/actions/invoices";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";

type Appt = { id: string; title: string; startAt: Date; type: string };
type Task = { id: string; title: string; project: { id: string; name: string } };
type Invoice = { id: string; number: string; total: number; client: { businessName: string } };
type Deal = { id: string; title: string; value: number; client: { businessName: string } | null };

export function TodaysFocus({
  appointments,
  tasks,
  invoices,
  deals,
}: {
  appointments: Appt[];
  tasks: Task[];
  invoices: Invoice[];
  deals: Deal[];
}) {
  const total = appointments.length + tasks.length + invoices.length + deals.length;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Today&apos;s Focus</h3>
        <Badge tone={total === 0 ? "success" : "brand"}>{total === 0 ? "All clear" : `${total} items`}</Badge>
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-sm text-fg-subtle">Nothing due today — a great time to prospect.</p>
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
              <div className="flex items-center gap-2.5 text-sm text-fg">
                <PhoneCall size={14} className="shrink-0 text-brand" />
                <div>
                  <p>{a.title}</p>
                  <p className="text-xs text-fg-subtle">{new Date(a.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                </div>
              </div>
              <form action={updateAppointmentStatusAction.bind(null, a.id, "completed")}>
                <Button type="submit" size="sm" variant="secondary">
                  Complete
                </Button>
              </form>
            </div>
          ))}

          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
              <div className="flex items-center gap-2.5 text-sm text-fg">
                <CheckSquare size={14} className="shrink-0 text-accent" />
                <div>
                  <p>{t.title}</p>
                  <Link href={`/dashboard/projects/${t.project.id}`} className="text-xs text-fg-subtle hover:text-brand">
                    {t.project.name}
                  </Link>
                </div>
              </div>
              <form action={moveProjectTaskAction.bind(null, t.id, "done")}>
                <Button type="submit" size="sm" variant="secondary">
                  Done
                </Button>
              </form>
            </div>
          ))}

          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
              <div className="flex items-center gap-2.5 text-sm text-fg">
                <Receipt size={14} className="shrink-0 text-warning" />
                <div>
                  <p>
                    {inv.number} · {formatCurrency(inv.total)}
                  </p>
                  <p className="text-xs text-fg-subtle">{inv.client.businessName} — due today</p>
                </div>
              </div>
              <form action={updateInvoiceStatusAction.bind(null, inv.id, "paid")}>
                <Button type="submit" size="sm" variant="secondary">
                  Mark paid
                </Button>
              </form>
            </div>
          ))}

          {deals.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
              <div className="flex items-center gap-2.5 text-sm text-fg">
                <FileSignature size={14} className="shrink-0 text-fg-muted" />
                <div>
                  <p>{d.title}</p>
                  <p className="text-xs text-fg-subtle">
                    {d.client?.businessName ?? "No client"} · {formatCurrency(d.value)} · expected to close today
                  </p>
                </div>
              </div>
              <Link href="/dashboard/pipeline">
                <Button size="sm" variant="secondary">
                  <Calendar size={12} /> View
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
