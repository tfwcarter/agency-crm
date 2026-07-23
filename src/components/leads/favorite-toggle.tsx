"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { toggleFavoriteLeadAction } from "@/lib/actions/lead-enrichment";

export function FavoriteToggle({ leadId, favorited }: { leadId: string; favorited: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        await toggleFavoriteLeadAction(leadId, !favorited);
        router.refresh();
      })}
      className="text-fg-subtle transition-colors hover:text-warning"
      title={favorited ? "Remove favorite" : "Mark as favorite"}
    >
      <Star size={18} fill={favorited ? "currentColor" : "none"} className={favorited ? "text-warning" : ""} />
    </button>
  );
}
