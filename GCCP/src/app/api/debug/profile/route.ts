import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Debug endpoint to check profile loading
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return NextResponse.json({ error: 'Session error', details: sessionError }, { status: 401 });
    }
    
    if (!session) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return NextResponse.json({
      userId,
      userEmail,
      profile,
      profileError: profileError ? { code: profileError.code, message: profileError.message } : null,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error', details: String(err) }, { status: 500 });
  }
}
