"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { NAV_GROUPS } from "./nav-config";
import { cn } from "@/lib/utils";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";
import { BrandMark, LogoLockup } from "@/components/brand-mark";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useLocalStorageBoolean("sidebar-collapsed", false);

  function toggle() {
    setCollapsed(!collapsed);
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-bg-elevated transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        {collapsed ? <BrandMark size={28} /> : <LogoLockup height={22} className="!px-2.5 !py-1.5" />}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                      collapsed && "justify-center px-0 py-2",
                      active ? "text-brand" : "text-fg-muted hover:bg-surface-hover hover:text-fg"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg bg-brand/15"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <span className={cn("relative z-10 flex items-center gap-2", collapsed && "gap-0")}>
                      <Icon
                        size={16}
                        strokeWidth={2}
                        className="shrink-0 transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
                      />
                      {!collapsed && item.label}
                    </span>
                    {!collapsed && item.stub && (
                      <span className="relative z-10 rounded-full bg-border px-1.5 py-0.5 text-[9px] font-medium text-fg-subtle">
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

      <button
        onClick={toggle}
        className="flex h-11 items-center justify-center gap-2 border-t border-border text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
      >
        {collapsed ? <ChevronsRight size={15} /> : (
          <>
            <ChevronsLeft size={15} /> <span className="text-xs">Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}
