"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export function ConfirmDeleteButton({
  action,
  confirmMessage,
  label = "Delete",
  size = "sm",
  iconOnly = false,
  className,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  size?: "sm" | "md";
  iconOnly?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setBusy(true);
    try {
      await action();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" size={size} variant="danger" onClick={handleClick} disabled={busy} className={className}>
      <Trash2 size={14} /> {!iconOnly && label}
    </Button>
  );
}
