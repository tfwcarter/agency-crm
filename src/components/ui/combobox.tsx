"use client";

import { useRef, useState } from "react";
import { ChevronDown, Plus, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; hint?: string };

type Row =
  | { kind: "preset"; value: string; hint?: string }
  | { kind: "custom"; value: string }
  | { kind: "save"; value: string };

/**
 * Searchable combobox: type to filter the preset list, pick with mouse or
 * arrows+Enter, or type anything custom. Custom entries can be saved (persisted
 * per-browser in localStorage under `storageKey`) and removed with the ✕.
 * localStorage is only touched inside event handlers — never during render.
 */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder,
  storageKey,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: ComboOption[];
  placeholder?: string;
  storageKey: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<string[]>([]);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function loadCustom() {
    try {
      const raw = localStorage.getItem(storageKey);
      setCustom(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setCustom([]);
    }
  }

  function persistCustom(next: string[]) {
    setCustom(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* private mode etc. — saved list just won't persist */
    }
  }

  const q = value.trim().toLowerCase();
  const filteredCustom = custom.filter((c) => !q || c.toLowerCase().includes(q));
  const filteredPresets = options.filter(
    (o) => !q || o.value.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)
  );
  const exactExists =
    !q ||
    custom.some((c) => c.toLowerCase() === q) ||
    options.some((o) => o.value.toLowerCase() === q);

  const rows: Row[] = [
    ...filteredCustom.map((c): Row => ({ kind: "custom", value: c })),
    ...filteredPresets.map((o): Row => ({ kind: "preset", value: o.value, hint: o.hint })),
    ...(!exactExists && value.trim() ? [{ kind: "save", value: value.trim() } as Row] : []),
  ];

  function select(v: string) {
    onValueChange(v);
    setOpen(false);
  }

  function activate(row: Row) {
    if (row.kind === "save") {
      persistCustom([row.value, ...custom.filter((c) => c.toLowerCase() !== row.value.toLowerCase())].slice(0, 20));
      select(row.value);
    } else {
      select(row.value);
    }
  }

  function removeCustom(v: string) {
    persistCustom(custom.filter((c) => c !== v));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown") {
        loadCustom();
        setOpen(true);
        setHi(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      setHi((h) => Math.min(h + 1, rows.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHi((h) => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (rows.length > 0) {
        activate(rows[Math.min(hi, rows.length - 1)]);
        e.preventDefault();
      } else {
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onFocus={() => {
            loadCustom();
            setOpen(true);
            setHi(0);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="w-full rounded-[var(--radius-control)] border border-border bg-bg px-3 py-2 pr-8 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
        />
      </div>

      {open && rows.length > 0 && (
        <div className="scrollbar-thin absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-lift)]">
          {rows.map((row, i) => (
            <div
              key={`${row.kind}-${row.value}`}
              onMouseDown={(e) => {
                e.preventDefault(); // fires before blur — keeps the dropdown interaction alive
                activate(row);
              }}
              onMouseEnter={() => setHi(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm",
                i === hi ? "bg-brand/10 text-fg" : "text-fg-muted"
              )}
            >
              {row.kind === "save" ? (
                <span className="flex items-center gap-1.5 text-brand">
                  <Plus size={13} /> Save &ldquo;{row.value}&rdquo;
                </span>
              ) : (
                <span className="flex min-w-0 items-center gap-1.5">
                  {row.kind === "custom" && <Star size={11} className="shrink-0 text-warning" fill="currentColor" />}
                  <span className="truncate">{row.value}</span>
                  {row.kind === "preset" && row.hint && <span className="shrink-0 text-xs text-fg-subtle">{row.hint}</span>}
                </span>
              )}
              {row.kind === "custom" && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeCustom(row.value);
                  }}
                  className="shrink-0 text-fg-subtle hover:text-danger"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
