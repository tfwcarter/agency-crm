import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePortalSession } from "@/lib/session";
import { addPortalCommentAction } from "@/lib/actions/client-portal";
import { PageHeader, Card, Badge, Textarea, Button } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePortalSession();
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, clientId: session.user.id },
    include: {
      tasks: { orderBy: { order: "asc" } },
      comments: { where: { isClientVisible: true }, orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) notFound();

  return (
    <div>
      <PageHeader
        title={project.name}
        description={`${project.progress}% complete`}
        action={<Badge tone="brand">{project.status.replace("_", " ")}</Badge>}
      />

      <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Progress</h3>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-brand" style={{ width: `${project.progress}%` }} />
          </div>
          <div className="space-y-1.5">
            {project.tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-fg">{t.title}</span>
                <Badge tone={t.status === "done" ? "success" : "default"}>{t.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>

          {project.files.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Files</h4>
              <div className="space-y-1.5">
                {project.files.map((f) => (
                  <a key={f.id} href={f.path} target="_blank" rel="noopener noreferrer" className="block text-sm text-brand hover:text-brand-hover">
                    {f.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Feedback</h3>
          <form action={addPortalCommentAction.bind(null, project.id)} className="mb-4 space-y-2">
            <Textarea name="body" placeholder="Leave feedback for your agency…" rows={2} required />
            <div className="flex gap-2">
              <Button type="submit" name="type" value="comment" size="sm" variant="secondary">
                Comment
              </Button>
              <Button type="submit" name="type" value="approval" size="sm">
                Approve
              </Button>
              <Button type="submit" name="type" value="revision" size="sm" variant="danger">
                Request revision
              </Button>
            </div>
          </form>
          <div className="space-y-3">
            {project.comments.length === 0 && <p className="text-sm text-fg-subtle">No feedback yet.</p>}
            {project.comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-bg px-3 py-2.5">
                <p className="text-sm text-fg">{c.body}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-fg-subtle">
                  {c.authorIsClient ? "You" : "Agency"} · {formatDate(c.createdAt)}
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
