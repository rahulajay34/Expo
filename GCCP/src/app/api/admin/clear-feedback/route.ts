import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Get request body
        const { mode, userId } = await request.json();

        if (!mode || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: mode and userId' },
                { status: 400 }
            );
        }

        // Check if user is admin using server client
        const supabase = await createServerSupabaseClient();
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

        // Use service role client for database operations (bypasses RLS)
        // Must use createClient directly since new tables aren't in Database types yet
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            return NextResponse.json(
                { error: 'Missing Supabase credentials' },
                { status: 500 }
            );
        }

        const serviceClient = createClient(supabaseUrl, serviceKey);

        // Fetch current feedback
        const { data: currentFeedback, error: fetchError } = await serviceClient
            .from('meta_feedback')
            .select('*')
            .eq('mode', mode)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                // No feedback to clear
                return NextResponse.json({
                    success: true,
                    message: 'No feedback to clear'
                });
            }
            console.error('Error fetching feedback:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        // Archive to history
        const { error: archiveError } = await serviceClient
            .from('meta_feedback_history')
            .insert({
                mode,
                feedback_content: currentFeedback.feedback_content,
                acknowledged_by: userId
            });

        if (archiveError) {
            console.error('Error archiving feedback:', archiveError);
            return NextResponse.json({ error: archiveError.message }, { status: 500 });
        }

        // Reset the feedback
        const { error: resetError } = await serviceClient
            .from('meta_feedback')
            .update({
                feedback_content: {
                    scores: {
                        formatting: 0,
                        pedagogy: 0,
                        clarity: 0,
                        structure: 0,
                        consistency: 0,
                        factualAccuracy: 0
                    },
                    scoreTrends: {},
                    issuesClusters: [],
                    strengths: [],
                    overallAssessment: ''
                },
                generation_count: 0,
                last_updated: new Date().toISOString()
            })
            .eq('mode', mode);

        if (resetError) {
            console.error('Error resetting feedback:', resetError);
            return NextResponse.json({ error: resetError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Feedback for ${mode} cleared and archived`
        });
    } catch (error: any) {
        console.error('Clear feedback error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
