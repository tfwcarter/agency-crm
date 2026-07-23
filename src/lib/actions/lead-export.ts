"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const HEADERS = [
  "Business Name",
  "Owner Name",
  "Phone",
  "Email",
  "Website",
  "Industry",
  "City",
  "State",
  "Opportunity Score",
  "Status",
  "Recommended Services",
  "Est. Setup",
  "Est. Monthly",
  "Assigned Rep",
];

export async function exportLeadsCsvAction(leadIds: string[]): Promise<{ csv: string; filename: string }> {
  const session = await requireSession();
  const leads = await db.lead.findMany({
    where: { id: { in: leadIds }, organizationId: session.user.organizationId },
    include: { owner: true },
    orderBy: { opportunityScore: "desc" },
  });

  const rows = leads.map((l) => {
    const services: string[] = l.recommendedServicesJson ? JSON.parse(l.recommendedServicesJson) : [];
    return [
      l.businessName,
      l.ownerName,
      l.phone,
      l.email,
      l.website,
      l.industry,
      l.city,
      l.state,
      l.opportunityScore,
      l.status,
      services.join("; "),
      l.estimatedDealSetup,
      l.estimatedDealMonthly,
      l.owner?.name ?? l.owner?.email,
    ]
      .map(csvCell)
      .join(",");
  });

  const csv = [HEADERS.join(","), ...rows].join("\n");
  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}
