import { Trash2, StickyNote } from "lucide-react";
import { addQuickNoteAction, deleteQuickNoteAction } from "@/lib/actions/quick-notes";
import { Card, Textarea, Button } from "@/components/ui/primitives";

type Note = { id: string; body: string };

export function QuickNotes({ notes }: { notes: Note[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
        <StickyNote size={12} /> Quick Notes
      </h3>
      <form action={addQuickNoteAction} className="mb-3 space-y-2">
        <Textarea name="body" placeholder="Jot something down…" rows={2} required />
        <Button type="submit" size="sm" variant="secondary" className="w-full">
          Add
        </Button>
      </form>
      <div className="scrollbar-thin max-h-40 space-y-1.5 overflow-y-auto">
        {notes.length === 0 && <p className="text-xs text-fg-subtle">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="flex items-start justify-between gap-2 rounded-lg bg-bg px-2.5 py-2">
            <p className="text-xs text-fg">{n.body}</p>
            <form action={deleteQuickNoteAction.bind(null, n.id)}>
              <button type="submit" className="shrink-0 text-fg-subtle hover:text-danger">
                <Trash2 size={12} />
              </button>
            </form>
          </div>
        ))}
      </div>
    </Card>
  );
}
