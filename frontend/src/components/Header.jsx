import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Plus, LogOut, Sun, Moon } from "lucide-react";
import useCRM from "../store/useCRM";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "./NotificationBell";
import { search } from "../lib/ai/smartSearch";

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

  // Smart AI search
  const smartSearchResults = search.length > 1
    ? search(search, contacts, companies, [])
    : [];

  const searchResults = smartSearchResults.slice(0, 8);

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-4 z-10 safe-top">
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
                <div className="absolute top-10 left-0 bg-white rounded-xl shadow-xl border border-gray-200 w-80 z-50 overflow-hidden">
                  {/* Group by type */}
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-500 uppercase">Results</span>
                  </div>
                  {searchResults.map((r, i) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onMouseDown={() => navigate(r.type === "contact" ? "/contacts" : r.type === "company" ? "/companies" : "/deals")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 text-left"
                    >
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                        {r.title ? r.title.slice(0, 2).toUpperCase() : "??"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {r.highlights && r.highlights.length > 0 ? (
                            <>
                              {r.highlights[0].context.split(r.highlights[0].match).map((part, idx, arr) => (
                                <span key={idx}>
                                  {part}
                                  {idx < arr.length - 1 && (
                                    <mark className="bg-yellow-200 text-gray-900">{r.highlights[0].match}</mark>
                                  )}
                                </span>
                              ))}
                            </>
                          ) : r.title}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{r.type}</p>
                      </div>
                      <span className="text-xs text-gray-400">{r.score}</span>
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
      <NotificationBell />

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
