import Link from "next/link";
import { Search } from "lucide-react";
import { Input, Select, Button } from "@/components/ui/primitives";

const LABELS = [
  "🔥 Hot Lead",
  "🚨 Website Needed",
  "📈 SEO Opportunity",
  "📱 Social Opportunity",
  "🤖 Automation Opportunity",
  "⭐ Reputation Opportunity",
  "🐌 Slow Website",
  "📵 Not Mobile Friendly",
  "🕸️ Stale Website",
  "⚡ Recently Launched",
];

const TECH_OPTIONS = ["WordPress", "Shopify", "Wix", "Squarespace", "Webflow", "GoDaddy Website Builder", "Cloudflare"];

export function LeadFilterBar({
  filters,
  industries,
  owners,
}: {
  filters: Record<string, string | undefined>;
  industries: string[];
  owners: { id: string; name: string | null; email: string }[];
}) {
  return (
    <form className="mb-4 space-y-3 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[200px] flex-1">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Search</span>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <Input name="q" defaultValue={filters.q} placeholder="Business name…" className="pl-8" />
          </div>
        </label>

        <label className="block w-36">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Industry</span>
          <Select name="industry" defaultValue={filters.industry ?? ""}>
            <option value="">Any</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </label>

        <label className="block w-28">
          <span className="mb-1 block text-xs font-medium text-fg-muted">City</span>
          <Input name="city" defaultValue={filters.city} placeholder="Any" />
        </label>

        <label className="block w-20">
          <span className="mb-1 block text-xs font-medium text-fg-muted">State</span>
          <Input name="state" defaultValue={filters.state} placeholder="Any" />
        </label>

        <label className="block w-32">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Status</span>
          <Select name="status" defaultValue={filters.status ?? ""}>
            <option value="">Any</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="dead">Dead</option>
          </Select>
        </label>

        <label className="block w-28">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Min score</span>
          <Input name="minScore" type="number" min="0" max="100" defaultValue={filters.minScore} placeholder="0" />
        </label>

        <label className="block w-32">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Website</span>
          <Select name="hasWebsite" defaultValue={filters.hasWebsite ?? ""}>
            <option value="">Any</option>
            <option value="yes">Has website</option>
            <option value="no">No website</option>
          </Select>
        </label>

        <label className="block w-36">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Assigned rep</span>
          <Select name="owner" defaultValue={filters.owner ?? ""}>
            <option value="">Anyone</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name || o.email}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="block w-44">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Smart label</span>
          <Select name="label" defaultValue={filters.label ?? ""}>
            <option value="">Any</option>
            {LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </label>

        <label className="block w-40">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Tech stack</span>
          <Select name="tech" defaultValue={filters.tech ?? ""}>
            <option value="">Any</option>
            {TECH_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </label>

        <label className="block w-28">
          <span className="mb-1 block text-xs font-medium text-fg-muted">SSL</span>
          <Select name="ssl" defaultValue={filters.ssl ?? ""}>
            <option value="">Any</option>
            <option value="yes">Has SSL</option>
            <option value="no">No SSL</option>
          </Select>
        </label>

        <label className="block w-36">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Meta Pixel</span>
          <Select name="pixel" defaultValue={filters.pixel ?? ""}>
            <option value="">Any</option>
            <option value="yes">Has pixel</option>
            <option value="no">No pixel</option>
          </Select>
        </label>

        <label className="block w-36">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Analytics</span>
          <Select name="analytics" defaultValue={filters.analytics ?? ""}>
            <option value="">Any</option>
            <option value="yes">Has analytics</option>
            <option value="no">No analytics</option>
          </Select>
        </label>

        <label className="block w-40">
          <span className="mb-1 block text-xs font-medium text-fg-muted">Sort by</span>
          <Select name="sort" defaultValue={filters.sort ?? "score_desc"}>
            <option value="score_desc">Highest opportunity</option>
            <option value="updated_desc">Recently updated</option>
            <option value="name_asc">Business name A–Z</option>
            <option value="created_desc">Newest first</option>
          </Select>
        </label>

        <label className="flex h-9 items-center gap-1.5 text-xs text-fg-muted">
          <input type="checkbox" name="favoritesOnly" value="yes" defaultChecked={filters.favoritesOnly === "yes"} className="accent-brand" />
          Favorites only
        </label>

        <Button type="submit" size="sm">
          Apply filters
        </Button>
        <Link href="/dashboard/leads" className="text-xs text-fg-subtle hover:text-fg">
          Clear all
        </Link>
      </div>
    </form>
  );
}
