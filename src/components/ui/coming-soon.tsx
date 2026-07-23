import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-border">
        <Icon size={24} className="text-brand" />
      </div>
      <h1 className="text-lg font-semibold text-fg">{title}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>
      <span className="mt-4 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
        Coming soon
      </span>
    </div>
  );
}
