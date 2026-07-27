"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { NAV_GROUPS } from "./nav-config";
import { cn } from "@/lib/utils";
import { LogoLockup } from "@/components/brand-mark";

/**
 * Mobile navigation: a hamburger button (shown only under md) that opens a
 * slide-out drawer with the same nav as the desktop sidebar. The desktop
 * sidebar is `hidden md:flex`, so this is the only nav on phones/tablets.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col border-r border-border bg-bg-elevated shadow-[var(--shadow-lift)]"
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
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
