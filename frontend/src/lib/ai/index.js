/**
 * AI Services Index
 *
 * Central export point for all AI/ML services in the CRM application.
 * These are rule-based services that can be enhanced with actual ML models.
 */

// Scoring Service
export {
  calculateContactScore,
  getScoreColor,
  getScoreLabel,
  getScoreBreakdown,
} from "./scoringService";

// Deal Prediction Service
export {
  predictDealOutcome,
  getPredictionColor,
  getPredictionLabel,
  batchPredictDeals,
} from "./dealPredictionService";

// Recommendation Engine
export {
  generateRecommendations,
  getRecommendationColor,
  getRecommendationIcon,
  getRecommendationLabel,
  filterByType,
  filterByPriority,
  getRecommendationStats,
} from "./recommendationEngine";

// Auto-Tag Service
export {
  calculateContactTags,
  calculateCompanyTags,
  getTagColor,
  getTagIcon,
  batchCalculateContactTags,
  batchCalculateCompanyTags,
  mergeTags,
  pruneTags,
  getTagCategory,
} from "./autoTagService";

// Smart Search
export {
  search,
  searchByType,
  searchPaginated,
  getSearchSuggestions,
  groupByType,
  buildSearchIndex,
} from "./smartSearch";

/**
 * AI Service Configuration
 */
export const AI_CONFIG = {
  // Scoring weights
  scoring: {
    engagement: 0.3,
    company: 0.25,
    behavior: 0.25,
    fit: 0.2,
  },

  // Score thresholds
  scoreThresholds: {
    hot: 80,
    warm: 60,
    cool: 40,
  },

  // Recommendation settings
  recommendations: {
    highValueDealThreshold: 50000,
    dealStagnationDays: 14,
    reengageDays: 30,
    churnRiskDays: 60,
  },

  // Search settings
  search: {
    minQueryLength: 2,
    defaultLimit: 20,
    fuzzyMatchThreshold: 0.6,
  },

  // Tag rules
  tags: {
    enterpriseEmployeeThreshold: 500,
    midMarketEmployeeThreshold: 100,
    highRevenueThreshold: 10000000,
  },
};

/**
 * Utility function to check if AI features are available
 */
export function isAIAvailable() {
  return true;
}

/**
 * Get AI feature status
 */
export function getAIStatus() {
  return {
    scoring: "active",
    predictions: "active",
    recommendations: "active",
    autoTagging: "active",
    smartSearch: "active",
  };
}
