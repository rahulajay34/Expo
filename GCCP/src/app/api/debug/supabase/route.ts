import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Debug endpoint to test Supabase connectivity and auth status
 * Access: GET /api/debug/supabase
 * 
 * This helps diagnose:
 * - Whether Supabase is properly configured
 * - Whether the user session is active
 * - Whether profile exists for the current user
 * - Whether RLS policies are working
 */
export async function GET() {
  const debugInfo: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https:\/\/([^.]+)\..*/, 'https://$1.***'),
    },
    auth: null,
    profile: null,
    errors: [] as string[],
  };

  try {
    const supabase = await createServerSupabaseClient();
    
    // Check auth status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      debugInfo.auth = { error: authError.message };
      debugInfo.errors.push(`Auth error: ${authError.message}`);
    } else if (user) {
      debugInfo.auth = {
        userId: user.id,
        email: user.email,
        provider: user.app_metadata?.provider || 'unknown',
        emailConfirmed: !!user.email_confirmed_at,
        createdAt: user.created_at,
      };
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        debugInfo.profile = { 
          error: profileError.message,
          code: profileError.code,
          hint: profileError.hint,
        };
        debugInfo.errors.push(`Profile error (${profileError.code}): ${profileError.message}`);
        
        // If profile doesn't exist, show a helpful message
        if (profileError.code === 'PGRST116') {
          debugInfo.errors.push('Profile does not exist - it should have been created by the database trigger or OAuth callback');
        }
      } else {
        debugInfo.profile = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          credits: profile.credits,
          createdAt: profile.created_at,
        };
      }
      
      // Test if we can read generations (to verify RLS)
      const { data: generations, error: genError } = await supabase
        .from('generations')
        .select('id, topic, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      debugInfo.generations = {
        count: generations?.length ?? 0,
        error: genError?.message,
        recent: generations?.map(g => ({ id: g.id, topic: g.topic.substring(0, 50) })) || [],
      };
      
    } else {
      debugInfo.auth = { status: 'not_authenticated' };
      debugInfo.errors.push('User is not authenticated');
    }

  } catch (error: any) {
    debugInfo.errors.push(`Unexpected error: ${error.message}`);
  }

  return NextResponse.json(debugInfo, { status: 200 });
}
