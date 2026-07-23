import Link from "next/link";
import { Plus, CalendarClock, Video, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { updateAppointmentStatusAction } from "@/lib/actions/appointments";
import { PageHeader, Card, Badge, Button } from "@/components/ui/primitives";

const TYPE_LABEL: Record<string, string> = {
  discovery_call: "Discovery Call",
  strategy_session: "Strategy Session",
  sales_call: "Sales Call",
  onboarding: "Onboarding",
  client_review: "Client Review",
};

const STATUS_TONE = { scheduled: "brand", completed: "success", cancelled: "danger", no_show: "warning" } as const;

export default async function AppointmentsPage() {
  const session = await requireSession();

  const appointments = await db.appointment.findMany({
    where: { organizationId: session.user.organizationId },
    include: { client: true, lead: true, assignedTo: true },
    orderBy: { startAt: "asc" },
  });

  const now = new Date();
  const upcoming = appointments.filter((a) => a.startAt >= now && a.status === "scheduled");
  const past = appointments.filter((a) => a.startAt < now || a.status !== "scheduled");

  return (
    <div>
      <PageHeader
        title="Appointments"
        description={`${upcoming.length} upcoming`}
        action={
          <Link href="/dashboard/appointments/new">
            <Button>
              <Plus size={15} /> New Appointment
            </Button>
          </Link>
        }
      />

      <div className="px-6 py-5">
        {appointments.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarClock size={28} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No appointments yet</p>
            <p className="mt-1 text-sm text-fg-muted">Schedule your first discovery call or strategy session.</p>
            <Link href="/dashboard/appointments/new" className="mt-4">
              <Button>
                <Plus size={15} /> New Appointment
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Upcoming</h3>
                <div className="space-y-2">
                  {upcoming.map((a) => (
                    <ApptRow key={a.id} appt={a} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Past / Other</h3>
                <div className="space-y-2">
                  {past.map((a) => (
                    <ApptRow key={a.id} appt={a} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type ApptWithRelations = Awaited<ReturnType<typeof db.appointment.findMany>>[number] & {
  client: { id: string; businessName: string } | null;
  lead: { id: string; businessName: string } | null;
  assignedTo: { name: string | null; email: string } | null;
};

function ApptRow({ appt }: { appt: ApptWithRelations }) {
  const dateStr = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(appt.startAt);
  return (
    <Card className="flex items-center justify-between p-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-fg">{appt.title}</p>
          <Badge tone="default">{TYPE_LABEL[appt.type] ?? appt.type}</Badge>
        </div>
        <p className="mt-1 text-xs text-fg-muted">
          {dateStr} · {appt.client?.businessName || appt.lead?.businessName || "No contact linked"} ·{" "}
          {appt.assignedTo?.name || appt.assignedTo?.email}
        </p>
        {appt.location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-fg-subtle">
            {appt.location.startsWith("http") ? <Video size={11} /> : <MapPin size={11} />}
            {appt.location}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={STATUS_TONE[appt.status as keyof typeof STATUS_TONE] ?? "default"}>{appt.status.replace("_", " ")}</Badge>
        {appt.status === "scheduled" && (
          <>
            <form action={updateAppointmentStatusAction.bind(null, appt.id, "completed")}>
              <Button type="submit" size="sm" variant="secondary">
                Complete
              </Button>
            </form>
            <form action={updateAppointmentStatusAction.bind(null, appt.id, "cancelled")}>
              <Button type="submit" size="sm" variant="ghost">
                Cancel
              </Button>
            </form>
          </>
        )}
      </div>
    </Card>
  );
}
