"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type TabDef = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  content: React.ReactNode;
};

export function Tabs({ tabs, defaultKey }: { tabs: TabDef[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-border px-6">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab?.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                isActive ? "border-brand text-fg" : "border-transparent text-fg-muted hover:text-fg"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge !== 0 && tab.badge !== "" && (
                <span className="rounded-full bg-border px-1.5 py-0.5 text-[10px] text-fg-subtle">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      <div key={activeTab?.key} className="animate-fade-in p-6">
        {activeTab?.content}
      </div>
    </div>
  );
}
