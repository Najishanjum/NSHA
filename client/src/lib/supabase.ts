import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_PROJECT_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://vchxpfqrfqzitjvwbjfh.supabase.co';
const SUPABASE_PROJECT_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaHhwZnFyZnF6aXRqdndiamZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjkzNjksImV4cCI6MjEwNTE0NTM2OX0.CBFrBU5mOBYR8ynX_DtSCq4sRZNPKxILc8fC4TcrFPE';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_PROJECT_URL &&
    SUPABASE_PROJECT_ANON_KEY &&
    SUPABASE_PROJECT_URL.startsWith('http')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_PROJECT_URL, SUPABASE_PROJECT_ANON_KEY)
  : null;
