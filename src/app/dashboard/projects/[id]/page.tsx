import Link from "next/link";
import { notFound } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { updateProjectStatusAction, updateProjectProgressAction, addProjectTaskAction, addProjectCommentAction, logProjectTimeAction } from "@/lib/actions/projects";
import { uploadFileAction, deleteFileAction } from "@/lib/actions/files";
import { TaskBoard } from "@/components/projects/task-board";
import { PageHeader, Card, Badge, Button, Input, Textarea } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      client: true,
      tasks: { orderBy: { order: "asc" } },
      comments: { include: { author: true }, orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) notFound();

  async function setStatus(formData: FormData) {
    "use server";
    await updateProjectStatusAction(id, formData.get("status") as string);
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        description={
          <Link href={`/dashboard/clients/${project.client.id}`} className="hover:text-brand">
            {project.client.businessName}
          </Link>
        }
        action={
          <form action={setStatus} className="flex items-center gap-2">
            <select
              name="status"
              defaultValue={project.status}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-brand"
            >
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Update
            </Button>
          </form>
        }
      />

      <div className="px-6 py-5">
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Budget" value={formatCurrency(project.budget)} />
          <StatCard label="Hours Logged" value={`${project.hoursLogged}h`} />
          <StatCard label="Progress" value={`${project.progress}%`} />
          <StatCard label="Due" value={project.dueDate ? formatDate(project.dueDate) : "—"} />
        </div>

        <Card className="mb-5 p-4">
          <form action={updateProjectProgressAction.bind(null, project.id)} className="flex items-center gap-3">
            <span className="text-xs font-medium text-fg-muted">Progress</span>
            <input type="range" name="progress" min="0" max="100" defaultValue={project.progress} className="flex-1 accent-brand" />
            <Button type="submit" size="sm" variant="secondary">
              Update
            </Button>
          </form>
        </Card>

        <Card className="mb-5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Tasks</h3>
            <form action={addProjectTaskAction.bind(null, project.id)} className="flex gap-1.5">
              <Input name="title" placeholder="New task…" className="w-48" />
              <Button type="submit" size="sm" variant="secondary">
                Add
              </Button>
            </form>
          </div>
          <TaskBoard tasks={project.tasks} />
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Time Tracking</h3>
            <form action={logProjectTimeAction.bind(null, project.id)} className="mb-3 flex gap-1.5">
              <Input name="hours" type="number" step="0.25" min="0" placeholder="Hours" className="w-24" required />
              <Input name="description" placeholder="What did you work on?" className="flex-1" />
              <Button type="submit" size="sm">
                Log
              </Button>
            </form>
            <p className="text-sm text-fg-muted">{project.hoursLogged} total hours logged on this project.</p>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Files</h3>
            <form action={uploadFileAction} className="mb-3 flex gap-1.5">
              <input type="hidden" name="clientId" value={project.client.id} />
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="redirectPath" value={`/dashboard/projects/${project.id}`} />
              <input type="file" name="file" required className="flex-1 text-xs text-fg-muted file:mr-2 file:rounded-md file:border-0 file:bg-surface-hover file:px-2 file:py-1 file:text-xs file:text-fg" />
              <Button type="submit" size="sm" variant="secondary">
                <Upload size={13} />
              </Button>
            </form>
            <div className="space-y-1.5">
              {project.files.length === 0 && <p className="text-sm text-fg-subtle">No files uploaded yet.</p>}
              {project.files.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <a href={f.path} target="_blank" rel="noopener noreferrer" className="truncate text-brand hover:text-brand-hover">
                    {f.name}
                  </a>
                  <form action={deleteFileAction.bind(null, f.id, `/dashboard/projects/${project.id}`)}>
                    <button type="submit" className="text-fg-subtle hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="mt-5 p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Comments & Client Feedback</h3>
          <form action={addProjectCommentAction.bind(null, project.id)} className="mb-4 space-y-2">
            <Textarea name="body" placeholder="Leave a comment or note…" rows={2} required />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-fg-muted">
                <input type="checkbox" name="isClientVisible" className="accent-brand" />
                Visible to client
              </label>
              <Button type="submit" size="sm">
                Post
              </Button>
            </div>
          </form>
          <div className="space-y-3">
            {project.comments.length === 0 && <p className="text-sm text-fg-subtle">No comments yet.</p>}
            {project.comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-bg px-3 py-2.5">
                <p className="text-sm text-fg">{c.body}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-fg-subtle">
                  {c.authorIsClient ? "Client" : c.author?.name || c.author?.email || "Team"} · {formatDate(c.createdAt)}
                  {c.isClientVisible && <Badge tone="brand">Client visible</Badge>}
                  {c.isApproval && <Badge tone="success">Approved</Badge>}
                  {c.isRevisionRequest && <Badge tone="warning">Revision requested</Badge>}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-lg font-semibold text-fg">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-fg-subtle">{label}</p>
    </Card>
  );
}
