# Phase 1: Authentication & Core UX

## Overview
This phase adds user authentication, role-based access control, session management, dark mode toggle, and keyboard shortcuts to improve security and user experience.

---

## 1. Authentication System

### 1.1 Supabase Auth Setup

#### Modify `frontend/src/lib/supabase.js`
```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Add auth-specific exports
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};
```

### 1.2 Database Schema Updates

#### Add to `supabase/schema.sql`

```sql
-- ============================================
-- AUTH & USER MANAGEMENT
-- ============================================

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'sales_rep' CHECK (role IN ('admin', 'manager', 'sales_rep')),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personal API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (name, subject, body, is_default) VALUES
    ('Welcome Email', 'Welcome to CRM-system', 'Hello {{name}}, welcome to our CRM!', TRUE),
    ('Deal Won', 'Congratulations! Deal Won', 'Dear {{name}}, your deal {{deal_title}} has been won!', FALSE)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- API keys policies
CREATE POLICY "Users can manage own API keys" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Email templates policies (admin only for write)
CREATE POLICY "Anyone can view email templates" ON email_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage email templates" ON email_templates FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

---

## 2. Role-Based Access Control

### 2.1 Role Definitions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, manage users, manage settings, view all data |
| **Manager** | View all data, manage team, create reports |
| **Sales Rep** | View own data, manage own contacts/deals/activities |

### 2.2 Permission Helper

#### Create `frontend/src/lib/permissions.js`
```javascript
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES_REP: 'sales_rep',
};

export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    users: { read: true, write: true, delete: true },
    settings: { read: true, write: true },
    contacts: { read: true, write: true, delete: true },
    companies: { read: true, write: true, delete: true },
    deals: { read: true, write: true, delete: true },
    activities: { read: true, write: true, delete: true },
    stores: { read: true, write: true, delete: true },
    reports: { read: true, write: true },
    exports: { read: true, write: true },
  },
  [ROLES.MANAGER]: {
    users: { read: true, write: false, delete: false },
    settings: { read: true, write: false },
    contacts: { read: true, write: true, delete: true },
    companies: { read: true, write: true, delete: true },
    deals: { read: true, write: true, delete: true },
    activities: { read: true, write: true, delete: true },
    stores: { read: true, write: true, delete: false },
    reports: { read: true, write: true },
    exports: { read: true, write: true },
  },
  [ROLES.SALES_REP]: {
    users: { read: false, write: false, delete: false },
    settings: { read: true, write: false },
    contacts: { read: 'own', write: true, delete: 'own' },
    companies: { read: 'own', write: true, delete: 'own' },
    deals: { read: 'own', write: true, delete: 'own' },
    activities: { read: true, write: true, delete: 'own' },
    stores: { read: true, write: false, delete: false },
    reports: { read: 'own', write: false },
    exports: { read: 'own', write: false },
  },
};

export function hasPermission(role, resource, action) {
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  const resourcePerms = perms[resource];
  if (!resourcePerms) return false;
  return resourcePerms[action] === true;
}

export function canAccessRecord(role, resource, record, userId) {
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  const resourcePerms = perms[resource];
  if (!resourcePerms || resourcePerms.read === false) return false;
  if (resourcePerms.read === true) return true;
  // 'own' check - record must belong to user
  return record?.storeId === userId || record?.owner === userId;
}
```

---

## 3. Login Page Component

### Create `frontend/src/pages/Login.jsx`
```jsx
import React, { useState } from 'react';
import { signIn, signUp } from '../lib/supabase';
import useCRM from '../store/useCRM';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const initialize = useCRM((s) => s.initialize);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = isLogin 
      ? await signIn(email, password)
      : await signUp(email, password);

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Initialize CRM store with user context
    await initialize();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CRM-system</h1>
          <p className="text-gray-500 mt-2">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              {isLogin 
                ? "Don't have an account? Sign Up" 
                : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Demo mode available. Set Supabase env vars to enable auth.
        </p>
      </div>
    </div>
  );
}
```

---

## 4. Protected Routes

### Modify `frontend/src/App.jsx`
```jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import { isSupabaseConfigured, getCurrentUser } from "./lib/supabase";
import { hasPermission } from "./lib/permissions";

// Protected Route Component
function ProtectedRoute({ children, requiredRole }) {
  const user = useCRM((s) => s.user);
  const isAuthenticated = useCRM((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasPermission(user?.role, requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Public Route (redirect if logged in)
function PublicRoute({ children }) {
  const isAuthenticated = useCRM((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading CRM-system
        </h2>
      </div>
    </div>
  );
}

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const initialize = useCRM((s) => s.initialize);
  const setUser = useCRM((s) => s.setUser);
  const loading = useCRM((s) => s.loading);
  const error = useCRM((s) => s.error);
  const isAuthenticated = useCRM((s) => s.isAuthenticated);

  useEffect(() => {
    const init = async () => {
      if (isSupabaseConfigured()) {
        const { user } = await getCurrentUser();
        if (user) {
          setUser(user);
        }
        await initialize();
      }
      setInitialized(true);
    };
    init();
  }, []);

  if (!initialized || loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="companies" element={<Companies />} />
        <Route path="deals" element={<Deals />} />
        <Route path="stores" element={<Stores />} />
        <Route path="activities" element={<Activities />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={
          <ProtectedRoute requiredRole="settings">
            <Settings />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}
```

---

## 5. Store Updates for Auth

### Modify `frontend/src/store/useCRM.js`
Add these state and actions:
```javascript
const useCRM = create((set, get) => ({
  // ... existing state ...

  // Auth state
  user: null,
  isAuthenticated: false,

  // Set user from Supabase auth
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user 
  }),

  // Logout
  logout: async () => {
    const { error } = await signOut();
    if (!error) {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
```

---

## 6. Dark Mode Toggle

### 6.1 Add Theme Context

Create `frontend/src/context/ThemeContext.jsx`:
```jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggle = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### 6.2 Update Tailwind Config

#### Modify `frontend/tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f0f0f',
          card: '#1a1a1a',
          border: '#2a2a2a',
          text: '#f5f5f5',
        }
      }
    },
  },
  plugins: [],
}
```

### 6.3 Dark Mode CSS

Add to `frontend/src/index.css`:
```css
@layer base {
  .dark {
    color-scheme: dark;
  }
  .dark body {
    background-color: #0f0f0f;
    color: #f5f5f5;
  }
}
```

---

## 7. Keyboard Shortcuts

### Create `frontend/src/hooks/useKeyboardShortcuts.js`
```javascript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + key shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'd':
            e.preventDefault();
            navigate('/dashboard');
            break;
          case 'c':
            e.preventDefault();
            navigate('/contacts');
            break;
          case 'o':
            e.preventDefault();
            navigate('/companies');
            break;
          case 'p':
            e.preventDefault();
            navigate('/deals');
            break;
          case 'a':
            e.preventDefault();
            navigate('/activities');
            break;
          case '/':
            e.preventDefault();
            // Focus search
            document.querySelector('input[placeholder*="Search"]')?.focus();
            break;
          case 'n':
            e.preventDefault();
            // Open new modal based on page
            break;
        }
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        document.querySelector('[aria-modal="true"]')?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
```

---

## 8. Implementation Checklist

- [ ] Update `supabase/schema.sql` with auth tables
- [ ] Update `frontend/src/lib/supabase.js` with auth functions
- [ ] Create `frontend/src/lib/permissions.js` for RBAC
- [ ] Create `frontend/src/pages/Login.jsx` authentication page
- [ ] Create `frontend/src/context/ThemeContext.jsx` for dark mode
- [ ] Update `frontend/tailwind.config.js` for dark mode
- [ ] Add dark mode styles to `frontend/src/index.css`
- [ ] Create `frontend/src/hooks/useKeyboardShortcuts.js`
- [ ] Update `frontend/src/App.jsx` with protected routes
- [ ] Update `frontend/src/store/useCRM.js` with auth state
- [ ] Add logout button to Header/Sidebar
- [ ] Add dark mode toggle to Settings page

---

## Next Phase
See [Phase 2: Data Management & Automation](./Phase-2-Data-Management-Automation.md)