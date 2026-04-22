import React, { useState } from "react";
import {
  Save,
  RotateCcw,
  User,
  Building,
  Bell,
  Sliders,
  Palette,
  Plus,
  Trash2,
  Shield,
  Check,
  Calendar,
  Bot,
} from "lucide-react";
import useCRM from "../store/useCRM";
import clsx from "clsx";
import CalendarSync from "../components/CalendarSync";

const TABS = [
  { id: "company", label: "Company", icon: Building },
  { id: "users", label: "Users", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "customization", label: "Customization", icon: Palette },
  { id: "pipeline", label: "Pipeline Stages", icon: Sliders },
  { id: "calendar", label: "Calendar Sync", icon: Calendar },
  { id: "ai", label: "AI Settings", icon: Bot },
];

const ROLE_COLORS = {
  Admin: "bg-red-100 text-red-700",
  Manager: "bg-purple-100 text-purple-700",
  "Sales Rep": "bg-blue-100 text-blue-700",
};
const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
};

export default function Settings() {
  const settings = useCRM((s) => s.settings);
  const updateSettings = useCRM((s) => s.updateSettings);
  const addUser = useCRM((s) => s.addUser);
  const deleteUser = useCRM((s) => s.deleteUser);
  const resetData = useCRM((s) => s.resetData);

  const [tab, setTab] = useState("company");
  const [company, setCompany] = useState({
    name: settings.companyName,
    currency: settings.currency,
    timezone: settings.timezone,
    fiscalYear: settings.fiscalYear,
    primaryColor: "#171717",
  });
  const [notifications, setNotifications] = useState({
    dealUpdates: true,
    dailyDigest: true,
    emailNotifications: false,
    activityReminders: true,
    weeklyReport: true,
  });
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Sales Rep",
  });
  const [saved, setSaved] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    enabled: true,
    contactScoring: true,
    dealPrediction: true,
    autoTag: true,
    recommendations: true,
  });

  const handleSave = () => {
    updateSettings({
      companyName: company.name,
      currency: company.currency,
      timezone: company.timezone,
      fiscalYear: company.fiscalYear,
      primaryColor: company.primaryColor,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddUser = () => {
    if (newUser.name && newUser.email) {
      const initials = newUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
      addUser({ ...newUser, avatar: initials });
      setNewUser({ name: "", email: "", role: "Sales Rep" });
    }
  };

  const handleReset = () => {
    if (
      confirm("Reset all data to defaults? This will clear all your changes.")
    ) {
      resetData();
      setCompany({
        name: "CRM-system",
        currency: "USD",
        timezone: "America/New_York",
        fiscalYear: "January",
        primaryColor: "#171717",
      });
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your CRM configuration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleReset} className="btn-secondary">
            <RotateCcw size={16} /> Reset Data
          </button>
          <button onClick={handleSave} className="btn-primary">
            {saved ? (
              <>
                <Check size={16} /> Saved!
              </>
            ) : (
              <>
                <Save size={16} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
              tab === id
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Company Settings */}
      {tab === "company" && (
        <div className="card space-y-4 fade-in">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building size={18} /> Company Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name</label>
              <input
                value={company.name}
                onChange={(e) =>
                  setCompany({ ...company, name: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label">Currency</label>
              <select
                value={company.currency}
                onChange={(e) =>
                  setCompany({ ...company, currency: e.target.value })
                }
                className="input"
              >
                {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "SGD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Timezone</label>
              <select
                value={company.timezone}
                onChange={(e) =>
                  setCompany({ ...company, timezone: e.target.value })
                }
                className="input"
              >
                {[
                  "America/New_York",
                  "America/Los_Angeles",
                  "Europe/London",
                  "Europe/Paris",
                  "Asia/Tokyo",
                  "Asia/Singapore",
                  "Australia/Sydney",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fiscal Year Starts</label>
              <select
                value={company.fiscalYear}
                onChange={(e) =>
                  setCompany({ ...company, fiscalYear: e.target.value })
                }
                className="input"
              >
                {["January", "April", "July", "October"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={company.primaryColor}
                  onChange={(e) =>
                    setCompany({ ...company, primaryColor: e.target.value })
                  }
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  value={company.primaryColor}
                  onChange={(e) =>
                    setCompany({ ...company, primaryColor: e.target.value })
                  }
                  className="input flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="card space-y-4 fade-in">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield size={18} /> Team Members
          </h3>
          <div className="space-y-3">
            {settings.users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                    {user.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      "badge",
                      ROLE_COLORS[user.role] || "bg-gray-100 text-gray-600",
                    )}
                  >
                    {user.role}
                  </span>
                  <span
                    className={clsx(
                      "badge",
                      STATUS_COLORS[user.status] || "bg-gray-100 text-gray-600",
                    )}
                  >
                    {user.status}
                  </span>
                  {settings.users.length > 1 && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Add New User
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <input
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                className="input"
                placeholder="Full name"
              />
              <input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                className="input"
                placeholder="Email address"
              />
              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
                className="input"
              >
                {["Sales Rep", "Manager", "Admin"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddUser}
              disabled={!newUser.name || !newUser.email}
              className="btn-primary mt-3 disabled:opacity-50"
            >
              <Plus size={14} /> Add User
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === "notifications" && (
        <div className="card space-y-4 fade-in">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bell size={18} /> Notification Preferences
          </h3>
          {[
            {
              key: "dealUpdates",
              label: "Deal updates",
              desc: "Get notified when deals change stages",
            },
            {
              key: "dailyDigest",
              label: "Daily digest",
              desc: "Daily summary of CRM activity",
            },
            {
              key: "emailNotifications",
              label: "Email notifications",
              desc: "Receive notifications via email",
            },
            {
              key: "activityReminders",
              label: "Activity reminders",
              desc: "Reminders for scheduled activities",
            },
            {
              key: "weeklyReport",
              label: "Weekly report",
              desc: "Weekly performance report",
            },
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <button
                onClick={() =>
                  setNotifications({
                    ...notifications,
                    [key]: !notifications[key],
                  })
                }
                className={clsx(
                  "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
                  notifications[key] ? "bg-gray-900" : "bg-gray-200",
                )}
              >
                <span
                  className={clsx(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    notifications[key] ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Customization */}
      {tab === "customization" && (
        <div className="card space-y-4 fade-in">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Palette size={18} /> Customization
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Primary Color</label>
              <input
                type="color"
                value={company.primaryColor}
                onChange={(e) =>
                  setCompany({ ...company, primaryColor: e.target.value })
                }
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="label">Dashboard Layout</label>
              <select className="input">
                <option>Standard</option>
                <option>Compact</option>
                <option>Wide</option>
              </select>
            </div>
            <div>
              <label className="label">Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) => updateSettings({ dateFormat: e.target.value })}
                className="input"
              >
                <option>MM/DD/YYYY</option>
                <option>DD/MM/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="label">Number Format</label>
              <select className="input">
                <option>1,234.56</option>
                <option>1.234,56</option>
              </select>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Preview</p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: company.primaryColor }}
              >
                Primary Button
              </button>
              <button className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium">
                Secondary
              </button>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Success
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Stages */}
      {tab === "pipeline" && (
        <div className="card space-y-4 fade-in">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sliders size={18} /> Pipeline Stages
          </h3>
          <div className="space-y-2">
            {settings.dealStages.map((stage, i) => (
              <div
                key={stage}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-gray-800 capitalize">
                  {stage}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${100 - i * 12}%`,
                        backgroundColor:
                          [
                            "#171717",
                            "#262626",
                            "#404040",
                            "#525252",
                            "#737373",
                            "#a3a3a3",
                          ][i] || "#262626",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Contact statuses: {settings.contactStatuses.join(", ")}
          </p>
        </div>
      )}

      {/* Calendar Sync */}
      {tab === "calendar" && (
        <div className="card space-y-4 fade-in">
          <CalendarSync />
        </div>
      )}

      {/* AI Settings */}
      {tab === "ai" && (
        <div className="card space-y-4 fade-in">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bot size={18} /> AI Features Configuration
          </h3>
          <p className="text-sm text-gray-500">
            Configure which AI features are enabled in your CRM. AI features help analyze contacts, predict deal outcomes, and provide smart recommendations.
          </p>

          {/* Master toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-800">Enable AI Features</p>
              <p className="text-xs text-gray-400">Master switch for all AI-powered features</p>
            </div>
            <button
              onClick={() => setAiSettings({ ...aiSettings, enabled: !aiSettings.enabled })}
              className={clsx(
                "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
                aiSettings.enabled ? "bg-gray-900" : "bg-gray-200",
              )}
            >
              <span
                className={clsx(
                  "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  aiSettings.enabled ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>

          {/* Individual feature toggles */}
          <div className="space-y-3">
            {[
              {
                key: "contactScoring",
                label: "Contact Scoring",
                desc: "AI-powered contact engagement scoring with breakdown analysis",
                model: "contact_score",
              },
              {
                key: "dealPrediction",
                label: "Deal Predictions",
                desc: "Predict deal outcomes and estimated close dates",
                model: "deal_prediction",
              },
              {
                key: "autoTag",
                label: "Smart Auto-Tag",
                desc: "Automatically suggest and apply tags based on content",
                model: "auto_tag",
              },
              {
                key: "recommendations",
                label: "AI Recommendations",
                desc: "Get actionable recommendations for contacts and deals",
                model: "recommendations",
              },
            ].map(({ key, label, desc, model }) => (
              <div
                key={key}
                className={clsx(
                  "flex items-center justify-between p-4 rounded-lg border",
                  aiSettings.enabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100",
                )}
              >
                <div>
                  <p className={clsx("text-sm font-medium", aiSettings.enabled ? "text-gray-800" : "text-gray-400")}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    "px-2 py-1 rounded text-xs font-medium",
                    aiSettings.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400",
                  )}>
                    {aiSettings.enabled ? "Active" : "Disabled"}
                  </span>
                  <button
                    onClick={() => aiSettings.enabled && setAiSettings({ ...aiSettings, [key]: !aiSettings[key] })}
                    disabled={!aiSettings.enabled}
                    className={clsx(
                      "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
                      aiSettings[key] && aiSettings.enabled ? "bg-gray-900" : "bg-gray-200",
                      !aiSettings.enabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <span
                      className={clsx(
                        "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                        aiSettings[key] && aiSettings.enabled ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Model Status */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Model Status</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Contact Scoring", status: aiSettings.enabled && aiSettings.contactScoring ? "operational" : "disabled" },
                { name: "Deal Prediction", status: aiSettings.enabled && aiSettings.dealPrediction ? "operational" : "disabled" },
                { name: "Auto Tag", status: aiSettings.enabled && aiSettings.autoTag ? "operational" : "disabled" },
                { name: "Recommendations", status: aiSettings.enabled && aiSettings.recommendations ? "operational" : "disabled" },
              ].map((model) => (
                <div key={model.name} className="flex items-center gap-2">
                  <div className={clsx(
                    "w-2 h-2 rounded-full",
                    model.status === "operational" ? "bg-green-500" : "bg-gray-300",
                  )} />
                  <span className="text-sm text-gray-600">{model.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
