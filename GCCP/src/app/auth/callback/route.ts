import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * OAuth callback handler
 * This route exchanges the OAuth code for a session and ensures profile exists
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      console.log('[Auth Callback] Session created for user:', data.user.id);
      
      // Ensure profile exists - the database trigger should create it,
      // but we verify here as a fallback
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();
      
      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it manually
        console.log('[Auth Callback] Creating profile for new user...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            role: 'user',
            credits: 0,
          });
        
        if (insertError) {
          console.error('[Auth Callback] Failed to create profile:', insertError);
          // Continue anyway - profile creation might succeed on client side
        } else {
          console.log('[Auth Callback] Profile created successfully');
        }
      } else if (existingProfile) {
        console.log('[Auth Callback] Profile already exists');
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
    
    console.error('[Auth Callback] Error exchanging code:', error);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
