/**
 * Debug endpoint to view generation logs
 * GET /api/debug/logs?id=<generation_id>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'generation_id required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get generation details
  const { data: generation } = await supabase
    .from('generations')
    .select('*')
    .eq('id', id)
    .single();

  // Get all logs for this generation
  const { data: logs } = await supabase
    .from('generation_logs')
    .select('*')
    .eq('generation_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    generation,
    logs: logs || [],
    logCount: logs?.length || 0,
  });
}
