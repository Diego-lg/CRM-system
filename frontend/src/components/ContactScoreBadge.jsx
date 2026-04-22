import React, { useState } from "react";
import {
  calculateContactScore,
  getScoreColor,
  getScoreLabel,
  getScoreBreakdown,
} from "../lib/ai/scoringService";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Flame,
  Sun,
  Snowflake,
  Cloud,
} from "lucide-react";

/**
 * AI Contact Score Badge Component
 * Displays a contact's AI-generated score (0-100) with color coding and expandable details
 *
 * @param {Object} props.contact - Contact object
 * @param {Object} props.company - Associated company object (optional)
 * @param {Array} props.activities - Array of activities (optional)
 * @param {Function} props.onRecalculate - Callback when recalculate button is clicked (optional)
 */
export default function ContactScoreBadge({
  contact,
  company = null,
  activities = [],
  onRecalculate,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate the score
  const score = calculateContactScore(contact, company, activities);
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const breakdown = getScoreBreakdown(contact, company, activities);

  // Color mappings for different score levels
  const colorClasses = {
    hot: {
      bg: "bg-red-100",
      border: "border-red-300",
      text: "text-red-700",
      icon: <Flame size={14} />,
    },
    warm: {
      bg: "bg-orange-100",
      border: "border-orange-300",
      text: "text-orange-700",
      icon: <Sun size={14} />,
    },
    cool: {
      bg: "bg-blue-100",
      border: "border-blue-300",
      text: "text-blue-700",
      icon: <Cloud size={14} />,
    },
    cold: {
      bg: "bg-gray-100",
      border: "border-gray-300",
      text: "text-gray-600",
      icon: <Snowflake size={14} />,
    },
  };

  const colors = colorClasses[scoreColor] || colorClasses.cold;

  // Category display names
  const categoryLabels = {
    engagement: "Engagement",
    company: "Company",
    behavior: "Behavior",
    fit: "Fit",
  };

  const handleRecalculate = (e) => {
    e.stopPropagation();
    if (onRecalculate) {
      onRecalculate(contact);
    }
  };

  return (
    <div className="w-full">
      {/* Main Badge - Clickable to expand */}
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${colors.bg} ${colors.border}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Score Circle */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${colors.bg} ${colors.border} border-2`}
        >
          <span className={colors.text}>{score}</span>
        </div>

        {/* Label and Icon */}
        <div className="flex items-center gap-1">
          {colors.icon}
          <span className={`font-medium text-sm ${colors.text}`}>
            {scoreLabel}
          </span>
        </div>

        {/* Expand/Collapse Icon */}
        <div className="ml-auto">
          {isExpanded ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Score Breakdown by Category */}
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Score Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(breakdown.categoryScores).map(
                ([category, value]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-xs text-gray-600">
                      {categoryLabels[category]}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors.bg.replace("100", "500")}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">
                        {value}
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Active Factors */}
          {breakdown.factors.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Active Factors
              </h4>
              <ul className="space-y-1">
                {breakdown.factors.slice(0, 6).map((factor, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-xs text-gray-600"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${colors.bg.replace("100", "500")}`}
                    />
                    {factor.label}
                    <span className="text-gray-400">+{factor.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recalculate Button */}
          {onRecalculate && (
            <button
              onClick={handleRecalculate}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <RefreshCw size={12} />
              Recalculate Score
            </button>
          )}
        </div>
      )}
    </div>
  );
}
