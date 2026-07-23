"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input, Button } from "@/components/ui/primitives";

type Row = { description: string; quantity: string; unitPrice: string };

export function LineItemsEditor() {
  const [rows, setRows] = useState<Row[]>([{ description: "", quantity: "1", unitPrice: "0" }]);

  function update(i: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);

  return (
    <div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              name="description[]"
              value={row.description}
              onChange={(e) => update(i, "description", e.target.value)}
              placeholder="SEO — Monthly Retainer"
              className="flex-1"
            />
            <Input
              name="quantity[]"
              type="number"
              min="0"
              step="1"
              value={row.quantity}
              onChange={(e) => update(i, "quantity", e.target.value)}
              className="w-20"
            />
            <Input
              name="unitPrice[]"
              type="number"
              min="0"
              step="1"
              value={row.unitPrice}
              onChange={(e) => update(i, "unitPrice", e.target.value)}
              className="w-28"
            />
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              className="text-fg-subtle hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setRows((prev) => [...prev, { description: "", quantity: "1", unitPrice: "0" }])}
        >
          <Plus size={13} /> Add line
        </Button>
        <p className="text-sm text-fg-muted">
          Subtotal: <span className="font-medium text-fg">${total.toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}
