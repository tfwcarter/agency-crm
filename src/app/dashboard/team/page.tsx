import { UserPlus, Trophy, Megaphone } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { inviteTeamMemberAction, updateTeamMemberAction, removeTeamMemberAction, postAnnouncementAction } from "@/lib/actions/team";
import { PageHeader, Card, Input, Select, Textarea, Button } from "@/components/ui/primitives";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

export default async function TeamPage() {
  const session = await requireSession();

  const [team, announcements] = await Promise.all([
    db.user.findMany({
      where: { organizationId: session.user.organizationId },
      include: { ownedDeals: true, timeEntries: true },
      orderBy: { createdAt: "asc" },
    }),
    db.announcement.findMany({
      where: { organizationId: session.user.organizationId },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const withStats = team
    .map((u) => {
      const won = u.ownedDeals.filter((d) => d.status === "won");
      const wonValue = won.reduce((s, d) => s + d.value, 0);
      const hours = u.timeEntries.reduce((s, t) => s + t.hours, 0);
      return { ...u, wonCount: won.length, wonValue, commission: wonValue * (u.commissionRate / 100), hours };
    })
    .sort((a, b) => b.wonValue - a.wonValue);

  return (
    <div>
      <PageHeader title="Team" description={`${team.length} team members`} />

      <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-subtle">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Deals Won</th>
                  <th className="px-4 py-3 font-medium">Commission</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {withStats.map((u, i) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {i === 0 && u.wonValue > 0 && <Trophy size={13} className="text-warning" />}
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 text-[10px] font-semibold text-brand">
                          {initials(u.name || u.email)}
                        </span>
                        <div>
                          <p className="font-medium text-fg">{u.name || u.email}</p>
                          {u.jobTitle && <p className="text-xs text-fg-muted">{u.jobTitle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <form action={updateTeamMemberAction.bind(null, u.id)} className="flex items-center gap-1.5">
                        <input type="hidden" name="jobTitle" value={u.jobTitle ?? ""} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="rounded-md border border-border bg-bg px-1.5 py-1 text-xs text-fg outline-none focus:border-brand"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                        <input
                          type="number"
                          name="commissionRate"
                          defaultValue={u.commissionRate}
                          min="0"
                          max="100"
                          title="Commission %"
                          className="w-14 rounded-md border border-border bg-bg px-1.5 py-1 text-xs text-fg outline-none focus:border-brand"
                        />
                        <button type="submit" className="text-xs text-brand hover:text-brand-hover">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {u.wonCount} · {formatCurrency(u.wonValue)}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{formatCurrency(u.commission)}</td>
                    <td className="px-4 py-3 text-fg-muted">{u.hours}h</td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== session.user.id && (
                        <form action={removeTeamMemberAction.bind(null, u.id)}>
                          <button type="submit" className="text-xs text-fg-subtle hover:text-danger">
                            Remove
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <Megaphone size={12} /> Announcements
            </h3>
            <form action={postAnnouncementAction} className="mb-4 space-y-2">
              <Input name="title" placeholder="Title" required />
              <Textarea name="body" placeholder="Share an update with the team…" rows={2} required />
              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  Post
                </Button>
              </div>
            </form>
            <div className="space-y-3">
              {announcements.length === 0 && <p className="text-sm text-fg-subtle">No announcements yet.</p>}
              {announcements.map((a) => (
                <div key={a.id} className="rounded-lg bg-bg px-3 py-2.5">
                  <p className="text-sm font-medium text-fg">{a.title}</p>
                  <p className="mt-0.5 text-sm text-fg-muted">{a.body}</p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    {a.author?.name || a.author?.email} · {formatDate(a.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <UserPlus size={12} /> Invite team member
            </h3>
            <form action={inviteTeamMemberAction} className="space-y-2">
              <Input name="name" placeholder="Full name" required />
              <Input name="email" type="email" placeholder="Email" required />
              <Input name="password" type="password" placeholder="Temporary password" required minLength={8} />
              <Input name="jobTitle" placeholder="Job title (optional)" />
              <div className="grid grid-cols-2 gap-2">
                <Select name="role" defaultValue="member">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </Select>
                <Input name="commissionRate" type="number" min="0" max="100" placeholder="Commission %" />
              </div>
              <Button type="submit" className="w-full">
                Add to team
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
