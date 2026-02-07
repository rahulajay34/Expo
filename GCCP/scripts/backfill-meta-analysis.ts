
import { createClient } from "@supabase/supabase-js";
import { MetaQualityAgent } from "@/lib/agents/meta-quality";
import { MetaFeedbackService } from "@/lib/services/meta-feedback";
import { AnthropicClient } from "@/lib/anthropic/client";
import fs from "fs";
import path from "path";

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, "utf8");
        envConfig.split("\n").forEach((line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ""); // Remove quotes
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log("Loaded .env.local");
    }
} catch (e) {
    console.warn("Failed to load .env.local", e);
}


async function runBackfill() {
    console.log("Starting Meta-Quality Backfill...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Prioritize GEMINI_API_KEY as we are using Gemini models
    const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("Missing Supabase credentials!");
        return;
    }

    if (!apiKey) {
        console.error("Missing GEMINI_API_KEY!");
        return;
    }

    console.log(`Using API Key starting with: ${apiKey.substring(0, 5)}...`);

    const supabase = createClient(supabaseUrl, serviceKey);
    const feedbackService = new MetaFeedbackService(supabase);
    const client = new AnthropicClient(apiKey);
    const agent = new MetaQualityAgent(client);

    const { data: candidates, error } = await supabase
        .from("generations")
        .select("*")
        .eq("status", "completed")
        .is("meta_analysis_completed", false)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Fetch error:", error);
        return;
    }

    if (!candidates || candidates.length === 0) {
        console.log("No pending generations found.");
        return;
    }

    console.log(`Found ${candidates.length} generations to analyze.`);

    for (const gen of candidates) {
        console.log(`Analyzing generation ${gen.id} (${gen.mode})...`);
        try {
            const analysis = await agent.analyze(gen.final_content, gen.mode);
            await feedbackService.aggregateFeedback(gen.mode, analysis);
            await feedbackService.markGenerationAnalyzed(gen.id);
            console.log(`✓ Processed ${gen.id}`);
        } catch (err: any) {
            console.error(`✗ Failed ${gen.id}:`, err.message);
        }
    }

    console.log("Backfill complete.");
}

runBackfill();
