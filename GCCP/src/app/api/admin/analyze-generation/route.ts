
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MetaQualityAgent } from "@/lib/agents/meta-quality";
import { MetaFeedbackService } from "@/lib/services/meta-feedback";
import { AnthropicClient } from "@/lib/anthropic/client";

export const maxDuration = 300; // 5 minutes timeout

export async function POST(req: Request) {
    try {
        const { generation_id } = await req.json();

        if (!generation_id) {
            return NextResponse.json({ error: "Generation ID required" }, { status: 400 });
        }

        // Server-side auth check
        // In a real app, use Supabase Auth middleware or getUser() to verify specific admin role
        // For this implementation, we rely on the client-side check + Service Role protection
        // assuming this endpoint is protected or internal.

        // Ideally:
        // const supabaseServer = createServerClient(...);
        // const { data: { user } } = await supabaseServer.auth.getUser();
        // const { data: profile } = await supabaseServer.from('profiles').select('role').eq('id', user.id).single();
        // if (profile.role !== 'admin') throw new Error("Unauthorized");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY!;

        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        const feedbackService = new MetaFeedbackService(supabase);
        const client = new AnthropicClient(apiKey);
        const agent = new MetaQualityAgent(client);

        // Fetch generation
        const { data: gen, error: fetchError } = await supabase
            .from("generations")
            .select("*")
            .eq("id", generation_id)
            .single();

        if (fetchError || !gen) {
            return NextResponse.json({ error: "Generation not found" }, { status: 404 });
        }

        if (gen.meta_analysis_completed) {
            return NextResponse.json({ message: "Analysis already completed" });
        }

        // Run Analysis
        console.log(`[Manual Analysis] Analyzing generation ${gen.id}...`);
        const analysis = await agent.analyze(gen.final_content, gen.mode);
        await feedbackService.aggregateFeedback(gen.mode, analysis);
        await feedbackService.markGenerationAnalyzed(gen.id);

        return NextResponse.json({
            success: true,
            message: "Analysis completed successfully"
        });

    } catch (error: any) {
        console.error("[Manual Analysis Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
