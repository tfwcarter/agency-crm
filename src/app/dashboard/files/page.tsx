import Link from "next/link";
import { Upload, Trash2, FolderOpen, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { uploadFileAction, deleteFileAction } from "@/lib/actions/files";
import { PageHeader, Card, Select, Button } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function FilesPage() {
  const session = await requireSession();

  const [files, clients] = await Promise.all([
    db.fileAsset.findMany({
      where: { organizationId: session.user.organizationId },
      include: { client: true, project: true, uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.client.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { businessName: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="File Manager" description={`${files.length} files stored`} />

      <div className="px-6 py-5">
        <Card className="mb-6 p-5">
          <form action={uploadFileAction} className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-fg-muted">Client</span>
              <Select name="clientId" className="w-56" required>
                <option value="" disabled>
                  Select a client
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                  </option>
                ))}
              </Select>
            </label>
            <input type="hidden" name="redirectPath" value="/dashboard/files" />
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs font-medium text-fg-muted">File</span>
              <input
                type="file"
                name="file"
                required
                className="w-full text-sm text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-hover file:px-3 file:py-2 file:text-sm file:text-fg"
              />
            </label>
            <Button type="submit">
              <Upload size={15} /> Upload
            </Button>
          </form>
        </Card>

        {files.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen size={28} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No files yet</p>
            <p className="mt-1 text-sm text-fg-muted">Upload logos, contracts, or creative assets above.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-subtle">
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Client / Project</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <a href={f.path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-medium text-fg hover:text-brand">
                        <FileText size={14} className="text-fg-subtle" /> {f.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {f.client && (
                        <Link href={`/dashboard/clients/${f.client.id}`} className="hover:text-brand">
                          {f.client.businessName}
                        </Link>
                      )}
                      {f.project && <span> · {f.project.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{formatSize(f.size)}</td>
                    <td className="px-4 py-3 text-fg-muted">v{f.version}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {formatDate(f.createdAt)} · {f.uploadedBy?.name || f.uploadedBy?.email}
                    </td>
                    <td className="px-4 py-3">
                      <form action={deleteFileAction.bind(null, f.id, "/dashboard/files")}>
                        <button type="submit" className="text-fg-subtle hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
