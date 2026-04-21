import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Replace with your actual Supabase credentials
// Get these from: https://supabase.com/dashboard -> Your Project -> Settings -> API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

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
    SUPABASE_URL !== 'https://your-project.supabase.co' &&
    SUPABASE_ANON_KEY !== 'your-anon-key'
  );
};

// Database table names
export const TABLES = {
  contacts: 'contacts',
  companies: 'companies',
  deals: 'deals',
  stores: 'stores',
  activities: 'activities',
  settings: 'settings',
  users: 'users',
  revenue_history: 'revenue_history',
  pipeline_history: 'pipeline_history',
};
