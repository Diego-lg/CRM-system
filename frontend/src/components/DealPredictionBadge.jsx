import React from "react";
import {
  predictDealOutcome,
  getPredictionColor,
  getPredictionLabel,
} from "../lib/ai/dealPredictionService";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

/**
 * Deal Prediction Badge Component
 * Displays AI-generated deal prediction with confidence and estimated close date
 *
 * @param {Object} props.deal - Deal object
 * @param {Object} props.contact - Associated contact (optional)
 * @param {Object} props.company - Associated company (optional)
 * @param {Array} props.historicalDeals - Array of historical deals for comparison (optional)
 */
export default function DealPredictionBadge({
  deal,
  contact = null,
  company = null,
  historicalDeals = [],
}) {
  // Don't render for closed deals (won/lost)
  if (!deal || deal.stage === "won" || deal.stage === "lost") {
    return null;
  }

  // Get prediction
  const prediction = predictDealOutcome(
    deal,
    contact,
    company,
    historicalDeals,
  );
  const confidence = prediction.confidence;
  const predictedCloseDate = prediction.predictedCloseDate;

  // Determine trend based on factors
  const positiveFactors = prediction.factors.filter(
    (f) => f.impact === "positive",
  ).length;
  const negativeFactors = prediction.factors.filter(
    (f) => f.impact === "negative",
  ).length;
  let trend = "stable";
  if (positiveFactors > negativeFactors + 1) trend = "up";
  if (negativeFactors > positiveFactors + 1) trend = "down";

  // Color classes based on confidence
  const colorClasses = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      progress: "bg-green-500",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      progress: "bg-yellow-500",
    },
    danger: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      progress: "bg-red-500",
    },
  };

  const color = getPredictionColor(confidence);
  const colors = colorClasses[color] || colorClasses.warning;
  const label = getPredictionLabel(prediction.outcome, confidence);

  // Trend icon component
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    stable: "text-gray-500",
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate days until predicted close
  const getDaysUntilClose = () => {
    if (!predictedCloseDate) return null;
    const closeDate = new Date(predictedCloseDate);
    const today = new Date();
    const days = Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysUntilClose = getDaysUntilClose();

  return (
    <div className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
      {/* Header with confidence */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${colors.text}`}>
            {confidence}%
          </span>
          <span className={`text-xs ${colors.text}`}>{label}</span>
        </div>
        <TrendIcon size={16} className={trendColors[trend]} />
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${colors.progress} transition-all duration-300`}
          style={{ width: `${confidence}%` }}
        />
      </div>

      {/* Predicted close date */}
      <div className="flex items-center gap-1.5 text-xs text-gray-600">
        <Calendar size={12} />
        <span>Est. close: {formatDate(predictedCloseDate)}</span>
        {daysUntilClose !== null && (
          <span className="text-gray-400">
            ({daysUntilClose > 0 ? `${daysUntilClose} days` : "overdue"})
          </span>
        )}
      </div>

      {/* Key factors (max 2) */}
      {prediction.factors.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Key factors:</p>
          <ul className="space-y-0.5">
            {prediction.factors.slice(0, 2).map((factor, index) => (
              <li
                key={index}
                className={`text-xs flex items-center gap-1 ${
                  factor.impact === "positive"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                <span className="w-1 h-1 rounded-full bg-current" />
                {factor.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
