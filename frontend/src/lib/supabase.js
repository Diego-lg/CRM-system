import { createClient } from "@supabase/supabase-js";

// Supabase configuration - Replace with your actual Supabase credentials
// Get these from: https://supabase.com/dashboard -> Your Project -> Settings -> API
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

// Demo mode when Supabase is not configured
export const DEMO_MODE =
  SUPABASE_URL === "https://your-project.supabase.co" ||
  SUPABASE_ANON_KEY === "your-anon-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return (
    SUPABASE_URL !== "https://your-project.supabase.co" &&
    SUPABASE_ANON_KEY !== "your-anon-key"
  );
};

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} metadata - Additional user metadata (full_name, etc.)
 * @returns {Promise<{data, error}>}
 */
export const signUp = async (email, password, metadata = {}) => {
  if (DEMO_MODE) {
    return {
      data: null,
      error: new Error("Sign up is not available in demo mode"),
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  // Profile creation is handled by the database trigger: on_auth_user_created
  // which calls public.handle_new_user() function
  // (defined in supabase/schema.sql)

  return { data, error };
};

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{data, error}>}
 */
export const signIn = async (email, password) => {
  if (DEMO_MODE) {
    return {
      data: null,
      error: new Error("Sign in is not available in demo mode"),
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

/**
 * Sign out the current user
 * @returns {Promise<{error}>}
 */
export const signOut = async () => {
  if (DEMO_MODE) {
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();
  return { error };
};

/**
 * Get the current authenticated user with profile
 * @returns {Promise<{user, profile, error}>}
 */
export const getCurrentUser = async () => {
  if (DEMO_MODE) {
    return {
      user: { id: "demo-user", email: "demo@crm.local", role: "admin" },
      profile: { id: "demo-user", full_name: "Demo User", role: "admin" },
      error: null,
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null, error };
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile, error: profileError };
};

/**
 * Update user profile
 * @param {object} updates - Fields to update (full_name, avatar, phone, role)
 * @returns {Promise<{data, error}>}
 */
export const updateProfile = async (updates) => {
  if (DEMO_MODE) {
    return { data: updates, error: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  return { data, error };
};

// Database table names
export const TABLES = {
  contacts: "contacts",
  companies: "companies",
  deals: "deals",
  stores: "stores",
  activities: "activities",
  settings: "settings",
  users: "users",
  profiles: "profiles",
  revenue_history: "revenue_history",
  pipeline_history: "pipeline_history",
};
