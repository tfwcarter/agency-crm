"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { deleteAllLeadsAction } from "@/lib/actions/leads";
import { Button, Input } from "@/components/ui/primitives";
import type { LeadSearchParams } from "@/lib/lead-filters";

const CONFIRM_WORD = "DELETE";

export function DeleteAllLeadsButton({
  filters,
  total,
  activeFilterCount,
}: {
  filters: LeadSearchParams;
  total: number;
  activeFilterCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const scopeLabel = activeFilterCount > 0 ? `${total} lead${total === 1 ? "" : "s"} matching your current filters` : `all ${total} lead${total === 1 ? "" : "s"}`;

  async function confirmDelete() {
    if (confirmText !== CONFIRM_WORD || busy) return;
    setBusy(true);
    await deleteAllLeadsAction(filters);
    setBusy(false);
    setOpen(false);
    setConfirmText("");
    router.refresh();
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirmText("");
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-danger hover:bg-danger/10">
        <Trash2 size={13} /> Delete all
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-lift)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                <AlertTriangle size={18} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-fg">Delete {scopeLabel}?</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  This permanently removes {scopeLabel}
                  {" — "}
                  including their notes, activity, and website audits. This can&apos;t be undone.
                </p>
              </div>
            </div>

            <label className="mb-1.5 mt-4 block text-xs font-medium text-fg-muted">
              Type <span className="font-mono font-semibold text-fg">{CONFIRM_WORD}</span> to confirm
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoFocus
              disabled={busy}
            />

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                disabled={confirmText !== CONFIRM_WORD || busy}
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {busy ? "Deleting…" : `Delete ${total}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
