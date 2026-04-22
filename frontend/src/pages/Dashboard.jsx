import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  DollarSign,
  Users,
  Briefcase,
  Activity,
  TrendingUp,
  Target,
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import AIRecommendations from "../components/AIRecommendations";
import useCRM from "../store/useCRM";
import { generateRecommendations } from "../lib/ai/recommendationEngine";

const STAGE_COLORS = {
  new: "#404040",
  qualified: "#525252",
  proposal: "#737373",
  negotiation: "#a3a3a3",
  won: "#16a34a",
  lost: "#dc2626",
};
const STAGE_LABELS = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};
const CHART_COLORS = {
  store1: "#262626",
  store2: "#404040",
  store3: "#737373",
};

function setupMatplotlib() {
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const stats = useCRM((s) => s.getDashboardStats());
  const deals = useCRM((s) => s.getFilteredDeals());
  const contacts = useCRM((s) => s.getFilteredContacts());
  const activities = useCRM((s) => s.activities);
  const revenueHistory = useCRM((s) => s.revenueHistory);
  const pipelineHistory = useCRM((s) => s.pipelineHistory);
  const stores = useCRM((s) => s.stores);
  const currentStoreId = useCRM((s) => s.currentStoreId);
  const addActivity = useCRM((s) => s.addActivity);

  const [recommendations, setRecommendations] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Generate recommendations on mount
  useEffect(() => {
    const recs = generateRecommendations(deals, contacts, activities);
    setRecommendations(recs);
  }, [deals, contacts, activities]);

  // Handle taking action on a recommendation
  const handleTakeAction = (recommendation) => {
    // Create a follow-up activity based on the recommendation
    if (recommendation.type === "contact_reengage" || recommendation.type === "churn_risk") {
      const contact = contacts.find(c => c.id === recommendation.contactId);
      if (contact) {
        addActivity({
          type: "call",
          title: `Follow up with ${contact.name}`,
          contact: contact.name,
          contactId: contact.id,
          company: contact.company,
          date: new Date().toISOString().split("T")[0],
          status: "pending",
          priority: recommendation.priority === "high" ? "high" : "medium",
          storeId: currentStoreId || "",
        });
      }
    } else if (recommendation.type === "deal_upsell") {
      const deal = deals.find(d => d.id === recommendation.dealId);
      if (deal) {
        addActivity({
          type: "meeting",
          title: `Upsell opportunity: ${deal.title}`,
          contact: deal.contact,
          contactId: deal.contact,
          company: deal.company,
          date: new Date().toISOString().split("T")[0],
          status: "pending",
          priority: recommendation.priority === "high" ? "high" : "medium",
          storeId: currentStoreId || "",
        });
      }
    } else if (recommendation.type === "next_action") {
      addActivity({
        type: "task",
        title: recommendation.title,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        priority: recommendation.priority === "high" ? "high" : "medium",
        storeId: currentStoreId || "",
      });
    }
    // Dismiss after taking action
    setDismissedIds(prev => new Set([...prev, recommendation.id]));
  };

  // Handle dismissing a recommendation
  const handleDismiss = (id) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  // Filter out dismissed recommendations
  const visibleRecommendations = recommendations.filter(r => !dismissedIds.has(r.id));

  const dealsByStage = (stats) => {
    const stages = [
      "new",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
    ];
    return stages.map((stage) => ({
      name: STAGE_LABELS[stage],
      value: deals.filter((d) => d.stage === stage).length,
      fill: STAGE_COLORS[stage],
    }));
  };

  const recentActivities = activities
    .filter((a) => (currentStoreId ? a.storeId === currentStoreId : true))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const upcomingDeals = deals
    .filter((d) => !["won", "lost"].includes(d.stage))
    .sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate))
    .slice(0, 5);

  const topContacts = contacts.sort((a, b) => b.score - a.score).slice(0, 5);

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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Revenue"
          value={stats.totalRevenue}
          icon={DollarSign}
          trend={12}
          color="black"
          format="currency"
          subtitle="From closed deals"
        />
        <StatsCard
          title="Pipeline Value"
          value={stats.pipelineValue}
          icon={TrendingUp}
          trend={8}
          color="slate"
          format="currency"
          subtitle="Active deals"
        />
        <StatsCard
          title="Open Deals"
          value={stats.openDeals}
          icon={Briefcase}
          color="gray"
          subtitle={`Win rate: ${stats.winRate}%`}
        />
        <StatsCard
          title="Contacts"
          value={stats.contacts}
          icon={Users}
          trend={5}
          color="zinc"
          subtitle={`${stats.companies} companies`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Revenue Trend</h3>
            <span className="text-xs text-gray-400">Last 7 months</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueHistory}>
              <defs>
                <linearGradient id="colorStore1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#262626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#262626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorStore2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#404040" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#404040" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorStore3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#737373" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#737373" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(v) => `$${v / 1000}k`}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="store1"
                stroke="#262626"
                fillOpacity={1}
                fill="url(#colorStore1)"
                strokeWidth={2}
                name="North America"
              />
              <Area
                type="monotone"
                dataKey="store2"
                stroke="#404040"
                fillOpacity={1}
                fill="url(#colorStore2)"
                strokeWidth={2}
                name="EMEA"
              />
              <Area
                type="monotone"
                dataKey="store3"
                stroke="#737373"
                fillOpacity={1}
                fill="url(#colorStore3)"
                strokeWidth={2}
                name="APAC"
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Deal Stages Pie */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Deal Pipeline</h3>
            <button
              onClick={() => navigate("/deals")}
              className="text-xs text-black hover:text-gray-600 font-medium"
            >
              View all
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dealsByStage()}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                paddingAngle={3}
              >
                {dealsByStage().map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {dealsByStage().map((stage) => (
              <div
                key={stage.name}
                className="flex items-center gap-1.5 text-xs"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: stage.fill }}
                />
                <span className="text-gray-600">
                  {stage.name}: {stage.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Bar Chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline Growth</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="new"
                fill="#404040"
                radius={[4, 4, 0, 0]}
                name="New"
              />
              <Bar
                dataKey="won"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                name="Won"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Deals */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Top Deals</h3>
            <button
              onClick={() => navigate("/deals")}
              className="text-xs text-black hover:text-gray-600 font-medium"
            >
              View pipeline
            </button>
          </div>
          <div className="space-y-3">
            {upcomingDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {deal.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {deal.company?.name || deal.company}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <span className="text-xs text-gray-400">
                      {deal.closeDate}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 ml-3">
                  ${deal.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contacts */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Top Contacts</h3>
            <button
              onClick={() => navigate("/contacts")}
              className="text-xs text-black hover:text-gray-600 font-medium"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {topContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {contact.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {contact.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {contact.email}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {contact.score}
                  </span>
                  <p className="text-xs text-gray-400">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          <button
            onClick={() => navigate("/activities")}
            className="text-xs text-black hover:text-gray-600 font-medium"
          >
            View all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="pb-3 pr-4">Activity</th>
                <th className="pb-3 pr-4">Contact</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Priority</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity) => (
                <tr key={activity.id} className="table-row">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">
                        {activity.type}
                      </span>
                      <span className="text-sm text-gray-800">
                        {activity.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-gray-600">
                    {activity.contact}
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-gray-500">
                    {activity.date}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="badge bg-gray-100 text-gray-700">
                      {activity.status}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`badge ${activity.priority === "high" ? "bg-red-100 text-red-700" : activity.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {activity.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Recommendations Panel */}
      <div className="card">
        <AIRecommendations
          recommendations={visibleRecommendations}
          onTakeAction={handleTakeAction}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
}
