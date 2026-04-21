import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Companies from "./pages/Companies";
import Deals from "./pages/Deals";
import Stores from "./pages/Stores";
import Activities from "./pages/Activities";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import useCRM from "./store/useCRM";
import { isSupabaseConfigured } from "./lib/supabase";
import { hasPermission, ROLES } from "./lib/permissions";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading CRM-system
        </h2>
        <p className="text-gray-500 text-sm">
          {isSupabaseConfigured()
            ? "Connecting to Supabase..."
            : "Initializing local data..."}
        </p>
      </div>
    </div>
  );
}

function ErrorFallback({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Connection Error
        </h2>
        <p className="text-gray-500 text-sm mb-4">{message}</p>
        <div className="space-y-2">
          <button
            onClick={onRetry}
            className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition-colors font-medium"
          >
            Try Again
          </button>
          <p className="text-xs text-gray-400">
            Using offline data. Data changes will not persist.
          </p>
        </div>
      </div>
    </div>
  );
}

// Protected Route - requires authentication
function ProtectedRoute({ children, requireAdmin = false }) {
  const user = useCRM((s) => s.user);
  const loading = useCRM((s) => s.loading);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Checking authentication...
        </h2>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check for admin role if required
  if (
    requireAdmin &&
    user.role !== ROLES.ADMIN &&
    !hasPermission(user.role, "settings", "write")
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render child route if authenticated
  return children;
}

// Public Route - redirects to dashboard if already authenticated
function PublicRoute({ children }) {
  const user = useCRM((s) => s.user);
  const loading = useCRM((s) => s.loading);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render child route if not authenticated
  return children;
}

// Routes component that must be rendered within BrowserRouter
function AppRoutes() {
  // Register global keyboard shortcuts (must be inside Router context)
  useKeyboardShortcuts({
    "mod+d": "Navigate to Dashboard",
    "mod+c": "Navigate to Contacts",
    "mod+o": "Navigate to Companies",
    "mod+p": "Navigate to Deals",
    "mod+a": "Navigate to Activities",
    "mod+/": "Focus Search",
    escape: "Close Modal",
  });

  return (
    <Routes>
      {/* Public route - Login page */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="contacts"
          element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          }
        />
        <Route
          path="companies"
          element={
            <ProtectedRoute>
              <Companies />
            </ProtectedRoute>
          }
        />
        <Route
          path="deals"
          element={
            <ProtectedRoute>
              <Deals />
            </ProtectedRoute>
          }
        />
        <Route
          path="stores"
          element={
            <ProtectedRoute>
              <Stores />
            </ProtectedRoute>
          }
        />
        <Route
          path="activities"
          element={
            <ProtectedRoute>
              <Activities />
            </ProtectedRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const initialize = useCRM((s) => s.initialize);
  const loading = useCRM((s) => s.loading);
  const error = useCRM((s) => s.error);

  // Initialize in production mode if Supabase is configured
  useEffect(() => {
    if (isSupabaseConfigured()) {
      const init = async () => {
        await initialize();
        setInitialized(true);
      };
      init();
    } else {
      setInitialized(true);
    }
  }, []);

  // Show loading screen while initializing
  if (!initialized || loading) {
    return <LoadingScreen />;
  }

  // Show error fallback if Supabase connection failed
  if (error && isSupabaseConfigured()) {
    return <ErrorFallback message={error} onRetry={initialize} />;
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
