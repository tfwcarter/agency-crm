import { db } from "@/lib/db";
import type { RecommendedService } from "@/lib/lead-scoring";

export interface DealEstimate {
  setup: number | null;
  monthly: number | null;
  basis: string[]; // human-readable notes on where each number came from
}

/**
 * Estimates a deal's value from the AGENCY'S OWN historical closed data — average
 * Project.budget for matching project types, and average ClientService.price for
 * matching recurring services. No industry-average guesswork: if the org has no
 * history for a given service yet, that piece is simply omitted (null), never
 * invented. This is real data no external lead-gen tool (Apollo, ZoomInfo, etc)
 * can offer, because it's specific to this agency's own pricing.
 */
export async function estimateDealValue(organizationId: string, recommendations: RecommendedService[]): Promise<DealEstimate> {
  const basis: string[] = [];
  let setup = 0;
  let monthly = 0;
  let hasSetup = false;
  let hasMonthly = false;

  const projectTypes = Array.from(new Set(recommendations.map((r) => r.projectType).filter((t): t is string => Boolean(t))));

  if (projectTypes.length > 0) {
    const projects = await db.project.groupBy({
      by: ["type"],
      where: { organizationId, type: { in: projectTypes }, budget: { gt: 0 } },
      _avg: { budget: true },
      _count: { _all: true },
    });
    for (const p of projects) {
      const avg = p._avg.budget ?? 0;
      if (avg > 0) {
        setup += avg;
        hasSetup = true;
        basis.push(`${p.type.replace(/_/g, " ")}: avg $${Math.round(avg).toLocaleString()} from ${p._count._all} past project(s)`);
      }
    }
  }

  const keywordSet = Array.from(new Set(recommendations.flatMap((r) => r.clientServiceKeywords)));
  if (keywordSet.length > 0) {
    const services = await db.clientService.findMany({
      where: {
        client: { organizationId },
        OR: keywordSet.map((kw) => ({ name: { contains: kw } })),
        price: { gt: 0 },
      },
      select: { name: true, price: true },
    });
    if (services.length > 0) {
      const avgMonthly = services.reduce((s, x) => s + x.price, 0) / services.length;
      monthly += avgMonthly;
      hasMonthly = true;
      basis.push(`Recurring services: avg $${Math.round(avgMonthly).toLocaleString()}/mo from ${services.length} client service(s)`);
    }
  }

  return { setup: hasSetup ? Math.round(setup) : null, monthly: hasMonthly ? Math.round(monthly) : null, basis };
}
