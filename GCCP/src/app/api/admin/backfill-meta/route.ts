
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"; // Untyped to bypass missing table types if needed
import { MetaQualityAgent } from "@/lib/agents/meta-quality";
import { MetaFeedbackService } from "@/lib/services/meta-feedback";
import { AnthropicClient } from "@/lib/anthropic/client";

export const maxDuration = 300; // 5 minutes timeout

export async function POST(req: Request) {
    try {
        // 1. Auth Check (Basic for now, or check admin header)
        // For admin tool, we'll assume it's protected by middleware or we check key
        const authHeader = req.headers.get("x-admin-secret");
        const adminSecret = process.env.ADMIN_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

        // Allow if service role key is matched (simple protection) or just for dev
        // For now, we'll proceed assuming local/admin usage. 

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY!;

        if (!anthropicKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        const feedbackService = new MetaFeedbackService(supabase);
        // Use the correctly mapped client
        const client = new AnthropicClient(anthropicKey);
        const agent = new MetaQualityAgent(client);

        // 2. Fetch candidates
        const { data: candidates, error: fetchError } = await supabase
            .from("generations")
            .select("*")
            .eq("status", "completed")
            .is("meta_analysis_completed", false) // or null
            .order("created_at", { ascending: false })
            .limit(5); // Process in batches to avoid timeout

        if (fetchError) throw fetchError;

        if (!candidates || candidates.length === 0) {
            return NextResponse.json({ message: "No pending generations found" });
        }

        const results = [];

        // 3. Process each
        for (const gen of candidates) {
            // Double check completion flag (explicit false or null)
            if (gen.meta_analysis_completed === true) continue;

            try {
                console.log(`[Backfill] Analyzing generation ${gen.id}...`);
                const analysis = await agent.analyze(gen.final_content, gen.mode);
                await feedbackService.aggregateFeedback(gen.mode, analysis);
                await feedbackService.markGenerationAnalyzed(gen.id);
                results.push({ id: gen.id, status: "success" });
            } catch (err: any) {
                console.error(`[Backfill] Failed for ${gen.id}:`, err);
                results.push({ id: gen.id, status: "failed", error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            details: results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
