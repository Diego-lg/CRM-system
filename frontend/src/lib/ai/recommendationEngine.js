/**
 * AI Recommendation Engine
 *
 * Generates actionable recommendations based on CRM data patterns.
 * Types:
 * - next_action: High priority actions needed immediately
 * - deal_upsell: Medium priority opportunities for expansion
 * - contact_reengage: Low priority re-engagement opportunities
 * - churn_risk: High priority retention concerns
 */

/**
 * Generate recommendations based on contacts, deals, and activities
 * @param {Array} contacts - Array of contact objects
 * @param {Array} deals - Array of deal objects
 * @param {Array} activities - Array of activity objects
 * @returns {Array} Array of recommendation objects
 */
export function generateRecommendations(contacts, deals = [], activities = []) {
  const recommendations = [];

  // Create activity lookup map for faster access
  const activitiesByContact = groupActivitiesByContact(activities);
  const activitiesByDeal = groupActivitiesByDeal(activities);

  // Check for deals needing attention (next_action)
  const dealRecommendations = analyzeDealRecommendations(
    deals,
    activitiesByContact,
  );
  recommendations.push(...dealRecommendations);

  // Check for upsell opportunities (deal_upsell)
  const upsellRecommendations = analyzeUpsellOpportunities(
    deals,
    activitiesByDeal,
  );
  recommendations.push(...upsellRecommendations);

  // Check for contacts to re-engage (contact_reengage)
  const reengageRecommendations = analyzeReengagementOpportunities(
    contacts,
    activitiesByContact,
  );
  recommendations.push(...reengageRecommendations);

  // Check for churn risk (churn_risk)
  const churnRecommendations = analyzeChurnRisk(
    contacts,
    activitiesByContact,
    deals,
  );
  recommendations.push(...churnRecommendations);

  // Sort by priority
  return sortByPriority(recommendations);
}

/**
 * Group activities by contact ID
 */
function groupActivitiesByContact(activities) {
  const grouped = {};
  for (const activity of activities || []) {
    if (activity.contact) {
      if (!grouped[activity.contact]) {
        grouped[activity.contact] = [];
      }
      grouped[activity.contact].push(activity);
    }
  }
  return grouped;
}

/**
 * Group activities by deal ID
 */
function groupActivitiesByDeal(activities) {
  const grouped = {};
  for (const activity of activities || []) {
    if (activity.deal) {
      if (!grouped[activity.deal]) {
        grouped[activity.deal] = [];
      }
      grouped[activity.deal].push(activity);
    }
  }
  return grouped;
}

/**
 * Analyze deals for next_action recommendations
 * High-value deals ($50k+) with no activity in 14+ days
 */
function analyzeDealRecommendations(deals, activitiesByContact) {
  const recommendations = [];
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (const deal of deals || []) {
    // Skip closed deals
    if (deal.stage === "won" || deal.stage === "lost") continue;

    // Check if high-value deal
    if (deal.value < 50000) continue;

    // Get contact activities
    const contactActivities = activitiesByContact[deal.contact] || [];

    // Check for recent activity
    const hasRecentActivity = contactActivities.some((a) => {
      const activityDate = new Date(a.date || a.created_at);
      return activityDate.getTime() >= fourteenDaysAgo;
    });

    if (!hasRecentActivity) {
      recommendations.push({
        id: `next_action_${deal.id}`,
        type: "next_action",
        title: `Contact regarding ${deal.title || "Untitled Deal"}`,
        description: `High-value deal ($${(deal.value / 1000).toFixed(0)}k) with no activity in 14+ days. Schedule a follow-up.`,
        priority: "high",
        entity_type: "deal",
        entity_id: deal.id,
        contact_id: deal.contact,
        company_id: deal.company,
        deal_value: deal.value,
        action_data: {
          type: "create_activity",
          contactId: deal.contact,
          dealId: deal.id,
          activityType: "call",
          suggestedTitle: `Follow up on ${deal.title || "deal"}`,
        },
        created_at: new Date().toISOString(),
      });
    }
  }

  return recommendations;
}

/**
 * Analyze deals for upsell opportunities
 * Deals in proposal stage for 2+ weeks
 */
function analyzeUpsellOpportunities(deals, activitiesByDeal) {
  const recommendations = [];
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (const deal of deals || []) {
    // Skip non-proposal stage deals
    if (deal.stage !== "proposal") continue;

    // Check if in proposal for 2+ weeks
    const updatedDate = new Date(deal.updated_at || deal.created_at);
    if (updatedDate.getTime() >= twoWeeksAgo) continue;

    // Get deal activities
    const dealActivities = activitiesByDeal[deal.id] || [];

    // Check if there's been any follow-up activity
    const hasFollowUp = dealActivities.some((a) => {
      const type = (a.type || "").toLowerCase();
      return ["call", "meeting", "email"].includes(type);
    });

    if (!hasFollowUp || dealActivities.length < 2) {
      recommendations.push({
        id: `deal_upsell_${deal.id}`,
        type: "deal_upsell",
        title: `Follow up on proposal for ${deal.title || "Untitled Deal"}`,
        description:
          "This deal has been in proposal stage for over 2 weeks. Consider a follow-up call or meeting to discuss next steps.",
        priority: "medium",
        entity_type: "deal",
        entity_id: deal.id,
        contact_id: deal.contact,
        company_id: deal.company,
        deal_value: deal.value,
        days_in_stage: Math.floor(
          (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
        action_data: {
          type: "create_activity",
          contactId: deal.contact,
          dealId: deal.id,
          activityType: "call",
          suggestedTitle: `Proposal follow-up for ${deal.title || "deal"}`,
        },
        created_at: new Date().toISOString(),
      });
    }
  }

  return recommendations;
}

/**
 * Analyze contacts for re-engagement opportunities
 * Customers not contacted in 30+ days
 */
function analyzeReengagementOpportunities(contacts, activitiesByContact) {
  const recommendations = [];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const contact of contacts || []) {
    // Only customers
    if (contact.status !== "customer") continue;

    // Get activities for this contact
    const contactActivities = activitiesByContact[contact.id] || [];

    // Check last activity date
    let lastActivityDate = null;
    for (const activity of contactActivities) {
      const activityDate = new Date(activity.date || activity.created_at);
      if (!lastActivityDate || activityDate > lastActivityDate) {
        lastActivityDate = activityDate;
      }
    }

    // Check last_contact field as fallback
    if (contact.last_contact) {
      const lastContactDate = new Date(contact.last_contact);
      if (!lastActivityDate || lastContactDate > lastActivityDate) {
        lastActivityDate = lastContactDate;
      }
    }

    // Skip if contacted recently
    if (lastActivityDate && lastActivityDate.getTime() >= thirtyDaysAgo)
      continue;

    // Don't recommend for contacts that are already churn risks
    if (contact.status === "churned" || contact.status === "inactive") continue;

    recommendations.push({
      id: `contact_reengage_${contact.id}`,
      type: "contact_reengage",
      title: `Re-engage ${contact.name || contact.email || "Contact"}`,
      description:
        "No contact in over 30 days. Time for a check-in to maintain relationship.",
      priority: "low",
      entity_type: "contact",
      entity_id: contact.id,
      company_id: contact.company,
      last_contact: lastActivityDate ? lastActivityDate.toISOString() : null,
      days_since_contact: lastActivityDate
        ? Math.floor(
            (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null,
      action_data: {
        type: "create_activity",
        contactId: contact.id,
        activityType: "email",
        suggestedTitle: `Check-in with ${contact.name || "contact"}`,
      },
      created_at: new Date().toISOString(),
    });
  }

  return recommendations;
}

/**
 * Analyze contacts for churn risk
 * Low engagement + decline detected
 */
function analyzeChurnRisk(contacts, activitiesByContact, deals) {
  const recommendations = [];
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

  // Build deal lookup
  const dealsByContact = {};
  for (const deal of deals || []) {
    if (deal.contact) {
      if (!dealsByContact[deal.contact]) {
        dealsByContact[deal.contact] = [];
      }
      dealsByContact[deal.contact].push(deal);
    }
  }

  for (const contact of contacts || []) {
    // Only customers
    if (contact.status !== "customer") continue;

    const contactActivities = activitiesByContact[contact.id] || [];
    const contactDeals = dealsByContact[contact.id] || [];

    // Check last activity date
    let lastActivityDate = null;
    for (const activity of contactActivities) {
      const activityDate = new Date(activity.date || activity.created_at);
      if (!lastActivityDate || activityDate > lastActivityDate) {
        lastActivityDate = activityDate;
      }
    }

    // Skip if contacted recently
    if (lastActivityDate && lastActivityDate.getTime() >= sixtyDaysAgo)
      continue;

    // Check for decline indicators
    const hasDeclineIndicators = checkDeclineIndicators(
      contact,
      contactActivities,
      contactDeals,
    );

    if (hasDeclineIndicators || (!lastActivityDate && !contactDeals.length)) {
      recommendations.push({
        id: `churn_risk_${contact.id}`,
        type: "churn_risk",
        title: `Check in with ${contact.name || contact.email || "Contact"}`,
        description:
          "Low engagement detected. Customer may be at risk of churning. Schedule an immediate check-in.",
        priority: "high",
        entity_type: "contact",
        entity_id: contact.id,
        company_id: contact.company,
        last_activity: lastActivityDate ? lastActivityDate.toISOString() : null,
        decline_indicators: hasDeclineIndicators,
        action_data: {
          type: "create_activity",
          contactId: contact.id,
          activityType: "call",
          priority: "high",
          suggestedTitle: `Churn prevention check-in with ${contact.name || "contact"}`,
        },
        created_at: new Date().toISOString(),
      });
    }
  }

  return recommendations;
}

/**
 * Check for decline indicators
 */
function checkDeclineIndicators(contact, activities, deals) {
  const indicators = [];

  // Check engagement trend (fewer activities over time)
  if (activities.length >= 4) {
    const sortedActivities = [...activities].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at);
      const dateB = new Date(b.date || b.created_at);
      return dateA - dateB;
    });

    const midpoint = Math.floor(sortedActivities.length / 2);
    const firstHalf = sortedActivities.slice(0, midpoint);
    const secondHalf = sortedActivities.slice(midpoint);

    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfAvgDays = calculateAverageActivityGap(firstHalf);
      const secondHalfAvgDays = calculateAverageActivityGap(secondHalf);

      // If second half has larger gaps, engagement is declining
      if (secondHalfAvgDays > firstHalfAvgDays * 2) {
        indicators.push("declining_engagement");
      }
    }
  }

  // Check for lost/stalled deals
  const lostDeals = deals.filter((d) => d.stage === "lost");
  if (lostDeals.length > 0) {
    indicators.push("lost_deals");
  }

  // Check for deal value decline
  const wonDeals = deals.filter((d) => d.stage === "won");
  if (wonDeals.length >= 2) {
    const sortedWonDeals = [...wonDeals].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateA - dateB;
    });

    const recentDeals = sortedWonDeals.slice(-2);
    if (recentDeals[0].value > recentDeals[1].value * 1.5) {
      indicators.push("declining_deal_value");
    }
  }

  return indicators;
}

/**
 * Calculate average gap between activities in days
 */
function calculateAverageActivityGap(activities) {
  if (activities.length < 2) return 0;

  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = new Date(a.date || a.created_at);
    const dateB = new Date(b.date || b.created_at);
    return dateA - dateB;
  });

  let totalGap = 0;
  for (let i = 1; i < sortedActivities.length; i++) {
    const prev = new Date(
      sortedActivities[i - 1].date || sortedActivities[i - 1].created_at,
    );
    const curr = new Date(
      sortedActivities[i].date || sortedActivities[i].created_at,
    );
    totalGap += (curr - prev) / (1000 * 60 * 60 * 24);
  }

  return totalGap / (sortedActivities.length - 1);
}

/**
 * Sort recommendations by priority
 */
function sortByPriority(recommendations) {
  const priorityOrder = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return recommendations.sort((a, b) => {
    const aOrder = priorityOrder[a.priority] ?? 3;
    const bOrder = priorityOrder[b.priority] ?? 3;
    return aOrder - bOrder;
  });
}

/**
 * Get color for recommendation based on type and priority
 * @param {string} type - Recommendation type
 * @param {string} priority - Priority level
 * @returns {string} Color identifier
 */
export function getRecommendationColor(type, priority) {
  // Type-based colors
  const typeColors = {
    next_action: "blue",
    deal_upsell: "green",
    contact_reengage: "yellow",
    churn_risk: "red",
  };

  // Priority overrides for churn_risk
  if (type === "churn_risk" && priority === "high") {
    return "red";
  }

  return typeColors[type] || "gray";
}

/**
 * Get icon name for recommendation type
 */
export function getRecommendationIcon(type) {
  const icons = {
    next_action: "arrow-right-circle",
    deal_upsell: "trending-up",
    contact_reengage: "mail",
    churn_risk: "alert-triangle",
  };

  return icons[type] || "info";
}

/**
 * Get recommendation type label
 */
export function getRecommendationLabel(type) {
  const labels = {
    next_action: "Next Action",
    deal_upsell: "Upsell Opportunity",
    contact_reengage: "Re-engage",
    churn_risk: "Churn Risk",
  };

  return labels[type] || type;
}

/**
 * Filter recommendations by type
 */
export function filterByType(recommendations, type) {
  return recommendations.filter((r) => r.type === type);
}

/**
 * Filter recommendations by priority
 */
export function filterByPriority(recommendations, priority) {
  return recommendations.filter((r) => r.priority === priority);
}

/**
 * Get recommendation summary statistics
 */
export function getRecommendationStats(recommendations) {
  const stats = {
    total: recommendations.length,
    byType: {},
    byPriority: {
      high: 0,
      medium: 0,
      low: 0,
    },
    urgentCount: 0,
  };

  for (const rec of recommendations) {
    // Count by type
    if (!stats.byType[rec.type]) {
      stats.byType[rec.type] = 0;
    }
    stats.byType[rec.type]++;

    // Count by priority
    if (stats.byPriority[rec.priority] !== undefined) {
      stats.byPriority[rec.priority]++;
    }

    // Count urgent (high priority churn risk)
    if (rec.priority === "high") {
      stats.urgentCount++;
    }
  }

  return stats;
}
