import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Download, Filter } from "lucide-react";
import useCRM from "../store/useCRM";
import StatsCard from "../components/StatsCard";

const STAGE_COLORS = {
  new: "#404040",
  qualified: "#525252",
  proposal: "#737373",
  negotiation: "#a3a3a3",
  won: "#16a34a",
  lost: "#dc2626",
};
const CHART_COLORS = [
  "#262626",
  "#404040",
  "#525252",
  "#737373",
  "#a3a3a3",
  "#171717",
  "#0a0a0a",
];

export default function Analytics() {
  const deals = useCRM((s) => s.getFilteredDeals());
  const contacts = useCRM((s) => s.getFilteredContacts());
  const companies = useCRM((s) => s.companies);
  const stores = useCRM((s) => s.stores);
  const revenueHistory = useCRM((s) => s.revenueHistory);
  const pipelineHistory = useCRM((s) => s.pipelineHistory);
  const currentStoreId = useCRM((s) => s.currentStoreId);
  const [dateRange, setDateRange] = useState("7m");

  const stats = useMemo(() => {
    const wonDeals = deals.filter((d) => d.stage === "won");
    const lostDeals = deals.filter((d) => d.stage === "lost");
    const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
    const totalRevenue = wonDeals.reduce((s, d) => s + d.value, 0);
    const avgDealSize =
      wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;
    const pipeline = openDeals.reduce((s, d) => s + d.value, 0);
    const winRate =
      wonDeals.length + lostDeals.length > 0
        ? Math.round(
            (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100,
          )
        : 0;
    const avgScore =
      contacts.length > 0
        ? Math.round(
            contacts.reduce((s, c) => s + c.score, 0) / contacts.length,
          )
        : 0;
    return {
      totalRevenue,
      avgDealSize,
      pipeline,
      winRate,
      wonCount: wonDeals.length,
      openCount: openDeals.length,
      contacts: contacts.length,
      companies: companies.length,
      avgScore,
    };
  }, [deals, contacts, companies]);

  const dealsByStage = useMemo(() => {
    const stages = [
      "new",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
    ];
    return stages.map((stage) => ({
      name: stage.charAt(0).toUpperCase() + stage.slice(1),
      deals: deals.filter((d) => d.stage === stage).length,
      value: deals
        .filter((d) => d.stage === stage)
        .reduce((s, d) => s + d.value, 0),
      fill: STAGE_COLORS[stage],
    }));
  }, [deals]);

  const dealsBySize = useMemo(() => {
    const ranges = [
      { label: "<$10k", min: 0, max: 10000 },
      { label: "$10k-$25k", min: 10000, max: 25000 },
      { label: "$25k-$50k", min: 25000, max: 50000 },
      { label: "$50k-$100k", min: 50000, max: 100000 },
      { label: ">$100k", min: 100000, max: Infinity },
    ];
    return ranges.map((r) => ({
      name: r.label,
      deals: deals.filter((d) => d.value >= r.min && d.value < r.max).length,
    }));
  }, [deals]);

  const contactScoreData = useMemo(() => {
    const ranges = ["0-20", "21-40", "41-60", "61-80", "81-100"];
    return ranges.map((range, i) => ({
      name: range,
      contacts: contacts.filter(
        (c) => c.score >= i * 20 && c.score < (i + 1) * 20,
      ).length,
    }));
  }, [contacts]);

  const companyByIndustry = useMemo(() => {
    const map = {};
    companies.forEach((c) => {
      const ind = c.industry || "Other";
      map[ind] = (map[ind] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [companies]);

  const monthlyTrend = useMemo(() => {
    return revenueHistory.map((r) => ({
      month: r.month,
      total: r.store1 + r.store2 + r.store3,
      revenue: r.store1 + r.store2 + r.store3,
    }));
  }, [revenueHistory]);

  const tooltipStyle = {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Analytics & Reports
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentStoreId
              ? `Showing data for selected store`
              : "Showing data for all stores"}
          </p>
        </div>
        <button className="btn-secondary">
          <Download size={16} /> Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Revenue"
          value={stats.totalRevenue}
          color="green"
          format="currency"
          trend={15}
          subtitle={`${stats.wonCount} won deals`}
        />
        <StatsCard
          title="Pipeline Value"
          value={stats.pipeline}
          color="black"
          format="currency"
          trend={8}
          subtitle={`${stats.openCount} open deals`}
        />
        <StatsCard
          title="Win Rate"
          value={stats.winRate}
          color="zinc"
          format="percent"
          trend={3}
          subtitle={`${stats.wonCount} won / ${stats.wonCount + (deals.length - stats.wonCount - stats.openCount)} lost`}
        />
        <StatsCard
          title="Avg Deal Size"
          value={Math.round(stats.avgDealSize)}
          color="orange"
          format="currency"
          subtitle={`${contacts.length} contacts, score: ${stats.avgScore}`}
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Revenue Trend</h3>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1"
            >
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="7m">Last 7 months</option>
              <option value="12m">Last 12 months</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#262626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#262626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                tickFormatter={(v) => `$${v / 1000}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => `$${v.toLocaleString()}`}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#262626"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
                name="Revenue"
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Deal Stages Pie */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Deals by Stage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dealsByStage}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="deals"
                paddingAngle={3}
                nameKey="name"
              >
                {dealsByStage.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {dealsByStage.map((s) => (
              <div key={s.name} className="flex items-center gap-1 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: s.fill }}
                />
                <span className="text-gray-600">
                  {s.name}: {s.deals}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Funnel */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline Funnel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              layout="vertical"
              data={dealsByStage.filter(
                (s) => !["won", "lost"].includes(s.name.toLowerCase()),
              )}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                width={80}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                name="Pipeline Value"
                formatter={(v) => `$${v.toLocaleString()}`}
              >
                {dealsByStage
                  .filter(
                    (s) => !["won", "lost"].includes(s.name.toLowerCase()),
                  )
                  .map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Deal Size Distribution */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">
            Deal Size Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dealsBySize}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="deals"
                fill="#0891b2"
                radius={[4, 4, 0, 0]}
                name="Deals"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Companies by Industry */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">
            Companies by Industry
          </h3>
          {companyByIndustry.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={companyByIndustry}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {companyByIndustry.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              No data
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {companyByIndustry.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
                <span className="text-gray-600">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Pipeline Growth & Contact Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">
            Pipeline Growth Over Time
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={pipelineHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="new"
                stroke="#404040"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="New"
              />
              <Line
                type="monotone"
                dataKey="qualified"
                stroke="#525252"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Qualified"
              />
              <Line
                type="monotone"
                dataKey="proposal"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Proposal"
              />
              <Line
                type="monotone"
                dataKey="won"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Won"
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">
            Contact Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={contactScoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="contacts"
                fill="#262626"
                radius={[4, 4, 0, 0]}
                name="Contacts"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Store Performance Table */}
      <div className="card overflow-x-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Store Performance</h3>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="pb-3 pr-4">Store</th>
                <th className="pb-3 pr-4">Revenue</th>
                <th className="pb-3 pr-4">Target</th>
                <th className="pb-3 pr-4">Achievement</th>
                <th className="pb-3 pr-4">Deals</th>
                <th className="pb-3">Progress</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => {
                const storeDeals = deals.filter(
                  (d) => d.storeId === s.id && d.stage === "won",
                );
                const achievement =
                  s.target > 0 ? Math.round((s.revenue / s.target) * 100) : 0;
                return (
                  <tr key={s.id} className="table-row">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-sm font-medium text-gray-800">
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-sm font-medium text-gray-800">
                      ${s.revenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-sm text-gray-600">
                      ${s.target.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`text-sm font-bold ${achievement >= 100 ? "text-green-600" : achievement >= 70 ? "text-orange-600" : "text-red-600"}`}
                      >
                        {achievement}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-sm text-gray-600">
                      {storeDeals.length}
                    </td>
                    <td className="py-2.5">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, achievement)}%`,
                            backgroundColor: s.color,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
