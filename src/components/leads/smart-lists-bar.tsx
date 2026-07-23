import Link from "next/link";
import { Bookmark, Trash2 } from "lucide-react";
import { deleteSmartListAction } from "@/lib/actions/smart-lists";

export type SmartListRow = { id: string; name: string; filtersJson: string; resultCount: number };

export function SmartListsBar({ lists }: { lists: SmartListRow[] }) {
  if (lists.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs font-medium text-fg-subtle">
        <Bookmark size={12} /> Smart Lists:
      </span>
      {lists.map((list) => {
        const filters: Record<string, string> = JSON.parse(list.filtersJson);
        return (
          <div key={list.id} className="flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1.5 text-xs">
            <Link href={{ pathname: "/dashboard/leads", query: filters }} className="text-fg hover:text-brand">
              {list.name} <span className="text-fg-subtle">({list.resultCount})</span>
            </Link>
            <form action={deleteSmartListAction.bind(null, list.id)}>
              <button type="submit" className="text-fg-subtle hover:text-danger">
                <Trash2 size={11} />
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
