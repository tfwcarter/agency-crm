export interface LeadSignals {
  hasWebsite: boolean;
  websiteReachable: boolean | null;
  hasSsl: boolean | null;
  speedScore: number | null;
  seoScore: number | null;
  mobileScore: number | null;
  designScore: number | null;
  accessibilityScore: number | null;
  hasGoogleAnalytics: boolean | null;
  hasGoogleTagManager: boolean | null;
  hasMetaPixel: boolean | null;
  hasSchema: boolean | null;
  hasOpenGraph: boolean | null;
  hasFavicon: boolean | null;
  hasPrivacyPolicy: boolean | null;
  hasChatWidget: boolean | null;
  hasBookingLink: boolean | null;
  hasContactForm: boolean | null;
  hasViewportMeta: boolean | null;
  brokenLinkCount: number | null;
  copyrightYear: number | null;
  domainCreatedAt: Date | null;
  googleRating: number | null;
  googleReviews: number | null;
  hasFacebook: boolean;
  hasInstagram: boolean;
  hasLinkedIn: boolean;
  hasTikTok: boolean;
}

export interface ScoreFactor {
  factor: string;
  points: number;
  detail: string;
}

export interface RecommendedService {
  service: string;
  projectType: string | null; // maps to Project.type for historical setup-price lookup
  clientServiceKeywords: string[]; // matched against ClientService.name for historical monthly-price lookup
}

export interface LeadScoreResult {
  opportunityScore: number;
  breakdown: ScoreFactor[];
  labels: string[];
  recommendations: RecommendedService[];
}

function domainAgeYears(domainCreatedAt: Date | null): number | null {
  if (!domainCreatedAt) return null;
  return (Date.now() - domainCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Deterministic, fully explainable opportunity scoring — every point is traceable to a
 * real, live-detected signal (see src/lib/website-audit.ts and src/lib/enrichment/*).
 * Nothing here is guessed or AI-hallucinated; an optional AI pass can prose-ify this
 * breakdown afterward (see generateAiText call sites) but never overrides the numbers.
 */
export function scoreLead(signals: LeadSignals): LeadScoreResult {
  const breakdown: ScoreFactor[] = [];
  const labels: string[] = [];
  const recommendations: RecommendedService[] = [];
  const addedServices = new Set<string>();

  function addService(service: string, projectType: string | null, keywords: string[]) {
    if (addedServices.has(service)) return;
    addedServices.add(service);
    recommendations.push({ service, projectType, clientServiceKeywords: keywords });
  }

  let score = 0;
  const age = domainAgeYears(signals.domainCreatedAt);

  if (!signals.hasWebsite) {
    score += 70;
    breakdown.push({ factor: "No website", points: 70, detail: "This business has no website on file at all." });
    labels.push("🚨 Website Needed");
    addService("Website Design & Development", "website", ["website", "web design"]);
  } else if (signals.websiteReachable === false) {
    score += 60;
    breakdown.push({ factor: "Website unreachable", points: 60, detail: "The website exists but could not be reached — likely down or misconfigured." });
    labels.push("🚨 Website Needed");
    addService("Website Design & Development", "website", ["website", "web design"]);
  } else {
    score += 8;
    breakdown.push({ factor: "Has a live website", points: 8, detail: "Baseline opportunity — every real business has room to improve." });

    if (signals.hasSsl === false) {
      score += 8;
      breakdown.push({ factor: "No SSL certificate", points: 8, detail: "Site is served over plain HTTP; browsers flag it as \"Not Secure.\"" });
    }

    if (signals.speedScore !== null) {
      if (signals.speedScore < 50) {
        score += 8;
        breakdown.push({ factor: "Very slow website", points: 8, detail: `Speed score ${signals.speedScore}/100.` });
        labels.push("🐌 Slow Website");
      } else if (signals.speedScore < 70) {
        score += 4;
        breakdown.push({ factor: "Slow website", points: 4, detail: `Speed score ${signals.speedScore}/100.` });
      }
    }

    if (signals.seoScore !== null) {
      if (signals.seoScore < 50) {
        score += 8;
        breakdown.push({ factor: "Weak SEO fundamentals", points: 8, detail: `SEO score ${signals.seoScore}/100.` });
        labels.push("📈 SEO Opportunity");
        addService("SEO", "seo", ["seo"]);
      } else if (signals.seoScore < 70) {
        score += 4;
        breakdown.push({ factor: "Middling SEO", points: 4, detail: `SEO score ${signals.seoScore}/100.` });
        addService("SEO", "seo", ["seo"]);
      }
    }

    if (signals.mobileScore !== null && signals.mobileScore < 60) {
      score += signals.mobileScore < 40 ? 8 : 4;
      breakdown.push({ factor: "Poor mobile experience", points: signals.mobileScore < 40 ? 8 : 4, detail: `Mobile score ${signals.mobileScore}/100.` });
      labels.push("📵 Not Mobile Friendly");
      addService("Mobile-Responsive Redesign", "website", ["website", "web design"]);
    }

    if (signals.designScore !== null && signals.designScore < 50) {
      score += 6;
      breakdown.push({ factor: "Dated/weak design", points: 6, detail: `Design score ${signals.designScore}/100.` });
      addService("Website Redesign", "website", ["website", "web design"]);
    }

    if (signals.hasSchema === false) {
      score += 4;
      breakdown.push({ factor: "No structured data", points: 4, detail: "No Schema.org markup — misses local search rich results." });
    }
    if (signals.hasOpenGraph === false) {
      score += 2;
      breakdown.push({ factor: "No Open Graph tags", points: 2, detail: "Links shared on social media won't show a preview card." });
    }
    if (signals.hasFavicon === false) {
      score += 2;
      breakdown.push({ factor: "No favicon", points: 2, detail: "Missing browser tab icon — small but visible polish gap." });
    }
    if (signals.hasPrivacyPolicy === false) {
      score += 3;
      breakdown.push({ factor: "No privacy policy", points: 3, detail: "Required to legally run Meta or Google ads." });
    }
    if (signals.hasBookingLink === false) {
      score += 5;
      breakdown.push({ factor: "No online booking", points: 5, detail: "Customers can only reach them by phone during business hours." });
      addService("Online Booking System", "automation", ["booking", "automation"]);
    }
    if (signals.hasContactForm === false) {
      score += 5;
      breakdown.push({ factor: "No contact form", points: 5, detail: "No way to capture a lead without calling." });
    }
    if (signals.hasGoogleAnalytics === false && signals.hasGoogleTagManager === false) {
      score += 6;
      breakdown.push({ factor: "No analytics tracking", points: 6, detail: "They can't measure what's working — an easy, credible opening line." });
    }
    if (signals.hasMetaPixel === false) {
      score += 5;
      breakdown.push({ factor: "No Meta Pixel", points: 5, detail: "Can't retarget site visitors or measure Facebook/Instagram ad performance." });
      addService("Meta Pixel & Ads Setup", "facebook_ads", ["facebook ads", "meta ads", "social ads"]);
    }
    if (signals.hasChatWidget === false) {
      score += 4;
      breakdown.push({ factor: "No chatbot / live chat", points: 4, detail: "Visitors who won't call or fill out a form just leave." });
      labels.push("🤖 Automation Opportunity");
      addService("AI Chatbot", "automation", ["chatbot", "automation", "ai"]);
    }
    if (signals.brokenLinkCount) {
      const pts = Math.min(9, signals.brokenLinkCount * 3);
      score += pts;
      breakdown.push({ factor: "Broken links", points: pts, detail: `${signals.brokenLinkCount} broken link(s) found in a sample check.` });
    }
    if (signals.copyrightYear !== null && signals.copyrightYear < new Date().getFullYear() - 1) {
      score += 5;
      breakdown.push({ factor: "Outdated copyright year", points: 5, detail: `Footer still says ${signals.copyrightYear} — site hasn't been touched in years.` });
      labels.push("🕸️ Stale Website");
      addService("Website Redesign", "website", ["website", "web design"]);
    }
    if (age !== null && age > 6) {
      score += 5;
      breakdown.push({ factor: "Old domain, likely aging site", points: 5, detail: `Domain registered ${age.toFixed(0)} years ago.` });
      labels.push("🕸️ Stale Website");
      addService("Website Redesign", "website", ["website", "web design"]);
    }
    if (age !== null && age < 1) {
      labels.push("⚡ Recently Launched");
    }
  }

  const hasAnySocial = signals.hasFacebook || signals.hasInstagram || signals.hasLinkedIn || signals.hasTikTok;
  if (!hasAnySocial) {
    score += 3;
    breakdown.push({ factor: "No social profiles linked", points: 3, detail: "No Facebook, Instagram, LinkedIn, or TikTok presence found on their site." });
    labels.push("📱 Social Opportunity");
    addService("Social Media Management", null, ["social media", "social"]);
  }

  if (signals.googleRating !== null || signals.googleReviews !== null) {
    const lowRating = signals.googleRating !== null && signals.googleRating < 4.0;
    const lowCount = signals.googleReviews !== null && signals.googleReviews < 10;
    if (lowRating || lowCount) {
      score += 5;
      breakdown.push({
        factor: "Weak review profile",
        points: 5,
        detail: [lowRating ? `${signals.googleRating}★ rating` : null, lowCount ? `${signals.googleReviews} reviews` : null].filter(Boolean).join(", "),
      });
      labels.push("⭐ Reputation Opportunity");
      addService("Reputation Management", null, ["reputation", "reviews"]);
    }
  }

  const opportunityScore = Math.max(0, Math.min(100, Math.round(score)));
  if (opportunityScore >= 75) labels.unshift("🔥 Hot Lead");

  return { opportunityScore, breakdown, labels: Array.from(new Set(labels)), recommendations };
}
