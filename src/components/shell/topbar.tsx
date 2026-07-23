"use client";

import { useState } from "react";
import { LogOut, User as UserIcon, Search } from "lucide-react";
import { signOutAction } from "@/lib/actions/session";
import { initials } from "@/lib/utils";
import { useCommandPalette } from "./command-palette-context";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const { setOpen: setPaletteOpen } = useCommandPalette();

  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border px-6">
      <button
        onClick={() => setPaletteOpen(true)}
        className="flex w-full max-w-sm items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 py-1.5 text-sm text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">{isMac ? "⌘K" : "Ctrl+K"}</kbd>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-fg"
          >
            {initials(userName || userEmail)}
          </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-10 z-20 w-56 rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-lift)]">
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <UserIcon size={14} className="text-fg-muted" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{userName}</p>
                  <p className="truncate text-xs text-fg-muted">{userEmail}</p>
                </div>
              </div>
              <div className="my-1 h-px bg-border" />
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </form>
            </div>
          </>
        )}
        </div>
      </div>
    </header>
  );
}
