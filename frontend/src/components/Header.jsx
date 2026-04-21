import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Bell, Plus, LogOut, Sun, Moon } from "lucide-react";
import useCRM from "../store/useCRM";
import { useTheme } from "../context/ThemeContext";

const PAGE_NAMES = {
  "/dashboard": "Dashboard",
  "/contacts": "Contacts",
  "/companies": "Companies",
  "/deals": "Pipeline",
  "/stores": "Stores",
  "/activities": "Activities",
  "/analytics": "Analytics & Reports",
  "/settings": "Settings",
};

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const contacts = useCRM((s) => s.contacts);
  const companies = useCRM((s) => s.companies);
  const activities = useCRM((s) => s.activities);
  const mode = useCRM((s) => s.mode);
  const setMode = useCRM((s) => s.setMode);
  const user = useCRM((s) => s.user);
  const logout = useCRM((s) => s.logout);
  const { isDarkMode, toggleTheme } = useTheme();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  };

  const title = PAGE_NAMES[location.pathname] || "CRM-system";

  const pendingCount = activities.filter(
    (a) => a.status !== "completed",
  ).length;

  const searchResults =
    search.length > 1
      ? [
          ...contacts
            .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 3)
            .map((c) => ({ ...c, type: "Contact", path: "/contacts" })),
          ...companies
            .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 2)
            .map((c) => ({ ...c, type: "Company", path: "/companies" })),
        ]
      : [];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 z-10">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-gray-500 hover:text-gray-900 transition-colors"
      >
        <Menu size={20} />
      </button>

      <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
        {title}
      </h1>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        {showSearch ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => {
                  setTimeout(() => {
                    setShowSearch(false);
                    setSearch("");
                  }, 200);
                }}
                placeholder="Search contacts, companies..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-10 left-0 bg-white rounded-xl shadow-xl border border-gray-200 w-72 z-50 overflow-hidden">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onMouseDown={() => navigate(r.path)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 text-left"
                    >
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                        {r.avatar || r.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {r.name}
                        </p>
                        <p className="text-xs text-gray-400">{r.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
          >
            <Search size={20} />
          </button>
        )}
      </div>

      {/* Notifications */}
      <button className="relative text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100">
        <Bell size={20} />
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleTheme}
        className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Mode Toggle */}
      <button
        onClick={() => setMode(mode === "demo" ? "production" : "demo")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          mode === "demo"
            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
            : "bg-green-100 text-green-800 hover:bg-green-200"
        }`}
        title={
          mode === "demo" ? "Switch to Production mode" : "Switch to Demo mode"
        }
      >
        <span
          className={`w-2 h-2 rounded-full ${mode === "demo" ? "bg-amber-500" : "bg-green-500"}`}
        />
        {mode === "demo" ? "DEMO" : "LIVE"}
      </button>

      {/* User Display */}
      {user && (
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "GU"}
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">
              {user.name || "Guest"}
            </p>
            <p className="text-xs text-gray-500">{user.role || "User"}</p>
          </div>
        </div>
      )}

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
        title="Log out"
      >
        <LogOut size={20} />
      </button>

      {/* Quick Add */}
      <button
        onClick={() => navigate(location.pathname)}
        className="btn-primary"
      >
        <Plus size={16} />
        <span className="hidden sm:inline">Add New</span>
      </button>
    </header>
  );
}
