import React from "react";
import {
  getRecommendationColor,
  getRecommendationIcon,
  getRecommendationLabel,
} from "../lib/ai/recommendationEngine";
import {
  ArrowRightCircle,
  TrendingUp,
  Mail,
  AlertTriangle,
  X,
  Lightbulb,
  CheckCircle,
} from "lucide-react";

/**
 * AI Recommendations Panel Component
 * Displays actionable AI recommendations sorted by priority
 *
 * @param {Array} props.recommendations - Array of recommendation objects
 * @param {Function} props.onTakeAction - Callback when Take Action is clicked (receives recommendation)
 * @param {Function} props.onDismiss - Callback when Dismiss is clicked (receives recommendation.id)
 */
export default function AIRecommendations({
  recommendations = [],
  onTakeAction,
  onDismiss,
}) {
  // Empty state
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <div className="flex justify-center mb-3">
          <Lightbulb size={32} className="text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-700 mb-1">
          No Recommendations
        </h3>
        <p className="text-xs text-gray-500">
          AI will generate recommendations as your CRM data grows.
        </p>
      </div>
    );
  }

  // Priority color mapping
  const priorityColors = {
    high: {
      border: "border-red-300",
      bg: "bg-red-50",
      badge: "bg-red-100 text-red-700",
      icon: "text-red-600",
    },
    medium: {
      border: "border-orange-300",
      bg: "bg-orange-50",
      badge: "bg-orange-100 text-orange-700",
      icon: "text-orange-600",
    },
    low: {
      border: "border-gray-300",
      bg: "bg-gray-50",
      badge: "bg-gray-100 text-gray-600",
      icon: "text-gray-500",
    },
  };

  // Icon mapping
  const iconComponents = {
    "arrow-right-circle": ArrowRightCircle,
    "trending-up": TrendingUp,
    mail: Mail,
    "alert-triangle": AlertTriangle,
    info: Lightbulb,
  };

  // Type label mapping
  const typeLabels = {
    next_action: "Next Action",
    deal_upsell: "Upsell Opportunity",
    contact_reengage: "Re-engage",
    churn_risk: "Churn Risk",
  };

  const handleTakeAction = (recommendation) => {
    if (onTakeAction) {
      onTakeAction(recommendation);
    }
  };

  const handleDismiss = (id) => {
    if (onDismiss) {
      onDismiss(id);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-yellow-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            AI Recommendations
          </h3>
        </div>
        <span className="text-xs text-gray-500">
          {recommendations.length} suggestion
          {recommendations.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-2">
        {recommendations.map((recommendation) => {
          const color = getRecommendationColor(
            recommendation.type,
            recommendation.priority,
          );
          const iconName = getRecommendationIcon(recommendation.type);
          const IconComponent = iconComponents[iconName] || Lightbulb;
          const colors =
            priorityColors[recommendation.priority] || priorityColors.low;

          return (
            <div
              key={recommendation.id}
              className={`p-3 rounded-lg border ${colors.border} ${colors.bg} transition-all hover:shadow-sm`}
            >
              {/* Card Header */}
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`mt-0.5 ${colors.icon}`}>
                  <IconComponent size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${colors.badge}`}
                    >
                      {typeLabels[recommendation.type] || recommendation.type}
                    </span>
                    {recommendation.deal_value && (
                      <span className="text-xs text-gray-500">
                        ${(recommendation.deal_value / 1000).toFixed(0)}k
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    {recommendation.title}
                  </h4>

                  <p className="text-xs text-gray-600 line-clamp-2">
                    {recommendation.description}
                  </p>

                  {/* Days info for re-engagement */}
                  {recommendation.days_since_contact && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last contact: {recommendation.days_since_contact} days ago
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                {onTakeAction && (
                  <button
                    onClick={() => handleTakeAction(recommendation)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <CheckCircle size={12} />
                    Take Action
                  </button>
                )}

                {onDismiss && (
                  <button
                    onClick={() => handleDismiss(recommendation.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <X size={12} />
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
