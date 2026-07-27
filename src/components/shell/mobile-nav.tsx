"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV_GROUPS } from "./nav-config";
import { cn } from "@/lib/utils";
import { LogoLockup } from "@/components/brand-mark";

/**
 * Mobile navigation: a hamburger (shown only under md) that opens a slide-out
 * drawer with the same nav as the desktop sidebar, which is `hidden md:flex`.
 *
 * The overlay is always mounted and toggled purely with CSS — when closed it is
 * `pointer-events-none` and fully transparent/off-screen, so it can never leave
 * an invisible layer intercepting taps (a real bug AnimatePresence caused here
 * when it failed to unmount during client route transitions).
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on any route change (covers link taps, back button, command palette).
  // rAF keeps the state update out of the effect body for the strict lint rules.
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg md:hidden"
      >
        <Menu size={18} />
      </button>

      <div
        className={cn("fixed inset-0 z-50 md:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!open}
      >
        {/* backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        {/* panel */}
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col border-r border-border bg-bg-elevated shadow-[var(--shadow-lift)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <LogoLockup height={22} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-5">
                <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active =
                      item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                          active ? "bg-brand/15 text-brand" : "text-fg-muted hover:bg-surface-hover hover:text-fg",
                        )}
                      >
                        <Icon size={16} strokeWidth={2} className="shrink-0" />
                        {item.label}
                        {item.stub && (
                          <span className="ml-auto rounded-full bg-border px-1.5 py-0.5 text-[9px] font-medium text-fg-subtle">
                            soon
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
