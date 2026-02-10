import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XAIClient } from '@/lib/xai/client';
import { FormatterAgent } from '@/lib/agents/formatter';
import { AssignmentSanitizerAgent } from '@/lib/agents/assignment-sanitizer';

export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const apiKey = process.env.GEMINI_API_KEY || process.env.XAI_API_KEY!;

export async function POST(request: NextRequest) {
    try {
        const { generation_id } = await request.json();

        if (!generation_id) {
            return NextResponse.json({ error: 'generation_id required' }, { status: 400 });
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch generation
        const { data: generation, error: fetchError } = await supabase
            .from('generations')
            .select('*')
            .eq('id', generation_id)
            .single();

        if (fetchError || !generation) {
            return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
        }

        // Initialize agents
        const xaiClient = new XAIClient(apiKey);
        const formatter = new FormatterAgent(xaiClient);
        const assignmentSanitizer = new AssignmentSanitizerAgent(xaiClient);

        console.log('[API/Format] Starting manual formatting for:', generation_id);

        // 1. Format
        let formattedContent = await formatter.formatAssignment(generation.final_content || '');

        // 2. Validate/Sanitize
        try {
            const parsed = JSON.parse(formattedContent);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Get counts if available, otherwise default
                const assignmentCounts = generation.assignment_data?.counts || { mcsc: 5, mcmc: 3, subjective: 2 };

                const sanitizationResult = await assignmentSanitizer.sanitize(
                    parsed,
                    generation.topic,
                    generation.subtopics,
                    assignmentCounts
                );
                formattedContent = JSON.stringify(sanitizationResult.questions);
                console.log('[API/Format] Sanitized questions:', sanitizationResult.questions.length);
            }
        } catch (e) {
            console.warn('[API/Format] Sanitization skipped due to parse error:', e);
        }

        // 3. Update Database
        const { error: updateError } = await supabase
            .from('generations')
            .update({
                assignment_data: formattedContent,
                updated_at: new Date().toISOString()
            })
            .eq('id', generation_id);

        if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
        }

        return NextResponse.json({
            success: true,
            message: 'Formatting completed',
            formattedContent
        });

    } catch (error: any) {
        console.error('[API/Format] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Formatting failed' },
            { status: 500 }
        );
    }
}
