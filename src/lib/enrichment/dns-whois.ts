const USER_AGENT = "AgencyCRM-LeadIntelligence/0.1 (contact: dev@agency.local)";

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractDomain(rawUrl: string): string | null {
  try {
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface DoHAnswer {
  name: string;
  type: number;
  data: string;
}

/**
 * DNS-over-HTTPS via Cloudflare's free, keyless public resolver. No API key,
 * no rate-limit account required — this is a standard public DNS service.
 */
async function queryDns(domain: string, type: "NS" | "MX"): Promise<DoHAnswer[]> {
  try {
    const res = await fetchWithTimeout(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, 5000, {
      headers: { Accept: "application/dns-json", "User-Agent": USER_AGENT },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { Answer?: DoHAnswer[] };
    return json.Answer ?? [];
  } catch {
    return [];
  }
}

const DNS_PROVIDERS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Cloudflare", pattern: /cloudflare\.com/i },
  { label: "AWS Route 53", pattern: /awsdns/i },
  { label: "GoDaddy", pattern: /domaincontrol\.com/i },
  { label: "Google Domains", pattern: /googledomains\.com|google\.com/i },
  { label: "Namecheap", pattern: /registrar-servers\.com/i },
  { label: "Squarespace", pattern: /squarespace\.com/i },
  { label: "Network Solutions", pattern: /worldnic\.com|networksolutions\.com/i },
  { label: "DNSimple", pattern: /dnsimple\.com/i },
  { label: "Wix", pattern: /wixdns\.net/i },
];

const MX_PROVIDERS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Google Workspace", pattern: /google\.com|googlemail\.com|aspmx\.l\.google\.com/i },
  { label: "Microsoft 365", pattern: /outlook\.com|protection\.outlook\.com/i },
  { label: "Zoho Mail", pattern: /zoho\.com/i },
  { label: "GoDaddy Email", pattern: /secureserver\.net/i },
  { label: "ProtonMail", pattern: /protonmail\.ch/i },
  { label: "Mailgun", pattern: /mailgun\.org/i },
];

function matchProvider(records: DoHAnswer[], providers: Array<{ label: string; pattern: RegExp }>): string | null {
  for (const record of records) {
    const match = providers.find((p) => p.pattern.test(record.data));
    if (match) return match.label;
  }
  if (records.length > 0) {
    // Fall back to the registrable domain of the first record, e.g. "ns1.somehost.com" -> "somehost.com"
    const parts = records[0].data.replace(/\.$/, "").split(".");
    if (parts.length >= 2) return parts.slice(-2).join(".");
  }
  return null;
}

interface RdapEvent {
  eventAction: string;
  eventDate: string;
}

/**
 * Domain registration date via RDAP (the modern, standardized successor to WHOIS).
 * rdap.org is a free public bootstrap redirector — no API key, no account.
 */
async function fetchDomainCreatedAt(domain: string): Promise<Date | null> {
  try {
    const res = await fetchWithTimeout(`https://rdap.org/domain/${encodeURIComponent(domain)}`, 8000, {
      headers: { Accept: "application/rdap+json", "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { events?: RdapEvent[] };
    const registration = json.events?.find((e) => e.eventAction === "registration");
    return registration ? new Date(registration.eventDate) : null;
  } catch {
    return null;
  }
}

export interface DomainIntel {
  dnsProvider: string | null;
  mxProvider: string | null;
  domainCreatedAt: Date | null;
}

export async function lookupDomainIntel(websiteUrl: string): Promise<DomainIntel> {
  const domain = extractDomain(websiteUrl);
  if (!domain) return { dnsProvider: null, mxProvider: null, domainCreatedAt: null };

  const [nsRecords, mxRecords, domainCreatedAt] = await Promise.all([
    queryDns(domain, "NS"),
    queryDns(domain, "MX"),
    fetchDomainCreatedAt(domain),
  ]);

  return {
    dnsProvider: matchProvider(nsRecords, DNS_PROVIDERS),
    mxProvider: matchProvider(mxRecords, MX_PROVIDERS),
    domainCreatedAt,
  };
}
