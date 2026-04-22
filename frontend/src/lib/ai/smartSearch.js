/**
 * Smart Search with AI
 *
 * Provides intelligent search with typo tolerance, fuzzy matching,
 * and relevance scoring across contacts, companies, and deals.
 */

/**
 * Search across all entities with AI enhancement
 * @param {string} query - Search query string
 * @param {Array} contacts - Array of contact objects
 * @param {Array} companies - Array of company objects
 * @param {Array} deals - Array of deal objects
 * @returns {Array} Ranked search results with scores
 */
export function search(query, contacts = [], companies = [], deals = []) {
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const results = [];

  // Search contacts
  for (const contact of contacts) {
    const score = calculateContactRelevance(contact, normalizedQuery);
    if (score > 0) {
      results.push({
        id: contact.id,
        type: "contact",
        title: contact.name || contact.email || "Unknown Contact",
        subtitle: contact.email || contact.role || "",
        extra: contact.company_name || contact.company?.name || "",
        score,
        data: contact,
        highlights: getSearchHighlights(contact, normalizedQuery),
      });
    }
  }

  // Search companies
  for (const company of companies) {
    const score = calculateCompanyRelevance(company, normalizedQuery);
    if (score > 0) {
      results.push({
        id: company.id,
        type: "company",
        title: company.name || "Unknown Company",
        subtitle: company.industry || "",
        extra: company.size || `${company.employees || 0} employees`,
        score,
        data: company,
        highlights: getSearchHighlights(company, normalizedQuery),
      });
    }
  }

  // Search deals
  for (const deal of deals) {
    const score = calculateDealRelevance(deal, normalizedQuery);
    if (score > 0) {
      results.push({
        id: deal.id,
        type: "deal",
        title: deal.title || "Untitled Deal",
        subtitle:
          formatCurrency(deal.value) + (deal.stage ? ` • ${deal.stage}` : ""),
        extra: deal.owner || deal.contact_name || "",
        score,
        data: deal,
        highlights: getSearchHighlights(deal, normalizedQuery),
      });
    }
  }

  // Sort by relevance score (descending)
  results.sort((a, b) => b.score - a.score);

  // Add rank numbers
  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  return results;
}

/**
 * Calculate relevance score for a contact
 * Scoring: exact name +30, email +25, title +20, fuzzy +10-15, customer +5, won deals +5
 */
function calculateContactRelevance(contact, query) {
  let score = 0;
  const name = (contact.name || "").toLowerCase();
  const email = (contact.email || "").toLowerCase();
  const role = (contact.role || "").toLowerCase();
  const company = (contact.company_name || "").toLowerCase();

  // Exact match (highest priority)
  if (name === query) {
    score += 30;
  } else if (name.includes(query)) {
    score += 20;
  }

  // Email match
  if (email === query) {
    score += 25;
  } else if (email.includes(query)) {
    score += 20;
    // Bonus for exact email prefix match
    if (email.startsWith(query)) {
      score += 5;
    }
  }

  // Role/title match
  if (role.includes(query)) {
    score += 15;
  }

  // Company name match
  if (company.includes(query)) {
    score += 10;
  }

  // Fuzzy matching (typo tolerance)
  if (score === 0) {
    const fuzzyScore = calculateFuzzyMatch(name, query);
    if (fuzzyScore > 0) {
      score += fuzzyScore;
    } else {
      // Check email fuzzy match
      const emailFuzzyScore = calculateFuzzyMatch(email, query);
      if (emailFuzzyScore > 0) {
        score += emailFuzzyScore;
      }
    }
  }

  // Status boosts
  if (contact.status === "customer") {
    score += 5;
  }
  if (contact.status === "lead" || contact.status === "prospect") {
    score += 2;
  }

  return score;
}

/**
 * Calculate relevance score for a company
 */
function calculateCompanyRelevance(company, query) {
  let score = 0;
  const name = (company.name || "").toLowerCase();
  const industry = (company.industry || "").toLowerCase();
  const website = (company.website || "").toLowerCase();

  // Exact match
  if (name === query) {
    score += 30;
  } else if (name.includes(query)) {
    score += 20;
  }

  // Industry match
  if (industry.includes(query)) {
    score += 15;
  }

  // Website/domain match
  if (website.includes(query)) {
    score += 10;
  }

  // Fuzzy matching
  if (score === 0) {
    const fuzzyScore = calculateFuzzyMatch(name, query);
    if (fuzzyScore > 0) {
      score += fuzzyScore;
    }
  }

  // Size boosts
  if (company.size === "enterprise" || company.employees >= 500) {
    score += 5;
  }

  return score;
}

/**
 * Calculate relevance score for a deal
 */
function calculateDealRelevance(deal, query) {
  let score = 0;
  const title = (deal.title || "").toLowerCase();
  const owner = (deal.owner || "").toLowerCase();
  const contact = (deal.contact_name || "").toLowerCase();

  // Exact match
  if (title === query) {
    score += 30;
  } else if (title.includes(query)) {
    score += 20;
  }

  // Owner match
  if (owner.includes(query)) {
    score += 15;
  }

  // Contact name match
  if (contact.includes(query)) {
    score += 10;
  }

  // Fuzzy matching
  if (score === 0) {
    const fuzzyScore = calculateFuzzyMatch(title, query);
    if (fuzzyScore > 0) {
      score += fuzzyScore;
    }
  }

  // Stage boosts
  if (deal.stage === "won") {
    score += 5;
  }
  if (deal.stage === "negotiation" || deal.stage === "proposal") {
    score += 3;
  }

  // Value boost for high-value deals
  if (deal.value >= 50000) {
    score += 2;
  }

  return score;
}

/**
 * Calculate fuzzy match score (typo tolerance)
 * Returns score 10-15 based on character match ratio
 */
function calculateFuzzyMatch(str, query) {
  if (!str || !query) return 0;

  const normalizedStr = str.toLowerCase();

  // Check if all query characters appear in order (subsequence match)
  let queryIndex = 0;
  let matchCount = 0;

  for (const char of normalizedStr) {
    if (queryIndex < query.length && char === query[queryIndex]) {
      matchCount++;
      queryIndex++;
    }
  }

  // If all query characters found, calculate score based on ratio
  if (queryIndex === query.length) {
    const ratio = matchCount / Math.max(normalizedStr.length, query.length);
    // Score between 10-15 based on match quality
    return Math.round(10 + ratio * 5);
  }

  // Levenshtein-like check for typos
  const distance = levenshteinDistance(normalizedStr, query);
  const maxLen = Math.max(normalizedStr.length, query.length);
  const similarity = 1 - distance / maxLen;

  if (similarity >= 0.6) {
    return Math.round(10 + similarity * 5);
  }

  return 0;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;

  // Create distance matrix
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j], // deletion
            dp[i][j - 1], // insertion
            dp[i - 1][j - 1], // substitution
          );
      }
    }
  }

  return dp[m][n];
}

/**
 * Get highlighted text snippets for search matches
 */
function getSearchHighlights(record, query) {
  const highlights = [];
  const queryLength = query.length;

  const fields = ["name", "email", "role", "title", "industry", "company_name"];

  for (const field of fields) {
    const value = record[field];
    if (!value) continue;

    const strValue = String(value).toLowerCase();
    let index = strValue.indexOf(query);

    if (index !== -1) {
      // Found exact match
      highlights.push({
        field,
        match: value.substring(index, index + queryLength),
        context: value,
      });
    } else if (query.length >= 3) {
      // Check for fuzzy match
      const fuzzyIdx = strValue.indexOf(query.substring(0, 3));
      if (fuzzyIdx !== -1) {
        highlights.push({
          field,
          match: value.substring(fuzzyIdx, fuzzyIdx + 3),
          context: value,
          fuzzy: true,
        });
      }
    }
  }

  return highlights;
}

/**
 * Format currency value
 */
function formatCurrency(value) {
  if (!value) return "$0";

  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

/**
 * Search with type filter
 */
export function searchByType(query, data, type) {
  const results = search(
    query,
    type === "contacts" ? data.contacts || [] : [],
    type === "companies" ? data.companies || [] : [],
    type === "deals" ? data.deals || [] : [],
  );

  return results.filter((r) => r.type === type);
}

/**
 * Search with pagination
 */
export function searchPaginated(
  query,
  contacts,
  companies,
  deals,
  page = 1,
  pageSize = 20,
) {
  const allResults = search(query, contacts, companies, deals);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    results: allResults.slice(startIndex, endIndex),
    total: allResults.length,
    page,
    pageSize,
    totalPages: Math.ceil(allResults.length / pageSize),
    hasMore: endIndex < allResults.length,
  };
}

/**
 * Get search suggestions based on partial query
 */
export function getSearchSuggestions(query, contacts = [], companies = []) {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase();
  const suggestions = [];

  // Collect unique names
  const nameCount = {};

  for (const contact of contacts) {
    const name = contact.name || contact.email || "";
    if (name.toLowerCase().includes(normalizedQuery)) {
      nameCount[name] = (nameCount[name] || 0) + 1;
    }
  }

  for (const company of companies) {
    const name = company.name || "";
    if (name.toLowerCase().includes(normalizedQuery)) {
      nameCount[name] = (nameCount[name] || 0) + 1;
    }
  }

  // Sort by frequency and return top suggestions
  const sorted = Object.entries(nameCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return sorted;
}

/**
 * Group search results by type
 */
export function groupByType(results) {
  const grouped = {
    contacts: [],
    companies: [],
    deals: [],
  };

  for (const result of results) {
    if (grouped[result.type]) {
      grouped[result.type].push(result);
    }
  }

  return grouped;
}

/**
 * Build search index (for future optimization)
 */
export function buildSearchIndex(contacts, companies, deals) {
  return {
    contacts: contacts.map((c) => ({
      id: c.id,
      searchText: [c.name, c.email, c.role, c.company_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      data: c,
    })),
    companies: companies.map((c) => ({
      id: c.id,
      searchText: [c.name, c.industry, c.website]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      data: c,
    })),
    deals: deals.map((d) => ({
      id: d.id,
      searchText: [d.title, d.owner, d.contact_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      data: d,
    })),
  };
}
