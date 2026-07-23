import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Card } from "@/components/ui/primitives";

export function NoAiKeyBanner({ feature }: { feature: string }) {
  return (
    <Card className="mb-5 flex items-center justify-between gap-3 p-4 text-sm text-warning">
      <span className="flex items-center gap-2">
        <KeyRound size={15} className="shrink-0" />
        No AI key connected — paste a free Groq key in Settings to enable {feature}.
      </span>
      <Link href="/dashboard/settings" className="shrink-0 whitespace-nowrap underline">
        Add key →
      </Link>
    </Card>
  );
}
