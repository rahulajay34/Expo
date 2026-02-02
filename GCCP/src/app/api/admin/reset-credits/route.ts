import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    
    // Reset all credits to 0
    const { data, error } = await supabase
      .from('profiles')
      .update({ credits: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows
    
    if (error) {
      console.error('Error resetting credits:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'All user credits reset to 0'
    });
  } catch (error) {
    console.error('Reset credits error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
