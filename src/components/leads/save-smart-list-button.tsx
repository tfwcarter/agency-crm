"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { saveSmartListAction } from "@/lib/actions/smart-lists";
import { Button, Input } from "@/components/ui/primitives";

export function SaveSmartListButton({ filters, resultCount }: { filters: Record<string, string | undefined>; resultCount: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    await saveSmartListAction(name, JSON.stringify(clean), resultCount);
    setSaving(false);
    setOpen(false);
    setName("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Bookmark size={13} /> Save as Smart List
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Roofers without websites"
        className="w-56"
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <Button type="button" size="sm" onClick={save} disabled={saving || !name.trim()}>
        {saving ? "Saving…" : "Save"}
      </Button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-fg-subtle hover:text-fg">
        Cancel
      </button>
    </div>
  );
}
