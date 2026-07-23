import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PageHeader, Card, Badge, Button } from "@/components/ui/primitives";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteProjectAction } from "@/lib/actions/projects";
import { formatCurrency } from "@/lib/utils";

const STATUS_TONE = { active: "brand", on_hold: "warning", completed: "success", cancelled: "danger" } as const;
const TYPE_LABEL: Record<string, string> = {
  website: "Website",
  seo: "SEO",
  google_ads: "Google Ads",
  facebook_ads: "Facebook Ads",
  branding: "Branding",
  automation: "AI Automation",
  landing_page: "Landing Page",
  funnel: "Funnel",
  email_campaign: "Email Campaign",
};

export default async function ProjectsPage() {
  const session = await requireSession();

  const projects = await db.project.findMany({
    where: { organizationId: session.user.organizationId },
    include: { client: true, tasks: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        description={`${projects.length} total · ${projects.filter((p) => p.status === "active").length} active`}
        action={
          <Link href="/dashboard/projects/new">
            <Button>
              <Plus size={15} /> New Project
            </Button>
          </Link>
        }
      />

      <div className="px-6 py-5">
        {projects.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <FolderKanban size={28} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No projects yet</p>
            <p className="mt-1 text-sm text-fg-muted">Start a project for one of your clients.</p>
            <Link href="/dashboard/projects/new" className="mt-4">
              <Button>
                <Plus size={15} /> New Project
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const done = project.tasks.filter((t) => t.status === "done").length;
              return (
                <div key={project.id} className="group relative">
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <Card className="p-4 hover:border-brand/50">
                      <div className="mb-2 flex items-start justify-between gap-2 pr-6">
                        <p className="font-medium text-fg">{project.name}</p>
                        <Badge tone={STATUS_TONE[project.status as keyof typeof STATUS_TONE] ?? "default"}>
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="mb-3 text-xs text-fg-muted">
                        {project.client.businessName} · {TYPE_LABEL[project.type] ?? project.type}
                      </p>
                      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-bg">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${project.progress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-fg-subtle">
                        <span>{project.progress}% complete</span>
                        <span>
                          {done}/{project.tasks.length} tasks
                        </span>
                        {project.budget > 0 && <span>{formatCurrency(project.budget)}</span>}
                      </div>
                    </Card>
                  </Link>
                  <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <ConfirmDeleteButton
                      action={deleteProjectAction.bind(null, project.id)}
                      confirmMessage={`Delete "${project.name}"? This permanently deletes its tasks, comments, files, and time entries. This can't be undone.`}
                      iconOnly
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
