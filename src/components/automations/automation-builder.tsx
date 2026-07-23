"use client";

import { useState } from "react";
import { createAutomationAction } from "@/lib/actions/automations";
import { Input, Select, Button, Textarea } from "@/components/ui/primitives";

const TRIGGERS = [
  { value: "lead_created", label: "Lead created" },
  { value: "client_created", label: "Client created" },
  { value: "deal_won", label: "Deal won" },
  { value: "deal_lost", label: "Deal lost" },
  { value: "deal_stage_changed", label: "Deal stage changed" },
  { value: "invoice_paid", label: "Invoice paid" },
  { value: "appointment_booked", label: "Appointment booked" },
];

const ACTIONS = [
  { value: "log_activity", label: "Log an activity note" },
  { value: "add_note", label: "Add a note to the record" },
  { value: "create_invoice_draft", label: "Create a draft invoice" },
  { value: "flag_client_status", label: "Set client status" },
];

export function AutomationBuilder() {
  const [actionType, setActionType] = useState("log_activity");

  return (
    <form action={createAutomationAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">Rule name</span>
        <Input name="name" placeholder="Welcome note on new client" required />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">When this happens</span>
        <Select name="trigger" defaultValue={TRIGGERS[0].value}>
          {TRIGGERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">Do this</span>
        <Select name="actionType" value={actionType} onChange={(e) => setActionType(e.target.value)}>
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
      </label>

      {actionType === "log_activity" && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-fg-muted">Activity message</span>
          <Input name="message" placeholder="Automated: new client onboarded" />
        </label>
      )}

      {actionType === "add_note" && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-fg-muted">Note text ({"{{name}}"} inserts the record&apos;s name)</span>
          <Textarea name="note" placeholder="Welcome {{name}} — reach out within 24 hours." rows={2} />
        </label>
      )}

      {actionType === "create_invoice_draft" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">Amount ($)</span>
            <Input name="amount" type="number" min="0" step="1" placeholder="500" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">Line item description</span>
            <Input name="description" placeholder="Onboarding fee" />
          </label>
        </div>
      )}

      {actionType === "flag_client_status" && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-fg-muted">Set status to</span>
          <Select name="status" defaultValue="active">
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="churned">Churned</option>
          </Select>
        </label>
      )}

      <Button type="submit" className="w-full">
        Create automation
      </Button>
    </form>
  );
}
