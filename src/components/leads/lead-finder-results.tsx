"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Globe, Star, Phone, MapPin, Plus, Check, ExternalLink } from "lucide-react";
import { qualifyBusinessAction, importQualifiedLeadAction, type Qualification } from "@/lib/actions/lead-finder";
import type { DiscoveredBusiness } from "@/lib/discovery";
import { Card, Badge, Button, Select } from "@/components/ui/primitives";

const QUALIFY_CONCURRENCY = 4;
const DEFAULT_THRESHOLD = 55;

type FilterMode = "qualified" | "no_website" | "high_need" | "all";

export function LeadFinderResults({
  businesses,
  existingNames,
  source,
}: {
  businesses: DiscoveredBusiness[];
  existingNames: string[];
  source: "google_places" | "openstreetmap";
}) {
  const router = useRouter();
  const [quals, setQuals] = useState<Map<string, Qualification>>(new Map());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [imported, setImported] = useState<Set<string>>(() => new Set());
  const [importingAll, setImportingAll] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("qualified");
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  const alreadyInCrm = new Set(existingNames);
  const analyzed = quals.size > 0;

  async function qualifyAll() {
    if (running) return;
    setRunning(true);
    setProgress({ done: 0, total: businesses.length });

    const queue = [...businesses];
    let done = 0;
    const next = new Map(quals);

    async function worker() {
      while (queue.length > 0) {
        const biz = queue.shift();
        if (!biz) return;
        try {
          const q = await qualifyBusinessAction({
            website: biz.website,
            facebookUrl: biz.facebookUrl,
            instagramUrl: biz.instagramUrl,
            linkedinUrl: biz.linkedinUrl,
            googleRating: biz.googleRating,
            googleReviews: biz.googleReviews,
          });
          next.set(biz.key, q);
        } catch {
          /* skip businesses that fail to qualify */
        }
        done += 1;
        setProgress({ done, total: businesses.length });
        setQuals(new Map(next));
      }
    }

    await Promise.all(Array.from({ length: Math.min(QUALIFY_CONCURRENCY, businesses.length) }, worker));
    setRunning(false);
  }

  function passesFilter(biz: DiscoveredBusiness, q: Qualification): boolean {
    switch (filterMode) {
      case "no_website":
        return !q.hasWebsite;
      case "high_need":
        return q.opportunityScore >= threshold;
      case "all":
        return true;
      case "qualified":
      default:
        return !q.hasWebsite || q.opportunityScore >= threshold;
    }
  }

  const qualifiedList = businesses
    .map((biz) => ({ biz, q: quals.get(biz.key) }))
    .filter((x): x is { biz: DiscoveredBusiness; q: Qualification } => Boolean(x.q) && passesFilter(x.biz, x.q!))
    .sort((a, b) => b.q.opportunityScore - a.q.opportunityScore);

  const noWebsiteCount = Array.from(quals.values()).filter((q) => !q.hasWebsite).length;
  const highNeedCount = Array.from(quals.values()).filter((q) => q.opportunityScore >= threshold).length;

  async function importOne(biz: DiscoveredBusiness, q: Qualification) {
    if (imported.has(biz.key) || alreadyInCrm.has(biz.name)) return;
    setImported((prev) => new Set(prev).add(biz.key));
    await importQualifiedLeadAction(biz, q);
  }

  async function importAllQualified() {
    if (importingAll) return;
    setImportingAll(true);
    for (const { biz, q } of qualifiedList) {
      if (imported.has(biz.key) || alreadyInCrm.has(biz.name)) continue;
      setImported((prev) => new Set(prev).add(biz.key));
      await importQualifiedLeadAction(biz, q);
    }
    setImportingAll(false);
    router.refresh();
  }

  return (
    <div>
      {/* action bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <MapPin size={14} />
          {businesses.length} businesses found
          <Badge tone={source === "google_places" ? "brand" : "default"}>
            {source === "google_places" ? "Google Places" : "OpenStreetMap"}
          </Badge>
        </div>

        {!analyzed ? (
          running ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2">
              <Loader2 size={15} className="animate-spin text-brand" />
              <div className="w-40">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
              </div>
              <span className="text-xs text-fg-muted">
                Analyzing {progress.done}/{progress.total}
              </span>
            </div>
          ) : (
            <Button onClick={qualifyAll} className="shrink-0">
              <Sparkles size={15} /> Analyze &amp; qualify {businesses.length} businesses
            </Button>
          )
        ) : (
          <div className="flex items-center gap-2">
            {running && <Loader2 size={14} className="animate-spin text-brand" />}
            <Button variant="accent" size="sm" onClick={importAllQualified} disabled={importingAll || qualifiedList.length === 0}>
              {importingAll ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Import all {qualifiedList.length} qualified
            </Button>
          </div>
        )}
      </div>

      {/* filter toggles (after analysis) */}
      {analyzed && (
        <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
          <FilterChip active={filterMode === "qualified"} onClick={() => setFilterMode("qualified")}>
            ⭐ Qualified ({businesses.filter((b) => { const q = quals.get(b.key); return q && (!q.hasWebsite || q.opportunityScore >= threshold); }).length})
          </FilterChip>
          <FilterChip active={filterMode === "no_website"} onClick={() => setFilterMode("no_website")}>
            🚨 No website ({noWebsiteCount})
          </FilterChip>
          <FilterChip active={filterMode === "high_need"} onClick={() => setFilterMode("high_need")}>
            🔥 High need ({highNeedCount})
          </FilterChip>
          <FilterChip active={filterMode === "all"} onClick={() => setFilterMode("all")}>
            All analyzed ({quals.size})
          </FilterChip>

          <div className="ml-auto flex items-center gap-2 text-xs text-fg-muted">
            <span>Need threshold</span>
            <Select value={String(threshold)} onChange={(e) => setThreshold(Number(e.target.value))} className="w-20 py-1">
              <option value="40">40+</option>
              <option value="55">55+</option>
              <option value="70">70+</option>
              <option value="80">80+</option>
            </Select>
          </div>
        </Card>
      )}

      {/* results grid */}
      {analyzed && qualifiedList.length === 0 && !running && (
        <Card className="py-12 text-center text-sm text-fg-muted">
          No businesses match this filter. Try lowering the need threshold or switching to &quot;All analyzed.&quot;
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(analyzed ? qualifiedList.map((x) => x.biz) : businesses).map((biz) => {
          const q = quals.get(biz.key);
          const isImported = imported.has(biz.key) || alreadyInCrm.has(biz.name);
          return (
            <Card key={biz.key} className="flex flex-col p-4">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="font-medium leading-snug text-fg">{biz.name}</p>
                {q && (
                  <span className={`shrink-0 text-lg font-semibold ${q.opportunityScore >= 75 ? "text-danger" : q.opportunityScore >= 45 ? "text-warning" : "text-fg-muted"}`}>
                    {q.opportunityScore}
                  </span>
                )}
              </div>

              {biz.category && <p className="mb-2 text-xs capitalize text-fg-muted">{biz.category.replace(/_/g, " ")}</p>}

              {/* labels */}
              {q && q.labels.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {q.labels.slice(0, 3).map((l) => (
                    <span key={l} className="rounded-full bg-bg px-1.5 py-0.5 text-[10px] text-fg-muted">
                      {l}
                    </span>
                  ))}
                </div>
              )}

              {/* why call them */}
              {q && q.topReasons.length > 0 && (
                <ul className="mb-3 space-y-0.5">
                  {q.topReasons.map((r) => (
                    <li key={r} className="flex items-start gap-1.5 text-xs text-fg-muted">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand" /> {r}
                    </li>
                  ))}
                </ul>
              )}

              {/* contact facts */}
              <div className="mb-3 space-y-1 text-xs text-fg-muted">
                {biz.website ? (
                  <a href={biz.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand hover:text-brand-hover">
                    <Globe size={11} /> {biz.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-warning">
                    <Globe size={11} /> No website
                  </span>
                )}
                {biz.phone && (
                  <p className="flex items-center gap-1">
                    <Phone size={11} /> {biz.phone}
                  </p>
                )}
                {biz.googleRating != null && (
                  <p className="flex items-center gap-1">
                    <Star size={11} className="text-warning" fill="currentColor" /> {biz.googleRating} ({biz.googleReviews ?? 0} reviews)
                  </p>
                )}
                {biz.address && <p className="flex items-start gap-1"><MapPin size={11} className="mt-0.5 shrink-0" /> {biz.address}</p>}
              </div>

              <div className="mt-auto">
                {q ? (
                  <Button
                    onClick={() => importOne(biz, q)}
                    size="sm"
                    variant={isImported ? "secondary" : "primary"}
                    disabled={isImported}
                    className="w-full"
                  >
                    {isImported ? <><Check size={13} /> In your CRM</> : <><Plus size={13} /> Add as Lead</>}
                  </Button>
                ) : (
                  <p className="flex items-center gap-1 text-[11px] text-fg-subtle">
                    <ExternalLink size={10} /> Analyze to score this lead
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active ? "bg-brand text-brand-fg" : "bg-bg text-fg-muted hover:bg-surface-hover hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
