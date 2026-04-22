/**
 * AI Contact Scoring Service
 *
 * Rule-based scoring system that evaluates contacts based on engagement,
 * company attributes, behavior patterns, and fit indicators.
 *
 * Scoring Weights:
 * - Engagement: 30%
 * - Company: 25%
 * - Behavior: 25%
 * - Fit: 20%
 */

/**
 * Calculate AI score for a contact (0-100)
 * @param {Object} contact - Contact object
 * @param {Object} company - Associated company object (optional)
 * @param {Array} activities - Array of activities (optional)
 * @returns {number} Score from 0 to 100
 */
export function calculateContactScore(
  contact,
  company = null,
  activities = [],
) {
  const score = {
    engagement: calculateEngagementScore(contact, activities),
    company: calculateCompanyScore(contact, company),
    behavior: calculateBehaviorScore(contact, activities),
    fit: calculateFitScore(contact),
  };

  // Apply weights
  const totalScore =
    score.engagement * 0.3 +
    score.company * 0.25 +
    score.behavior * 0.25 +
    score.fit * 0.2;

  return Math.round(Math.min(100, Math.max(0, totalScore)));
}

/**
 * Calculate engagement score (0-100)
 * Factors: recent activity (7 days), email presence, multiple interactions
 */
function calculateEngagementScore(contact, activities = []) {
  let score = 0;

  // Recent activity (7 days)
  const recentActivities = activities.filter((a) => {
    const activityDate = new Date(a.date || a.created_at);
    const daysSince =
      (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  });

  if (recentActivities.length > 0) {
    score += 30;
  }

  // Has email
  if (contact.email) {
    score += 10;
  }

  // Multiple interactions (3+)
  if (activities.length >= 3) {
    score += 15;
  }

  return Math.min(100, score);
}

/**
 * Calculate company score (0-100)
 * Factors: enterprise (500+ employees), mid-market (100+), known industry
 */
function calculateCompanyScore(contact, company = null) {
  let score = 0;

  const companyData = company || contact.company;

  if (!companyData) {
    return score;
  }

  const employees = companyData.employees || companyData.employee_count || 0;
  const industry = (companyData.industry || "").toLowerCase();
  const size = (companyData.size || "").toLowerCase();

  // Enterprise company (500+ employees)
  if (employees >= 500 || size === "enterprise") {
    score += 25;
  } else if (employees >= 100 || size === "mid-market") {
    score += 15;
  }

  // Known industry
  const knownIndustries = [
    "technology",
    "finance",
    "healthcare",
    "retail",
    "manufacturing",
    "software",
    "saas",
    "consulting",
    "real estate",
    "education",
  ];

  if (knownIndustries.some((ind) => industry.includes(ind))) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Calculate behavior score (0-100)
 * Factors: email opens (5+), website visits (30 days), content downloads
 */
function calculateBehaviorScore(contact, activities = []) {
  let score = 0;

  // Count email-related activities
  const emailActivities = activities.filter(
    (a) =>
      a.type === "email" ||
      a.type === "Email" ||
      a.title?.toLowerCase().includes("email"),
  );

  // Email opens (5+)
  if (emailActivities.length >= 5) {
    score += 20;
  }

  // Website visits in last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const websiteVisits = activities.filter((a) => {
    const activityDate = new Date(a.date || a.created_at);
    return (
      activityDate.getTime() >= thirtyDaysAgo &&
      (a.type === "website_visit" || a.title?.toLowerCase().includes("website"))
    );
  });

  if (websiteVisits.length > 0) {
    score += 15;
  }

  // Content downloads
  const downloads = activities.filter(
    (a) =>
      a.title?.toLowerCase().includes("download") ||
      a.type === "download" ||
      a.title?.toLowerCase().includes("whitepaper"),
  );

  if (downloads.length > 0) {
    score += 15;
  }

  return Math.min(100, score);
}

/**
 * Calculate fit score (0-100)
 * Factors: budget indication, decision-maker roles, purchase timeline
 */
function calculateFitScore(contact) {
  let score = 0;

  // Decision-maker roles
  const authorityRoles = [
    "CEO",
    "CTO",
    "CFO",
    "COO",
    "VP",
    "Director",
    "Head of",
    "Partner",
    "Founder",
  ];
  const role = (contact.role || "").toLowerCase();

  if (authorityRoles.some((r) => role.includes(r.toLowerCase()))) {
    score += 15;
  }

  // Budget indication
  if (contact.budget || contact.budget_range || contact.deal_value) {
    score += 20;
  }

  // Purchase timeline
  if (contact.timeline || contact.purchase_timeline || contact.urgency) {
    score += 10;
  }

  // Has phone (indicates seriousness)
  if (contact.phone) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Get color class based on score
 * @param {number} score - Score from 0 to 100
 * @returns {string} CSS color class
 */
export function getScoreColor(score) {
  if (score >= 80) return "hot"; // Hot - bright red/pink
  if (score >= 60) return "warm"; // Warm - orange/yellow
  if (score >= 40) return "cool"; // Cool - blue
  return "cold"; // Cold - gray
}

/**
 * Get label based on score
 * @param {number} score - Score from 0 to 100
 * @returns {string} Score label
 */
export function getScoreLabel(score) {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  if (score >= 40) return "Cool";
  return "Cold";
}

/**
 * Get detailed breakdown of score factors
 * @param {Object} contact - Contact object
 * @param {Object} company - Associated company object
 * @param {Array} activities - Array of activities
 * @returns {Object} Score breakdown with factors
 */
export function getScoreBreakdown(contact, company = null, activities = []) {
  const scores = {
    engagement: calculateEngagementScore(contact, activities),
    company: calculateCompanyScore(contact, company),
    behavior: calculateBehaviorScore(contact, activities),
    fit: calculateFitScore(contact),
  };

  const factors = [];

  // Engagement factors
  const recentActivities = activities.filter((a) => {
    const activityDate = new Date(a.date || a.created_at);
    return (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
  });

  if (recentActivities.length > 0) {
    factors.push({
      category: "engagement",
      label: "Recent activity (7 days)",
      value: 30,
    });
  }
  if (contact.email) {
    factors.push({ category: "engagement", label: "Has email", value: 10 });
  }
  if (activities.length >= 3) {
    factors.push({
      category: "engagement",
      label: "Multiple interactions",
      value: 15,
    });
  }

  // Company factors
  const employees = company?.employees || contact.company?.employees || 0;
  if (employees >= 500) {
    factors.push({
      category: "company",
      label: "Enterprise company",
      value: 25,
    });
  } else if (employees >= 100) {
    factors.push({
      category: "company",
      label: "Mid-market company",
      value: 15,
    });
  }
  if (company?.industry) {
    factors.push({ category: "company", label: "Known industry", value: 10 });
  }

  // Behavior factors
  const emailCount = activities.filter((a) => a.type === "email").length;
  if (emailCount >= 5) {
    factors.push({
      category: "behavior",
      label: "High email engagement",
      value: 20,
    });
  }
  if (activities.some((a) => a.title?.toLowerCase().includes("download"))) {
    factors.push({
      category: "behavior",
      label: "Downloaded content",
      value: 15,
    });
  }

  // Fit factors
  const authorityRoles = ["CEO", "CTO", "CFO", "VP", "Director"];
  if (
    authorityRoles.some((r) =>
      (contact.role || "").toLowerCase().includes(r.toLowerCase()),
    )
  ) {
    factors.push({ category: "fit", label: "Decision-maker role", value: 15 });
  }
  if (contact.budget) {
    factors.push({ category: "fit", label: "Budget indication", value: 20 });
  }

  return {
    total: calculateContactScore(contact, company, activities),
    categoryScores: {
      engagement: scores.engagement,
      company: scores.company,
      behavior: scores.behavior,
      fit: scores.fit,
    },
    factors,
  };
}
