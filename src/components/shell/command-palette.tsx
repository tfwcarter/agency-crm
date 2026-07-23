"use client";

import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Plus, Search } from "lucide-react";
import { NAV_GROUPS } from "./nav-config";
import { useCommandPalette } from "./command-palette-context";

const QUICK_ACTIONS = [
  { label: "Add Lead", href: "/dashboard/leads/new" },
  { label: "Add Client", href: "/dashboard/clients/new" },
  { label: "Add Deal", href: "/dashboard/pipeline/new" },
  { label: "Add Project", href: "/dashboard/projects/new" },
  { label: "Add Invoice", href: "/dashboard/invoices/new" },
  { label: "Add Appointment", href: "/dashboard/appointments/new" },
];

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-card border border-border-strong bg-surface shadow-[var(--shadow-lift)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search size={15} className="text-fg-subtle" />
            <Command.Input
              autoFocus
              placeholder="Search or jump to…"
              className="w-full bg-transparent py-3.5 text-sm text-fg placeholder:text-fg-subtle outline-none"
            />
            <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-fg-subtle">Esc</kbd>
          </div>
          <Command.List className="scrollbar-thin max-h-96 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-fg-subtle">No results found.</Command.Empty>

            <Command.Group heading="Quick actions" className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-subtle">
              {QUICK_ACTIONS.map((a) => (
                <Command.Item
                  key={a.href}
                  onSelect={() => go(a.href)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-fg data-[selected=true]:bg-brand/15 data-[selected=true]:text-brand"
                >
                  <Plus size={14} />
                  {a.label}
                </Command.Item>
              ))}
            </Command.Group>

            {NAV_GROUPS.map((group) => (
              <Command.Group
                key={group.label}
                heading={group.label}
                className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-subtle"
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.href}
                      onSelect={() => go(item.href)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-fg data-[selected=true]:bg-brand/15 data-[selected=true]:text-brand"
                    >
                      <Icon size={14} />
                      {item.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
