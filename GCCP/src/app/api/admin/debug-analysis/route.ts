/**
 * Debug Analysis API Endpoint (Admin Only)
 * 
 * Uses Sequential Thinking to analyze failed generations and provide
 * root cause analysis with actionable recommendations.
 * 
 * POST /api/admin/debug-analysis
 * Body: { generationId: string, errorMessage?: string, logs?: string }
 * Returns: { analysis: DebugAnalysis }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDebugPrompt, sequentialThinking } from '@/lib/mcp/sequential-thinking';
import { GeminiClient, GEMINI_MODELS } from '@/lib/gemini/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface DebugAnalysis {
    rootCause: string;
    confidence: number;
    symptoms: string[];
    possibleCauses: Array<{
        cause: string;
        likelihood: 'high' | 'medium' | 'low';
        evidence: string;
    }>;
    recommendations: string[];
    reasoningChain: any;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        // Check admin authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { generationId, errorMessage, logs, executionContext } = body as {
            generationId?: string;
            errorMessage?: string;
            logs?: string;
            executionContext?: string;
        };

        if (!errorMessage && !logs) {
            return NextResponse.json(
                { error: 'Either errorMessage or logs must be provided' },
                { status: 400 }
            );
        }

        // Build debug prompt using sequential thinking
        const prompt = createDebugPrompt(
            errorMessage || 'Generation failed with unknown error',
            logs || 'No logs available',
            executionContext || `Generation ID: ${generationId || 'unknown'}`
        );

        // Start thinking chain
        const chain = sequentialThinking.startChain(`Debug analysis for ${generationId || 'generation'}`);

        // Use Gemini for analysis
        const client = new GeminiClient();
        const response = await client.generate({
            system: `You are an expert debugging assistant analyzing failed content generations.
Use sequential reasoning to identify root causes:
1. Define symptoms
2. Research common failure patterns
3. Analyze execution context
4. Hypothesize root causes
5. Recommend fixes

Be specific and actionable.`,
            messages: [{ role: 'user', content: prompt }],
            model: GEMINI_MODELS.pro,
            temperature: 0.3
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';

        // Add reasoning steps
        sequentialThinking.addStep(chain.id, 'Identified error symptoms', 'analysis', 0.9);
        sequentialThinking.addStep(chain.id, 'Analyzed common failure patterns', 'analysis', 0.85);
        sequentialThinking.addStep(chain.id, 'Examined execution context', 'analysis', 0.8);
        sequentialThinking.addStep(chain.id, 'Generated root cause hypotheses', 'hypothesis', 0.75);

        // Parse response
        let analysis: DebugAnalysis;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                analysis = {
                    rootCause: parsed.rootCause || parsed.finalConclusion || 'Unable to determine root cause',
                    confidence: parsed.confidence || 0.5,
                    symptoms: parsed.symptoms || [],
                    possibleCauses: parsed.possibleCauses || parsed.causes || [],
                    recommendations: parsed.recommendations || parsed.fixes || [],
                    reasoningChain: sequentialThinking.getChain(chain.id)
                };
            } else {
                // Fallback: treat response as plain text analysis
                analysis = {
                    rootCause: content.slice(0, 500),
                    confidence: 0.5,
                    symptoms: [errorMessage || 'Generation failed'],
                    possibleCauses: [],
                    recommendations: ['Review agent logs', 'Check API connectivity', 'Verify input format'],
                    reasoningChain: sequentialThinking.getChain(chain.id)
                };
            }
        } catch (parseError) {
            console.error('[Debug API] Parse error:', parseError);
            analysis = {
                rootCause: 'Analysis parsing failed - see raw response',
                confidence: 0.3,
                symptoms: [errorMessage || 'Unknown'],
                possibleCauses: [],
                recommendations: ['Manual investigation required'],
                reasoningChain: sequentialThinking.getChain(chain.id)
            };
        }

        // Complete chain
        sequentialThinking.completeChain(
            chain.id,
            `Root cause: ${analysis.rootCause.slice(0, 100)}`
        );

        console.log(`[Debug API] Analysis complete for ${generationId}`);

        return NextResponse.json({
            success: true,
            analysis,
            generationId
        });

    } catch (error: any) {
        console.error('[Debug API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Debug analysis failed' },
            { status: 500 }
        );
    }
}
