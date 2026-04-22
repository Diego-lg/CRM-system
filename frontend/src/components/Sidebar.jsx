import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  Store,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Database,
  Cloud,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import useCRM from "../store/useCRM";
import { useTheme } from "../context/ThemeContext";
import { isSupabaseConfigured } from "../lib/supabase";
import clsx from "clsx";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Contacts", path: "/contacts", icon: Users },
  { label: "Companies", path: "/companies", icon: Building2 },
  { label: "Deals", path: "/deals", icon: TrendingUp },
  { label: "Stores", path: "/stores", icon: Store },
  { label: "Activities", path: "/activities", icon: Calendar },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar({ open, setOpen }) {
  const stores = useCRM((s) => s.stores);
  const currentStoreId = useCRM((s) => s.currentStoreId);
  const setCurrentStore = useCRM((s) => s.setCurrentStore);
  const user = useCRM((s) => s.user);
  const logout = useCRM((s) => s.logout);
  const { isDarkMode, toggleTheme } = useTheme();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={clsx(
          "flex flex-col bg-gray-900 text-white transition-all duration-300 flex-shrink-0 overflow-hidden fixed inset-y-0 left-0 z-50 lg:relative lg:inset-auto lg:z-auto lg:block",
          "transform lg:transform-none",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          open ? "w-64" : "w-64 lg:w-16",
        )}
      >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        {open && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              CRM-system
            </span>
          </div>
        )}
        {!open && (
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mx-auto">
            <Zap size={16} className="text-white" />
          </div>
        )}
        {open && (
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="text-gray-400 hover:text-white transition-colors absolute left-12 bg-gray-900 rounded-r p-1"
            style={{ display: "none" }}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Store Selector */}
      {open && (
        <div className="px-3 py-3 border-b border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
            Store
          </p>
          <select
            value={currentStoreId || ""}
            onChange={(e) => setCurrentStore(e.target.value || null)}
            className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-gray-900"
          >
            <option value="">All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {open && (
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-4">
            Main Menu
          </p>
        )}
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-150 mb-0.5 group",
                isActive
                  ? "bg-black text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white",
              )
            }
            title={!open ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {open && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Dark Mode Toggle */}
      {open && (
        <div className="px-4 py-2 border-t border-gray-700">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-sm font-medium">
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
        </div>
      )}

      {/* Bottom toggle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center py-4 text-gray-500 hover:text-white border-t border-gray-700"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Connection Status */}
      {open && (
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="flex items-center gap-2 text-xs">
            {isSupabaseConfigured() ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <Cloud size={12} className="text-green-400" />
                <span className="text-gray-400">Supabase Connected</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <Database size={12} className="text-yellow-400" />
                <span className="text-gray-400">Local Mode</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* User Profile */}
      {open && (
        <div className="px-4 py-3 border-t border-gray-700 flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
              {user?.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "AR"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {user?.name || "Guest User"}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.role || "User"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
    </>
  );
}
