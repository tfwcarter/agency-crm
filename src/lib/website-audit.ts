import * as cheerio from "cheerio";

const USER_AGENT = "AgencyCRM-WebsiteAuditor/0.1 (contact: dev@agency.local)";
const FETCH_TIMEOUT_MS = 8000;
const ANALYTICS_PATTERNS = [/googletagmanager\.com\/gtag/i, /google-analytics\.com/i, /gtag\(/i];
const GTM_PATTERNS = [/googletagmanager\.com\/gtm\.js/i, /GTM-[A-Z0-9]+/];
const PIXEL_PATTERNS = [/fbq\(/i, /connect\.facebook\.net\/.*\/fbevents\.js/i];
const TIKTOK_PIXEL_PATTERNS = [/ttq\.load\(/i, /analytics\.tiktok\.com/i];
const LINKEDIN_INSIGHT_PATTERNS = [/snap\.licdn\.com\/li\.lms-analytics/i, /_linkedin_partner_id/i];
const BOOKING_PATTERNS = [/calendly\.com/i, /acuityscheduling\.com/i, /squareup\.com\/appointments/i, /book(ing)?[-\s]?(now|online|appointment)/i];
const PRIVACY_PATTERNS = /privacy[\s-]?policy/i;
const CHAT_WIDGETS: Array<{ vendor: string; pattern: RegExp }> = [
  { vendor: "Intercom", pattern: /widget\.intercom\.io|Intercom\(/i },
  { vendor: "Drift", pattern: /js\.driftt\.com|drift\.load\(/i },
  { vendor: "Tawk.to", pattern: /embed\.tawk\.to/i },
  { vendor: "Zendesk Chat", pattern: /zdassets\.com|zopim/i },
  { vendor: "Crisp", pattern: /client\.crisp\.chat/i },
  { vendor: "Facebook Messenger", pattern: /fb-customerchat|sdk\/xfbml\.customerchat/i },
  { vendor: "LiveChat", pattern: /cdn\.livechatinc\.com/i },
];
const TECH_SIGNATURES: Array<{ name: string; pattern: RegExp }> = [
  { name: "WordPress", pattern: /wp-content|wp-includes/i },
  { name: "Shopify", pattern: /cdn\.shopify\.com/i },
  { name: "Wix", pattern: /wix\.com|wixstatic\.com/i },
  { name: "Squarespace", pattern: /squarespace\.com/i },
  { name: "Webflow", pattern: /webflow\.com|\.webflow\.io/i },
  { name: "GoDaddy Website Builder", pattern: /godaddy/i },
  { name: "Next.js", pattern: /_next\/static/i },
  { name: "Elementor", pattern: /elementor/i },
  { name: "WooCommerce", pattern: /woocommerce/i },
  { name: "HubSpot", pattern: /js\.hs-scripts\.com|hubspot/i },
];

export interface WebsiteAuditResult {
  reachable: boolean;
  hasSsl: boolean;
  responseTimeMs: number | null;

  overallScore: number;
  designScore: number;
  seoScore: number;
  speedScore: number;
  mobileScore: number;
  accessibilityScore: number;

  hasGoogleAnalytics: boolean;
  hasGoogleTagManager: boolean;
  hasMetaPixel: boolean;
  hasTikTokPixel: boolean;
  hasLinkedInInsight: boolean;
  hasContactForm: boolean;
  hasBookingLink: boolean;
  hasViewportMeta: boolean;
  hasSchema: boolean;
  hasOpenGraph: boolean;
  hasFavicon: boolean;
  hasPrivacyPolicy: boolean;
  hasChatWidget: boolean;
  chatWidgetVendor: string | null;
  brokenLinkCount: number;
  copyrightYear: number | null;
  techStack: string[];
  cfRay: boolean; // served through Cloudflare

  findings: string[];
  recommendations: string[];
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPageSpeedScore(url: string, apiKey: string | null): Promise<number | null> {
  if (!apiKey) return null;

  try {
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("key", apiKey);
    endpoint.searchParams.set("strategy", "mobile");
    endpoint.searchParams.set("category", "performance");

    const res = await fetchWithTimeout(endpoint.toString(), 20000);
    if (!res.ok) return null;

    const json = (await res.json()) as { lighthouseResult?: { categories?: { performance?: { score?: number } } } };
    const raw = json.lighthouseResult?.categories?.performance?.score;
    return typeof raw === "number" ? Math.round(raw * 100) : null;
  } catch {
    return null;
  }
}

async function checkBrokenLinks(links: string[]): Promise<number> {
  const sample = links.slice(0, 5);
  let broken = 0;

  await Promise.all(
    sample.map(async (link) => {
      try {
        const res = await fetchWithTimeout(link, 5000, { method: "HEAD", headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) broken += 1;
      } catch {
        broken += 1;
      }
    })
  );

  return broken;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function auditWebsite(rawUrl: string, pagespeedApiKey: string | null = null): Promise<WebsiteAuditResult> {
  const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const start = Date.now();
  let reachable = false;
  let html = "";
  let cfRay = false;

  try {
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
    });
    reachable = res.ok;
    cfRay = res.headers.has("cf-ray") || (res.headers.get("server") ?? "").toLowerCase().includes("cloudflare");
    html = await res.text();
  } catch {
    reachable = false;
  }

  const responseTimeMs = Date.now() - start;
  const hasSsl = url.startsWith("https://");

  if (!reachable || !html) {
    return {
      reachable,
      hasSsl,
      responseTimeMs: null,
      overallScore: 5,
      designScore: 5,
      seoScore: 5,
      speedScore: 5,
      mobileScore: 5,
      accessibilityScore: 5,
      hasGoogleAnalytics: false,
      hasGoogleTagManager: false,
      hasMetaPixel: false,
      hasTikTokPixel: false,
      hasLinkedInInsight: false,
      hasContactForm: false,
      hasBookingLink: false,
      hasViewportMeta: false,
      hasSchema: false,
      hasOpenGraph: false,
      hasFavicon: false,
      hasPrivacyPolicy: false,
      hasChatWidget: false,
      chatWidgetVendor: null,
      brokenLinkCount: 0,
      copyrightYear: null,
      techStack: [],
      cfRay: false,
      findings: ["Site could not be reached — it may be down, blocking automated requests, or the URL is incorrect."],
      recommendations: ["Confirm the domain is live and pointed correctly, then re-run this audit."],
    };
  }

  const $ = cheerio.load(html);

  const hasTitle = $("title").text().trim().length > 0;
  const hasMetaDescription = ($('meta[name="description"]').attr("content")?.trim().length ?? 0) > 0;
  const hasViewportMeta = $('meta[name="viewport"]').length > 0;
  const hasOpenGraph = $('meta[property^="og:"]').length > 0;
  const hasSchema = $('script[type="application/ld+json"]').length > 0;
  const hasFavicon = $('link[rel*="icon"]').length > 0;
  const hasForm = $("form").length > 0;
  const hasPrivacyPolicy = $("a").toArray().some((el) => PRIVACY_PATTERNS.test($(el).text()) || PRIVACY_PATTERNS.test($(el).attr("href") ?? ""));

  const bodyText = $("body").text();
  const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;

  const copyrightMatch = bodyText.match(/(?:©|copyright)\s*(\d{4})/gi);
  const copyrightYear = copyrightMatch
    ? Math.max(...copyrightMatch.map((m) => parseInt(m.match(/\d{4}/)?.[0] ?? "0", 10)))
    : null;

  const images = $("img");
  const imageCount = images.length;
  let imagesMissingAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (!alt || !alt.trim()) imagesMissingAlt += 1;
  });

  const headingCount = $("h1, h2, h3").length;

  let hasPhoneLink = false;
  let hasCallToAction = false;
  let hasBookingLink = false;
  const ctaPattern = /(book now|schedule|get a quote|contact us|call now|request|sign up|get started|free estimate)/i;
  const linkSet = new Set<string>();

  $("a[href], button").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text();
    if (href.startsWith("tel:")) hasPhoneLink = true;
    if (ctaPattern.test(text)) hasCallToAction = true;
    if (BOOKING_PATTERNS.some((p) => p.test(href) || p.test(text))) hasBookingLink = true;
    if (href.startsWith("http")) {
      try {
        linkSet.add(new URL(href).toString());
      } catch {
        // ignore malformed links
      }
    }
  });

  const hasGoogleAnalytics = ANALYTICS_PATTERNS.some((p) => p.test(html));
  const hasGoogleTagManager = GTM_PATTERNS.some((p) => p.test(html));
  const hasMetaPixel = PIXEL_PATTERNS.some((p) => p.test(html));
  const hasTikTokPixel = TIKTOK_PIXEL_PATTERNS.some((p) => p.test(html));
  const hasLinkedInInsight = LINKEDIN_INSIGHT_PATTERNS.some((p) => p.test(html));

  const matchedWidget = CHAT_WIDGETS.find((w) => w.pattern.test(html));
  const hasChatWidget = Boolean(matchedWidget);
  const chatWidgetVendor = matchedWidget?.vendor ?? null;

  const techStack = TECH_SIGNATURES.filter((t) => t.pattern.test(html)).map((t) => t.name);
  if (cfRay) techStack.push("Cloudflare");

  const [pageSpeedApiScore, brokenLinkCount] = await Promise.all([
    fetchPageSpeedScore(url, pagespeedApiKey),
    checkBrokenLinks(Array.from(linkSet)),
  ]);

  let speedScore: number;
  if (pageSpeedApiScore !== null) {
    speedScore = pageSpeedApiScore;
  } else {
    let heuristic = 100;
    if (responseTimeMs > 1000) heuristic -= 15;
    if (responseTimeMs > 2500) heuristic -= 25;
    if (imageCount > 20) heuristic -= 10;
    speedScore = clamp(heuristic);
  }

  const mobileScore = clamp(
    (hasViewportMeta ? 60 : 15) + (hasCallToAction ? 15 : 0) + (hasPhoneLink ? 15 : 0) + (wordCount > 50 ? 10 : 0)
  );

  const seoScore = clamp(
    (hasTitle ? 20 : 0) +
      (hasMetaDescription ? 20 : 0) +
      (hasOpenGraph ? 12 : 0) +
      (hasSchema ? 12 : 0) +
      (wordCount > 300 ? 16 : wordCount > 100 ? 8 : 0) +
      (headingCount > 0 ? 12 : 0) +
      (hasSsl ? 8 : 0)
  );

  const accessibilityScore = clamp(
    (imageCount === 0 ? 70 : (1 - imagesMissingAlt / imageCount) * 70) +
      (hasViewportMeta ? 15 : 0) +
      (hasTitle ? 15 : 0)
  );

  const designScore = clamp(
    (hasFavicon ? 15 : 0) +
      (hasCallToAction ? 20 : 0) +
      (hasForm ? 15 : 0) +
      (headingCount > 0 ? 15 : 0) +
      (imageCount > 0 ? 15 : 0) +
      (hasOpenGraph ? 10 : 0) +
      (wordCount > 150 ? 10 : 0)
  );

  const overallScore = clamp(seoScore * 0.25 + speedScore * 0.25 + mobileScore * 0.2 + designScore * 0.2 + accessibilityScore * 0.1);

  const findings: string[] = [];
  const recommendations: string[] = [];

  if (!hasSsl) {
    findings.push("No SSL certificate (site is not served over HTTPS).");
    recommendations.push("Install an SSL certificate — browsers flag non-HTTPS sites as \"Not Secure,\" which kills trust and conversions.");
  }
  if (!hasTitle) {
    findings.push("Missing page title tag.");
    recommendations.push("Add a keyword-rich <title> tag to every page for basic SEO visibility.");
  }
  if (!hasMetaDescription) {
    findings.push("Missing meta description.");
    recommendations.push("Write a compelling meta description so the site stands out in Google search results.");
  }
  if (!hasViewportMeta) {
    findings.push("No mobile viewport meta tag — the site likely isn't mobile-responsive.");
    recommendations.push("Rebuild with a responsive, mobile-first layout — over 60% of local searches happen on mobile.");
  }
  if (!hasCallToAction) {
    findings.push("No clear call-to-action found (e.g. \"Book Now\", \"Get a Quote\").");
    recommendations.push("Add a prominent, above-the-fold call-to-action button to turn visitors into leads.");
  }
  if (!hasForm && !hasPhoneLink) {
    findings.push("No contact form or click-to-call phone link detected.");
    recommendations.push("Add a lead capture form and a tap-to-call phone number so mobile visitors can reach you instantly.");
  }
  if (!hasBookingLink) {
    findings.push("No online booking/scheduling system detected.");
    recommendations.push("Add 24/7 online booking so customers can schedule without calling during business hours.");
  }
  if (!hasGoogleAnalytics && !hasGoogleTagManager) {
    findings.push("No Google Analytics / Tag Manager detected.");
    recommendations.push("Install analytics tracking so every marketing dollar spent can be measured.");
  }
  if (!hasMetaPixel) {
    findings.push("No Meta (Facebook) Pixel detected.");
    recommendations.push("Install the Meta Pixel to enable retargeting and track Facebook/Instagram ad performance.");
  }
  if (!hasSchema) {
    findings.push("No structured data (Schema.org) found.");
    recommendations.push("Add local business schema markup to improve rich results and local search visibility.");
  }
  if (!hasChatWidget) {
    findings.push("No live chat or chatbot widget detected.");
    recommendations.push("Add an AI chatbot or live chat widget to capture visitors who won't fill out a form or call.");
  }
  if (!hasPrivacyPolicy) {
    findings.push("No privacy policy link found.");
    recommendations.push("Add a privacy policy — required for running Meta/Google ads and builds visitor trust.");
  }
  if (brokenLinkCount > 0) {
    findings.push(`${brokenLinkCount} broken link${brokenLinkCount > 1 ? "s" : ""} detected in a sample check.`);
    recommendations.push("Fix broken links — they hurt SEO rankings and make the business look unmaintained.");
  }
  if (copyrightYear !== null && copyrightYear < new Date().getFullYear() - 1) {
    findings.push(`Footer copyright year (${copyrightYear}) is outdated.`);
    recommendations.push("Refresh the site — an old copyright year signals the business hasn't touched its website in years.");
  }
  if (imageCount > 0 && imagesMissingAlt / imageCount > 0.5) {
    findings.push(`${imagesMissingAlt} of ${imageCount} images are missing alt text.`);
    recommendations.push("Add descriptive alt text to images for accessibility and image-search SEO.");
  }
  if (speedScore < 60) {
    findings.push("Page loads slowly, which hurts both rankings and conversions.");
    recommendations.push("Optimize image sizes, enable caching, and reduce third-party scripts to speed up load time.");
  }
  if (findings.length === 0) {
    findings.push("Solid technical foundation — no major red flags found in this automated scan.");
    recommendations.push("Focus on content, SEO depth, and paid acquisition to grow traffic from here.");
  }

  return {
    reachable,
    hasSsl,
    responseTimeMs,
    overallScore,
    designScore,
    seoScore,
    speedScore,
    mobileScore,
    accessibilityScore,
    hasGoogleAnalytics,
    hasGoogleTagManager,
    hasMetaPixel,
    hasTikTokPixel,
    hasLinkedInInsight,
    hasContactForm: hasForm,
    hasBookingLink,
    hasViewportMeta,
    hasSchema,
    hasOpenGraph,
    hasFavicon,
    hasPrivacyPolicy,
    hasChatWidget,
    chatWidgetVendor,
    brokenLinkCount,
    copyrightYear,
    techStack,
    cfRay,
    findings,
    recommendations,
  };
}
