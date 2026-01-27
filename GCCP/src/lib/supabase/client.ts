import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

// These must be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Creates a Supabase client for use in browser/client components
 * This client respects RLS policies based on the authenticated user
 */
export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
    );
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Singleton instance for convenience
let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}
