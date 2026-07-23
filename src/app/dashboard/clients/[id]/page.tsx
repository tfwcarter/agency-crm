import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Globe,
  MapPin,
  ThumbsUp,
  Camera,
  Briefcase,
  Pencil,
  Plus,
  LayoutGrid,
  FolderKanban,
  Receipt,
  Megaphone,
  StickyNote,
  FolderOpen,
  MessagesSquare,
  BarChart3,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { addClientNoteAction, addContactAction, addServiceAction, deleteClientAction, removeServiceAction } from "@/lib/actions/clients";
import { enablePortalAction, disablePortalAction } from "@/lib/actions/client-portal";
import { uploadFileAction, deleteFileAction } from "@/lib/actions/files";
import { PageHeader, Card, Badge, Button, Input, Textarea } from "@/components/ui/primitives";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

const STATUS_TONE = { active: "success", paused: "warning", churned: "danger" } as const;
const INVOICE_STATUS_TONE = { draft: "default", sent: "brand", viewed: "brand", paid: "success", overdue: "danger", void: "danger" } as const;

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const client = await db.client.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      accountManager: true,
      contacts: { orderBy: { createdAt: "desc" } },
      services: { orderBy: { createdAt: "desc" } },
      deals: { include: { stage: true }, orderBy: { createdAt: "desc" } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      activities: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 30 },
      projects: { include: { tasks: true }, orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      websites: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) notFound();

  const totalServicesValue = client.services.reduce((sum, s) => sum + s.price, 0);
  const totalDealValue = client.deals.reduce((s, d) => s + d.value, 0);
  const paidInvoices = client.invoices.filter((i) => i.status === "paid");
  const outstandingInvoices = client.invoices.filter((i) => i.status !== "paid" && i.status !== "void");
  const totalPaid = paidInvoices.reduce((s, i) => s + i.total, 0);
  const totalOutstanding = outstandingInvoices.reduce((s, i) => s + i.total, 0);
  const avgProjectProgress =
    client.projects.length > 0 ? Math.round(client.projects.reduce((s, p) => s + p.progress, 0) / client.projects.length) : 0;
  const tenureDays = Math.round((new Date().getTime() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  const tabs: TabDef[] = [
    {
      key: "overview",
      label: "Overview",
      icon: <LayoutGrid size={14} />,
      content: (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Profile</h3>
              <dl className="space-y-2.5 text-sm">
                {client.contactName && <Row label="Contact">{client.contactName}</Row>}
                {client.email && <Row label="Email">{client.email}</Row>}
                {client.phone && <Row label="Phone">{client.phone}</Row>}
                {client.website && (
                  <Row label="Website">
                    <a href={ensureUrl(client.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand hover:text-brand-hover">
                      <Globe size={12} /> {client.website}
                    </a>
                  </Row>
                )}
                {client.googleBusinessProfile && (
                  <Row label="Google Business">
                    <a href={ensureUrl(client.googleBusinessProfile)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand hover:text-brand-hover">
                      <MapPin size={12} /> View profile
                    </a>
                  </Row>
                )}
                {(client.facebookUrl || client.instagramUrl || client.linkedinUrl) && (
                  <Row label="Social">
                    <div className="flex items-center gap-2">
                      {client.facebookUrl && (
                        <a href={ensureUrl(client.facebookUrl)} target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-brand">
                          <ThumbsUp size={14} />
                        </a>
                      )}
                      {client.instagramUrl && (
                        <a href={ensureUrl(client.instagramUrl)} target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-brand">
                          <Camera size={14} />
                        </a>
                      )}
                      {client.linkedinUrl && (
                        <a href={ensureUrl(client.linkedinUrl)} target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-brand">
                          <Briefcase size={14} />
                        </a>
                      )}
                    </div>
                  </Row>
                )}
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Contract & Billing</h3>
              <dl className="space-y-2.5 text-sm">
                <Row label="Package">{client.monthlyPackage || "—"}</Row>
                <Row label="Monthly spend">{formatCurrency(client.monthlySpend)}</Row>
                {client.contractStart && <Row label="Start">{formatDate(client.contractStart)}</Row>}
                {client.contractEnd && <Row label="End">{formatDate(client.contractEnd)}</Row>}
                <Row label="Account manager">
                  {client.accountManager ? (
                    <span className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20 text-[9px] font-semibold text-brand">
                        {initials(client.accountManager.name || client.accountManager.email)}
                      </span>
                      {client.accountManager.name || client.accountManager.email}
                    </span>
                  ) : (
                    "Unassigned"
                  )}
                </Row>
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Client Portal</h3>
              {client.portalEnabled ? (
                <div>
                  <p className="text-sm text-fg">
                    Portal active for <span className="font-medium">{client.portalEmail}</span>
                  </p>
                  <form action={disablePortalAction.bind(null, client.id)} className="mt-2">
                    <Button type="submit" size="sm" variant="danger">
                      Disable portal access
                    </Button>
                  </form>
                </div>
              ) : (
                <form action={enablePortalAction.bind(null, client.id)} className="space-y-1.5">
                  <Input name="portalEmail" type="email" placeholder="Client login email" required />
                  <Input name="password" type="password" placeholder="Set a password" required minLength={8} />
                  <Button type="submit" size="sm" variant="secondary" className="w-full">
                    Enable portal access
                  </Button>
                </form>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Services {totalServicesValue > 0 && `· ${formatCurrency(totalServicesValue)}/mo`}
              </h3>
              <div className="mb-3 space-y-1.5">
                {client.services.length === 0 && <p className="text-sm text-fg-subtle">No services added yet.</p>}
                {client.services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-fg">{s.name}</span>
                    <span className="text-fg-muted">{formatCurrency(s.price)}/mo</span>
                  </div>
                ))}
              </div>
              <form action={addServiceAction.bind(null, client.id)} className="flex gap-1.5">
                <Input name="name" placeholder="Service" className="flex-1" />
                <Input name="price" type="number" placeholder="$" className="w-20" />
                <Button type="submit" size="sm" variant="secondary">
                  <Plus size={13} />
                </Button>
              </form>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Deals</h3>
              {client.deals.length === 0 ? (
                <p className="text-sm text-fg-subtle">No deals linked to this client yet.</p>
              ) : (
                <div className="space-y-2">
                  {client.deals.map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-fg">{deal.title}</p>
                        <p className="text-xs text-fg-muted">{deal.stage.name}</p>
                      </div>
                      <span className="text-sm text-fg">{formatCurrency(deal.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: "projects",
      label: "Projects",
      icon: <FolderKanban size={14} />,
      badge: client.projects.length,
      content: (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Projects</h3>
            <Link href={`/dashboard/projects/new?clientId=${client.id}`} className="text-xs text-brand hover:text-brand-hover">
              + New project
            </Link>
          </div>
          {client.projects.length === 0 ? (
            <p className="text-sm text-fg-subtle">No projects yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {client.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="rounded-lg border border-border p-3 hover:border-border-strong"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-fg">{project.name}</span>
                    <Badge tone={project.status === "completed" ? "success" : project.status === "cancelled" ? "danger" : "brand"}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${project.progress}%` }} />
                  </div>
                  <p className="text-xs text-fg-subtle">
                    {project.progress}% · {project.tasks.filter((t) => t.status === "done").length}/{project.tasks.length} tasks
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      ),
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: <Receipt size={14} />,
      badge: client.invoices.length,
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xl font-semibold text-success">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-fg-subtle">Paid</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xl font-semibold text-warning">{formatCurrency(totalOutstanding)}</p>
              <p className="text-xs text-fg-subtle">Outstanding</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xl font-semibold text-fg">{client.invoices.length}</p>
              <p className="text-xs text-fg-subtle">Total invoices</p>
            </Card>
          </div>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">All Invoices</h3>
              <Link href={`/dashboard/invoices/new?clientId=${client.id}`} className="text-xs text-brand hover:text-brand-hover">
                + New invoice
              </Link>
            </div>
            {client.invoices.length === 0 ? (
              <p className="text-sm text-fg-subtle">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {client.invoices.map((inv) => (
                  <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:border-border-strong">
                    <span className="text-sm text-fg">{inv.number}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-fg-muted">{formatCurrency(inv.total)}</span>
                      <Badge tone={INVOICE_STATUS_TONE[inv.status as keyof typeof INVOICE_STATUS_TONE] ?? "default"}>{inv.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: "campaigns",
      label: "Campaigns",
      icon: <Megaphone size={14} />,
      content: (
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Active Services</h3>
            {client.services.length === 0 ? (
              <p className="text-sm text-fg-subtle">No active services/campaigns for this client yet — add one from Overview.</p>
            ) : (
              <div className="space-y-2">
                {client.services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-fg">{s.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-fg-muted">{formatCurrency(s.price)}/mo</span>
                      <form action={removeServiceAction.bind(null, client.id, s.id)}>
                        <button type="submit" className="text-fg-subtle hover:text-danger" title="Remove campaign">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Website</h3>
              <Link href="/dashboard/website-builder" className="text-xs text-brand hover:text-brand-hover">
                Website Builder →
              </Link>
            </div>
            {client.websites.length === 0 ? (
              <p className="text-sm text-fg-subtle">No AI-generated website for this client yet.</p>
            ) : (
              <div className="space-y-2">
                {client.websites.map((w) => (
                  <Link key={w.id} href={`/dashboard/website-builder/${w.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:border-border-strong">
                    <span className="text-sm text-fg">{w.heroHeadline || w.businessName}</span>
                    <Badge tone={w.status === "published" ? "success" : "default"}>{w.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: "notes",
      label: "Notes",
      icon: <StickyNote size={14} />,
      badge: client.notes.length,
      content: (
        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Notes</h3>
          <form action={addClientNoteAction.bind(null, client.id)} className="mb-4 space-y-2">
            <Textarea name="body" placeholder="Add an internal note or comment…" rows={2} required />
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                Add note
              </Button>
            </div>
          </form>
          <div className="space-y-3">
            {client.notes.length === 0 && <p className="text-sm text-fg-subtle">No notes yet.</p>}
            {client.notes.map((note) => (
              <div key={note.id} className="rounded-lg bg-bg px-3 py-2.5">
                <p className="text-sm text-fg">{note.body}</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {note.author?.name || note.author?.email || "Team"} · {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
    {
      key: "files",
      label: "Files",
      icon: <FolderOpen size={14} />,
      badge: client.files.length,
      content: (
        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Files</h3>
          <form action={uploadFileAction} className="mb-4 flex gap-1.5">
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="redirectPath" value={`/dashboard/clients/${client.id}`} />
            <input type="file" name="file" required className="flex-1 text-xs text-fg-muted file:mr-2 file:rounded-md file:border-0 file:bg-surface-hover file:px-2 file:py-1 file:text-xs file:text-fg" />
            <Button type="submit" size="sm" variant="secondary">
              Upload
            </Button>
          </form>
          {client.files.length === 0 ? (
            <p className="text-sm text-fg-subtle">No files uploaded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {client.files.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <a href={f.path} target="_blank" rel="noopener noreferrer" className="truncate text-brand hover:text-brand-hover">
                    {f.name}
                  </a>
                  <form action={deleteFileAction.bind(null, f.id, `/dashboard/clients/${client.id}`)}>
                    <button type="submit" className="text-fg-subtle hover:text-danger">
                      ×
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Card>
      ),
    },
    {
      key: "communication",
      label: "Communication",
      icon: <MessagesSquare size={14} />,
      content: (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Contacts</h3>
            <div className="mb-3 space-y-2">
              {client.contacts.length === 0 && <p className="text-sm text-fg-subtle">No contacts added yet.</p>}
              {client.contacts.map((c) => (
                <div key={c.id} className="text-sm">
                  <p className="font-medium text-fg">{c.name}</p>
                  <p className="text-xs text-fg-muted">{[c.title, c.email, c.phone].filter(Boolean).join(" · ") || "—"}</p>
                </div>
              ))}
            </div>
            <form action={addContactAction.bind(null, client.id)} className="space-y-1.5">
              <Input name="name" placeholder="Name" required />
              <div className="flex gap-1.5">
                <Input name="email" placeholder="Email" className="flex-1" />
                <Input name="phone" placeholder="Phone" className="flex-1" />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="w-full">
                <Plus size={13} /> Add contact
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Activity History</h3>
            <div className="scrollbar-thin max-h-96 space-y-3 overflow-y-auto">
              {client.activities.length === 0 && <p className="text-sm text-fg-subtle">No activity yet.</p>}
              {client.activities.map((a) => (
                <div key={a.id} className="flex gap-2.5 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="text-fg">{a.description}</p>
                    <p className="text-xs text-fg-subtle">
                      {a.user?.name || a.user?.email || "System"} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: "analytics",
      label: "Analytics",
      icon: <BarChart3 size={14} />,
      content: (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card className="p-4 text-center">
            <p className="text-xl font-semibold text-fg">{formatCurrency(client.monthlySpend)}</p>
            <p className="text-xs text-fg-subtle">Monthly value</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xl font-semibold text-fg">{formatCurrency(totalDealValue)}</p>
            <p className="text-xs text-fg-subtle">Total deal value</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xl font-semibold text-success">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-fg-subtle">Lifetime paid</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xl font-semibold text-fg">{avgProjectProgress}%</p>
            <p className="text-xs text-fg-subtle">Avg. project completion</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xl font-semibold text-fg">{client.projects.length}</p>
            <p className="text-xs text-fg-subtle">Total projects</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xl font-semibold text-fg">{tenureDays}d</p>
            <p className="text-xs text-fg-subtle">Client tenure</p>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={client.businessName}
        description={client.industry || undefined}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[client.status as keyof typeof STATUS_TONE] ?? "default"}>{client.status}</Badge>
            <Link href={`/dashboard/clients/${client.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil size={13} /> Edit
              </Button>
            </Link>
            <ConfirmDeleteButton
              action={deleteClientAction.bind(null, client.id)}
              confirmMessage={`Delete "${client.businessName}"? This permanently deletes their projects, files, invoices, notes, and contacts. This can't be undone.`}
            />
          </div>
        }
      />
      <Tabs tabs={tabs} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-fg-subtle">{label}</dt>
      <dd className="text-right text-fg">{children}</dd>
    </div>
  );
}

function ensureUrl(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}
