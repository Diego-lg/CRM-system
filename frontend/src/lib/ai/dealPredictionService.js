/**
 * Deal Prediction Service
 *
 * Predicts deal outcomes based on historical patterns, deal attributes,
 * and contact engagement metrics.
 */

/**
 * Deal stage progression order
 */
const STAGE_ORDER = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

/**
 * Predict deal outcome
 * @param {Object} deal - Deal object
 * @param {Object} contact - Associated contact (optional)
 * @param {Object} company - Associated company (optional)
 * @param {Array} historicalDeals - Array of historical deals for comparison (optional)
 * @returns {Object} { outcome, confidence, predictedCloseDate, factors }
 */
export function predictDealOutcome(
  deal,
  contact = null,
  company = null,
  historicalDeals = [],
) {
  let confidence = 50;
  const factors = [];

  // Base confidence from deal probability
  if (deal.probability) {
    confidence = Math.max(confidence, deal.probability);
    factors.push({
      type: "probability",
      label: "Current probability",
      impact: "positive",
      weight: 25,
    });
  }

  // Similar deals found
  const similarDeals = findSimilarDeals(deal, historicalDeals);
  if (similarDeals.length > 0) {
    const wonCount = similarDeals.filter((d) => d.stage === "won").length;
    const similarWinRate = (wonCount / similarDeals.length) * 100;

    // Adjust confidence based on similar deals
    const similarityWeight = Math.min(0.3, similarDeals.length * 0.05);
    confidence =
      confidence * (1 - similarityWeight) + similarWinRate * similarityWeight;

    factors.push({
      type: "similar_deals",
      label: `${similarDeals.length} similar deals found`,
      impact: similarWinRate > 50 ? "positive" : "negative",
      weight: Math.round(similarityWeight * 100),
    });
  }

  // Deal stagnation check
  // Stagnant deals (old in early stages) reduce confidence
  const dealAge = getDealAge(deal.created_at);
  const stageIndex = STAGE_ORDER.indexOf(deal.stage);

  if (dealAge > 30 && stageIndex <= 1) {
    // New/qualified deal older than 30 days
    const stagnationPenalty = Math.min(20, Math.floor((dealAge - 30) / 10) * 5);
    confidence -= stagnationPenalty;

    factors.push({
      type: "stagnation",
      label: "Deal stagnating in early stage",
      impact: "negative",
      weight: -stagnationPenalty,
    });
  }

  // Contact engagement
  if (contact) {
    // High engagement adds confidence
    const engagementLevel = calculateContactEngagement(contact);

    if (engagementLevel >= 80) {
      confidence += 10;
      factors.push({
        type: "engagement",
        label: "High contact engagement",
        impact: "positive",
        weight: 10,
      });
    } else if (engagementLevel < 30) {
      confidence -= 10;
      factors.push({
        type: "engagement",
        label: "Low contact engagement",
        impact: "negative",
        weight: -10,
      });
    }
  }

  // Deal value factor (high value deals often have better follow-up)
  if (deal.value >= 50000) {
    confidence += 5;
    factors.push({
      type: "deal_value",
      label: "High-value deal",
      impact: "positive",
      weight: 5,
    });
  }

  // Company size factor
  if (company && (company.employees >= 500 || company.size === "enterprise")) {
    confidence += 5;
    factors.push({
      type: "company_size",
      label: "Enterprise company",
      impact: "positive",
      weight: 5,
    });
  }

  // Clamp confidence to 5-95 range
  confidence = Math.min(95, Math.max(5, Math.round(confidence)));

  // Determine outcome
  const outcome = confidence >= 50 ? "won" : "lost";

  // Predict close date based on stage and historical data
  const predictedCloseDate = calculatePredictedCloseDate(deal, historicalDeals);

  return {
    outcome,
    confidence,
    predictedCloseDate,
    factors,
    meta: {
      dealAge,
      stageIndex,
      similarDealsCount: similarDeals.length,
    },
  };
}

/**
 * Find similar deals for comparison
 */
function findSimilarDeals(deal, historicalDeals = []) {
  if (!historicalDeals || historicalDeals.length === 0) {
    return [];
  }

  return historicalDeals.filter((historicalDeal) => {
    // Same stage range or already closed
    const dealStageIndex = STAGE_ORDER.indexOf(deal.stage);
    const histStageIndex = STAGE_ORDER.indexOf(historicalDeal.stage);

    // Include if in similar stage range or closed (won/lost)
    const inSimilarStage = Math.abs(dealStageIndex - histStageIndex) <= 1;
    const isClosed =
      historicalDeal.stage === "won" || historicalDeal.stage === "lost";

    // Same company or similar value range
    const sameCompany = deal.company === historicalDeal.company;
    const similarValue =
      historicalDeal.value &&
      deal.value &&
      Math.abs(historicalDeal.value - deal.value) / deal.value < 0.5;

    return (inSimilarStage || isClosed) && (sameCompany || similarValue);
  });
}

/**
 * Calculate contact engagement level (0-100)
 */
function calculateContactEngagement(contact) {
  let score = 50; // Base score

  // Check last activity
  if (contact.last_contact || contact.lastActivity) {
    const lastDate = new Date(contact.last_contact || contact.lastActivity);
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince <= 7) {
      score += 30;
    } else if (daysSince <= 14) {
      score += 15;
    } else if (daysSince > 60) {
      score -= 30;
    } else if (daysSince > 30) {
      score -= 15;
    }
  }

  // Engagement indicators
  if (contact.email) score += 10;
  if (contact.phone) score += 5;
  if (contact.status === "customer") score += 10;

  // Authority roles suggest better engagement
  const authorityRoles = ["CEO", "CTO", "CFO", "VP", "Director"];
  if (
    authorityRoles.some((r) =>
      (contact.role || "").toLowerCase().includes(r.toLowerCase()),
    )
  ) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Get deal age in days
 */
function getDealAge(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  return Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate predicted close date
 * Based on current stage and historical average close times
 */
function calculatePredictedCloseDate(deal, historicalDeals = []) {
  const currentStageIndex = STAGE_ORDER.indexOf(deal.stage);

  // Base prediction: 14 days per remaining stage
  let daysRemaining = Math.max(0, 5 - currentStageIndex) * 14;

  // Adjust based on historical data
  if (historicalDeals && historicalDeals.length > 0) {
    const closedDeals = historicalDeals.filter(
      (d) => d.stage === "won" || d.stage === "lost",
    );

    if (closedDeals.length >= 3) {
      const avgDaysToClose =
        closedDeals.reduce((sum, d) => {
          const created = new Date(d.created_at);
          const closed = new Date(d.updated_at || d.closed_at);
          return sum + (closed - created) / (1000 * 60 * 60 * 24);
        }, 0) / closedDeals.length;

      // Use average if available
      daysRemaining = Math.round(
        avgDaysToClose * ((5 - currentStageIndex) / 5),
      );
    }
  }

  // Apply deal age offset (subtract time already spent)
  const dealAge = getDealAge(deal.created_at);
  daysRemaining = Math.max(7, daysRemaining - Math.min(dealAge, daysRemaining));

  const closeDate = new Date();
  closeDate.setDate(closeDate.getDate() + daysRemaining);

  return closeDate.toISOString().split("T")[0];
}

/**
 * Get prediction confidence color class
 */
export function getPredictionColor(confidence) {
  if (confidence >= 70) return "success";
  if (confidence >= 50) return "warning";
  return "danger";
}

/**
 * Get prediction label
 */
export function getPredictionLabel(outcome, confidence) {
  const prefix =
    confidence >= 70 ? "Very likely" : confidence >= 50 ? "Likely" : "Unlikely";

  return `${prefix} to ${outcome}`;
}

/**
 * Batch predict outcomes for multiple deals
 */
export function batchPredictDeals(deals, contacts = [], historicalDeals = []) {
  return deals.map((deal) => {
    const contact = contacts.find((c) => c.id === deal.contact);
    return {
      dealId: deal.id,
      ...predictDealOutcome(deal, contact, null, historicalDeals),
    };
  });
}
