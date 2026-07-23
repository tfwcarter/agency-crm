import Link from "next/link";
import { Plus, Target } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { buildLeadWhere, type LeadSearchParams } from "@/lib/lead-filters";
import { PageHeader, Card, Button } from "@/components/ui/primitives";
import { LeadFilterBar } from "@/components/leads/lead-filter-bar";
import { LeadsTable, type LeadRow } from "@/components/leads/leads-table";
import { SaveSmartListButton } from "@/components/leads/save-smart-list-button";
import { SmartListsBar } from "@/components/leads/smart-lists-bar";
import { DeleteAllLeadsButton } from "@/components/leads/delete-all-leads-button";

const PAGE_SIZE = 25;

type SearchParams = LeadSearchParams;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const orgId = session.user.organizationId;
  const isAdmin = session.user.role === "owner" || session.user.role === "admin";
  const page = Math.max(1, Number(sp.page) || 1);

  const sortMap: Record<string, Prisma.LeadOrderByWithRelationInput> = {
    score_desc: { opportunityScore: "desc" },
    updated_desc: { updatedAt: "desc" },
    name_asc: { businessName: "asc" },
    created_desc: { createdAt: "desc" },
  };
  const orderBy = sortMap[sp.sort ?? "score_desc"] ?? sortMap.score_desc;

  const where = buildLeadWhere(orgId, sp);

  const [leads, total, industries, owners, smartLists] = await Promise.all([
    db.lead.findMany({
      where,
      include: { owner: { select: { name: true, email: true } } },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.lead.count({ where }),
    db.lead
      .findMany({ where: { organizationId: orgId, industry: { not: null } }, select: { industry: true }, distinct: ["industry"] })
      .then((rows) => rows.map((r) => r.industry).filter((i): i is string => Boolean(i)).sort()),
    db.user.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, email: true } }),
    db.smartList.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }),
  ]);

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    businessName: l.businessName,
    website: l.website,
    industry: l.industry,
    city: l.city,
    state: l.state,
    phone: l.phone,
    opportunityScore: l.opportunityScore,
    status: l.status,
    labelsJson: l.labelsJson,
    favorited: l.favorited,
    updatedAt: l.updatedAt.toISOString(),
    owner: l.owner,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilterCount = Object.entries(sp).filter(([k, v]) => v && !["page", "sort"].includes(k)).length;

  return (
    <div>
      <PageHeader
        title="Lead Intelligence"
        description={`${total} lead${total === 1 ? "" : "s"}${activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}`}
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/lead-finder">
              <Button variant="secondary">Find leads</Button>
            </Link>
            <Link href="/dashboard/leads/new">
              <Button>
                <Plus size={15} /> New Lead
              </Button>
            </Link>
          </div>
        }
      />

      <div className="px-6 py-5">
        <SmartListsBar lists={smartLists} />
        <LeadFilterBar filters={sp} industries={industries} owners={owners} />

        {leads.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <Target size={28} className="mb-3 text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No leads match these filters</p>
            <p className="mt-1 text-sm text-fg-muted">Try widening your filters, or run the Lead Finder to discover real businesses nearby.</p>
            <Link href="/dashboard/leads/new" className="mt-4">
              <Button>
                <Plus size={15} /> New Lead
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <DeleteAllLeadsButton filters={sp} total={total} activeFilterCount={activeFilterCount} />
              <SaveSmartListButton filters={sp} resultCount={total} />
            </div>
            <Card className="overflow-hidden p-0">
              <LeadsTable leads={rows} isAdmin={isAdmin} />
            </Card>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                {page > 1 && (
                  <Link href={{ query: { ...sp, page: String(page - 1) } }} className="text-fg-muted hover:text-fg">
                    ← Prev
                  </Link>
                )}
                <span className="text-fg-subtle">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link href={{ query: { ...sp, page: String(page + 1) } }} className="text-fg-muted hover:text-fg">
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
