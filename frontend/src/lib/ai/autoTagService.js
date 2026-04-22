/**
 * AI Auto-Tagging Service
 *
 * Automatically tags contacts and companies based on their attributes
 * and behavior patterns.
 */

/**
 * Calculate tags for a contact
 * @param {Object} contact - Contact object
 * @param {Object} company - Associated company object (optional)
 * @param {Array} activities - Array of activities (optional)
 * @returns {Array} Array of tag strings
 */
export function calculateContactTags(contact, company = null, activities = []) {
  const tags = [];

  // High Value: score >= 80 OR enterprise
  if (
    (contact.score && contact.score >= 80) ||
    (company && (company.size === "enterprise" || company.employees >= 500))
  ) {
    tags.push("High Value");
  }

  // Decision Maker: CEO/CTO/CFO/VP/Director
  const decisionMakerRoles = [
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
  if (decisionMakerRoles.some((r) => role.includes(r.toLowerCase()))) {
    tags.push("Decision Maker");
  }

  // Tech Savvy: tech industry
  const techIndustries = [
    "technology",
    "software",
    "saas",
    "it ",
    "tech",
    "computer",
    "data",
    "cloud",
  ];
  const contactIndustry = (contact.industry || "").toLowerCase();
  const companyIndustry = (company?.industry || "").toLowerCase();

  if (
    techIndustries.some(
      (t) => contactIndustry.includes(t) || companyIndustry.includes(t),
    )
  ) {
    tags.push("Tech Savvy");
  }

  // Long-term Client: contact 90 days
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const lastContactDate = contact.last_contact
    ? new Date(contact.last_contact)
    : null;

  if (
    contact.status === "customer" &&
    lastContactDate &&
    lastContactDate.getTime() <= ninetyDaysAgo
  ) {
    tags.push("Long-term Client");
  }

  // At Risk: no contact 60+ days
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const atRiskLastContact = contact.last_contact
    ? new Date(contact.last_contact)
    : null;

  if (
    contact.status === "customer" &&
    (!atRiskLastContact || atRiskLastContact.getTime() < sixtyDaysAgo)
  ) {
    tags.push("At Risk");
  }

  // New Lead: recent creation
  if (contact.created_at) {
    const createdDate = new Date(contact.created_at);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (createdDate.getTime() >= thirtyDaysAgo) {
      tags.push("New Lead");
    }
  }

  // Engaged: high activity count
  if (activities && activities.length >= 5) {
    tags.push("Engaged");
  }

  // Has Budget: budget indication present
  if (contact.budget || contact.budget_range || contact.deal_value > 10000) {
    tags.push("Has Budget");
  }

  // International: non-US country
  const country = (contact.country || company?.country || "").toUpperCase();
  if (
    country &&
    country !== "US" &&
    country !== "USA" &&
    country !== "UNITED STATES"
  ) {
    tags.push("International");
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Calculate tags for a company
 * @param {Object} company - Company object
 * @returns {Array} Array of tag strings
 */
export function calculateCompanyTags(company) {
  const tags = [];

  if (!company) return tags;

  // Enterprise: 500+ employees
  const employees = company.employees || company.employee_count || 0;
  const size = (company.size || "").toLowerCase();

  if (employees >= 500 || size === "enterprise") {
    tags.push("Enterprise");
  }

  // Mid-Market: 100-499 employees
  if (employees >= 100 && employees < 500) {
    tags.push("Mid-Market");
  }

  // High Revenue: >$10M
  if (company.revenue) {
    const revenueValue = parseRevenue(company.revenue);
    if (revenueValue > 10000000) {
      tags.push("High Revenue");
    } else if (revenueValue > 1000000) {
      tags.push("Medium Revenue");
    }
  }

  // Tech Industry
  const techIndustries = [
    "technology",
    "software",
    "saas",
    "it",
    "tech",
    "computer",
    "data",
    "cloud",
  ];
  const industry = (company.industry || "").toLowerCase();

  if (techIndustries.some((t) => industry.includes(t))) {
    tags.push("Tech Industry");
  }

  // International: non-US
  const country = (company.country || "").toUpperCase();
  if (
    country &&
    country !== "US" &&
    country !== "USA" &&
    country !== "UNITED STATES"
  ) {
    tags.push("International");
  }

  // Startup: founded recently or small with high growth indicators
  if (company.founded) {
    const foundedYear = parseInt(company.founded);
    const currentYear = new Date().getFullYear();
    if (currentYear - foundedYear <= 5) {
      tags.push("Startup");
    }
  }

  // Known Industry
  const knownIndustries = [
    "finance",
    "healthcare",
    "retail",
    "manufacturing",
    "consulting",
    "real estate",
    "education",
    "media",
    "marketing",
    "legal",
  ];
  if (knownIndustries.some((i) => industry.includes(i))) {
    tags.push("Known Industry");
  }

  // Has Website
  if (company.website || company.domain) {
    tags.push("Has Website");
  }

  // Nonprofit (if applicable)
  if (company.type === "nonprofit" || company.type === "non-profit") {
    tags.push("Nonprofit");
  }

  // Government (if applicable)
  if (industry.includes("government") || industry.includes("public sector")) {
    tags.push("Government");
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Parse revenue string to number
 */
function parseRevenue(revenue) {
  if (typeof revenue === "number") return revenue;

  if (!revenue) return 0;

  // Remove currency symbols and commas
  const cleaned = String(revenue).replace(/[$,]/g, "");

  // Handle "M" or "B" suffix
  const multiplier = cleaned.toLowerCase().includes("b")
    ? 1000000000
    : cleaned.toLowerCase().includes("m")
      ? 1000000
      : cleaned.toLowerCase().includes("k")
        ? 1000
        : 1;

  return parseFloat(cleaned.replace(/[a-z]/gi, "")) * multiplier;
}

/**
 * Get color for tag
 * @param {string} tag - Tag name
 * @returns {string} CSS color class or hex
 */
export function getTagColor(tag) {
  const tagColors = {
    // Contact tags
    "High Value": "purple",
    "Decision Maker": "blue",
    "Tech Savvy": "cyan",
    "Long-term Client": "green",
    "At Risk": "red",
    "New Lead": "yellow",
    Engaged: "emerald",
    "Has Budget": "amber",
    International: "orange",

    // Company tags
    Enterprise: "purple",
    "Mid-Market": "blue",
    "High Revenue": "green",
    "Medium Revenue": "teal",
    "Tech Industry": "cyan",
    Startup: "lime",
    "Known Industry": "gray",
    "Has Website": "sky",
    Nonprofit: "pink",
    Government: "slate",
  };

  return tagColors[tag] || "gray";
}

/**
 * Get tag icon or emoji
 */
export function getTagIcon(tag) {
  const tagIcons = {
    "High Value": "star",
    "Decision Maker": "crown",
    "Tech Savvy": "cpu",
    "Long-term Client": "clock",
    "At Risk": "alert-triangle",
    "New Lead": "sparkles",
    Engaged: "thumbs-up",
    "Has Budget": "dollar-sign",
    International: "globe",
    Enterprise: "building",
    "Mid-Market": "building-2",
    "High Revenue": "trending-up",
    "Tech Industry": "monitor",
    Startup: "rocket",
  };

  return tagIcons[tag] || "tag";
}

/**
 * Batch calculate tags for multiple contacts
 */
export function batchCalculateContactTags(
  contacts,
  companies = [],
  activities = [],
) {
  // Build company lookup
  const companyMap = {};
  for (const company of companies || []) {
    companyMap[company.id] = company;
  }

  // Build activities lookup
  const activitiesByContact = {};
  for (const activity of activities || []) {
    if (activity.contact) {
      if (!activitiesByContact[activity.contact]) {
        activitiesByContact[activity.contact] = [];
      }
      activitiesByContact[activity.contact].push(activity);
    }
  }

  return contacts.map((contact) => {
    const company = contact.company ? companyMap[contact.company] : null;
    const contactActivities = activitiesByContact[contact.id] || [];

    return {
      contactId: contact.id,
      tags: calculateContactTags(contact, company, contactActivities),
    };
  });
}

/**
 * Batch calculate tags for multiple companies
 */
export function batchCalculateCompanyTags(companies) {
  return companies.map((company) => {
    return {
      companyId: company.id,
      tags: calculateCompanyTags(company),
    };
  });
}

/**
 * Merge new tags with existing tags
 */
export function mergeTags(existingTags, newTags) {
  if (!existingTags || existingTags.length === 0) {
    return newTags;
  }

  if (!newTags || newTags.length === 0) {
    return existingTags;
  }

  const existingSet = new Set(existingTags.map((t) => t.toLowerCase()));
  const merged = [...existingTags];

  for (const tag of newTags) {
    if (!existingSet.has(tag.toLowerCase())) {
      merged.push(tag);
    }
  }

  return merged;
}

/**
 * Remove tags that no longer apply
 */
export function pruneTags(existingTags, newTags) {
  if (!existingTags || existingTags.length === 0) {
    return newTags;
  }

  const validTags = new Set(newTags.map((t) => t.toLowerCase()));
  return existingTags.filter((tag) => validTags.has(tag.toLowerCase()));
}

/**
 * Get tag category (contact vs company)
 */
export function getTagCategory(tag) {
  const contactTags = [
    "High Value",
    "Decision Maker",
    "Tech Savvy",
    "Long-term Client",
    "At Risk",
    "New Lead",
    "Engaged",
    "Has Budget",
    "International",
  ];

  const companyTags = [
    "Enterprise",
    "Mid-Market",
    "High Revenue",
    "Medium Revenue",
    "Tech Industry",
    "Startup",
    "Known Industry",
    "Has Website",
    "Nonprofit",
    "Government",
  ];

  if (contactTags.includes(tag)) return "contact";
  if (companyTags.includes(tag)) return "company";
  return "both";
}
