"use client";

import { useActionState } from "react";
import { Sparkles, Copy } from "lucide-react";
import { generateAssistantContentAction, type AssistantState } from "@/lib/actions/ai-assistant";
import { Card, Select, Textarea, Button } from "@/components/ui/primitives";

type Option = { id: string; businessName: string };

export function AssistantForm({
  leads,
  clients,
  defaultLeadId,
  defaultKind,
}: {
  leads: Option[];
  clients: Option[];
  defaultLeadId?: string;
  defaultKind?: string;
}) {
  const [state, formAction, pending] = useActionState<AssistantState, FormData>(generateAssistantContentAction, {});

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">Content type</span>
            <Select name="kind" defaultValue={defaultKind ?? "sales_email"}>
              <option value="sales_email">Cold outreach email</option>
              <option value="sales_sms">SMS message</option>
              <option value="call_script">Phone call script</option>
              <option value="call_prep">Pre-call briefing</option>
              <option value="follow_up">Follow-up email</option>
              <option value="proposal">Proposal summary</option>
              <option value="objection_handling">Objection handling</option>
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">Lead (optional)</span>
            <Select name="leadId" defaultValue={defaultLeadId ?? ""}>
              <option value="">None</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.businessName}
                </option>
              ))}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">Client (optional)</span>
            <Select name="clientId" defaultValue="">
              <option value="">None</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-muted">Extra context (optional)</span>
            <Textarea name="customContext" placeholder="Mention a specific offer, tone, or angle…" rows={3} />
          </label>

          <Button type="submit" disabled={pending} className="w-full">
            <Sparkles size={15} /> {pending ? "Generating…" : "Generate"}
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Result</h3>
          {state.output && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(state.output ?? "")}
              className="flex items-center gap-1 text-xs text-fg-muted hover:text-brand"
            >
              <Copy size={12} /> Copy
            </button>
          )}
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.output ? (
          <p className="whitespace-pre-wrap text-sm text-fg">{state.output}</p>
        ) : (
          !state.error && <p className="text-sm text-fg-subtle">Generated content will appear here.</p>
        )}
      </Card>
    </div>
  );
}
