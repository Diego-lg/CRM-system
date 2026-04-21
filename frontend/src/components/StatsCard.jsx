import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = "black",
  format = "number",
}) {
  const colors = {
    black: "bg-gray-900 text-white",
    slate: "bg-gray-700 text-white",
    gray: "bg-gray-600 text-white",
    zinc: "bg-zinc-800 text-white",
    neutral: "bg-neutral-800 text-white",
  };

  const trendColors = {
    up: "bg-green-100 text-green-700",
    down: "bg-red-100 text-red-700",
    neutral: "bg-gray-100 text-gray-600",
  };

  const formatValue = (v) => {
    if (format === "currency") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(v);
    }
    if (format === "percent") return `${v}%`;
    if (typeof v === "number" && v >= 1000) return v.toLocaleString();
    return v;
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color] || colors.black}`}
        >
          {Icon && <Icon size={18} />}
        </div>
        {trend !== undefined && (
          <div
            className={clsx(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend >= 0 ? trendColors.up : trendColors.down,
            )}
          >
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {formatValue(value)}
      </p>
      <p className="text-sm text-gray-500">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
