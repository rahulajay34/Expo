import { SupabaseClient } from "@supabase/supabase-js";
import { MetaAnalysis, QualityScores, QualityIssue, IssueCategory } from "@/lib/agents/meta-quality";

/**
 * Trend direction for score changes
 */
export type TrendDirection = "improving" | "declining" | "stable";

/**
 * Score trends for each dimension
 */
export interface ScoreTrends {
    formatting: TrendDirection;
    pedagogy: TrendDirection;
    clarity: TrendDirection;
    structure: TrendDirection;
    consistency: TrendDirection;
    factualAccuracy: TrendDirection;
}

/**
 * Clustered issue with frequency tracking
 */
export interface IssueCluster {
    agent: string;
    category: IssueCategory;
    frequency: number;
    severity: string;
    description: string;
    suggestedFix: string;
    examples: string[];
    lastSeen: string;
}

/**
 * Cumulative feedback content stored in database
 */
export interface FeedbackContent {
    scores: QualityScores;
    previousScores?: QualityScores;
    scoreTrends: ScoreTrends;
    issuesClusters: IssueCluster[];
    strengths: string[];
    overallAssessment: string;
}

/**
 * Complete feedback record from database
 */
export interface CumulativeFeedback {
    id: string;
    mode: string;
    feedbackContent: FeedbackContent;
    generationCount: number;
    lastUpdated: string;
    createdAt: string;
}

/**
 * MetaFeedbackService handles aggregation and storage of
 * meta-quality analysis results.
 * 
 * Key features:
 * - Rolling averages for scores
 * - Issue frequency tracking with clustering
 * - Trend calculation (improving/declining/stable)
 * - Archive and clear functionality for admin acknowledgment
 */
export class MetaFeedbackService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Aggregate new analysis into existing cumulative feedback
     * 
     * @param mode - Content mode (pre-read, lecture, assignment)
     * @param analysis - New MetaAnalysis result to aggregate
     */
    async aggregateFeedback(mode: string, analysis: MetaAnalysis): Promise<void> {
        // Fetch existing feedback for this mode
        const { data: existing, error: fetchError } = await this.supabase
            .from("meta_feedback")
            .select("*")
            .eq("mode", mode)
            .single();

        if (fetchError && fetchError.code !== "PGRST116") {
            console.error("[MetaFeedback] Error fetching existing feedback:", fetchError);
            throw fetchError;
        }

        let updatedContent: FeedbackContent;
        let newGenerationCount: number;

        if (existing) {
            // Aggregate with existing data
            const currentContent = existing.feedback_content as FeedbackContent;
            const currentCount = existing.generation_count || 0;
            newGenerationCount = currentCount + 1;

            // Calculate rolling averages for scores
            const newScores = this.calculateRollingAverages(
                currentContent.scores,
                analysis.scores,
                currentCount
            );

            // Calculate trends
            const scoreTrends = this.calculateTrends(
                currentContent.scores,
                newScores
            );

            // Merge issues with frequency tracking
            const issuesClusters = this.mergeIssues(
                currentContent.issuesClusters || [],
                analysis.issues
            );

            // Merge strengths (keep unique ones, limit to 10)
            const strengths = this.mergeStrengths(
                currentContent.strengths || [],
                analysis.strengths
            );

            updatedContent = {
                scores: newScores,
                previousScores: currentContent.scores,
                scoreTrends,
                issuesClusters,
                strengths,
                overallAssessment: analysis.overallAssessment,
            };
        } else {
            // First analysis for this mode
            newGenerationCount = 1;
            updatedContent = {
                scores: analysis.scores,
                scoreTrends: {
                    formatting: "stable",
                    pedagogy: "stable",
                    clarity: "stable",
                    structure: "stable",
                    consistency: "stable",
                    factualAccuracy: "stable",
                },
                issuesClusters: analysis.issues.map((issue) => ({
                    agent: issue.affectedAgent,
                    category: issue.category,
                    frequency: 1,
                    severity: issue.severity,
                    description: issue.description,
                    suggestedFix: issue.suggestedPromptChange,
                    examples: issue.examples,
                    lastSeen: new Date().toISOString(),
                })),
                strengths: analysis.strengths,
                overallAssessment: analysis.overallAssessment,
            };
        }

        // Upsert feedback record
        const { error: upsertError } = await this.supabase
            .from("meta_feedback")
            .upsert({
                mode,
                feedback_content: updatedContent,
                generation_count: newGenerationCount,
                last_updated: new Date().toISOString(),
            }, {
                onConflict: "mode",
            });

        if (upsertError) {
            console.error("[MetaFeedback] Error upserting feedback:", upsertError);
            throw upsertError;
        }
    }

    /**
     * Calculate rolling averages for scores
     */
    private calculateRollingAverages(
        currentScores: QualityScores,
        newScores: QualityScores,
        currentCount: number
    ): QualityScores {
        const weight = currentCount / (currentCount + 1);
        const newWeight = 1 / (currentCount + 1);

        return {
            formatting: Math.round(
                (currentScores.formatting * weight + newScores.formatting * newWeight) * 10
            ) / 10,
            pedagogy: Math.round(
                (currentScores.pedagogy * weight + newScores.pedagogy * newWeight) * 10
            ) / 10,
            clarity: Math.round(
                (currentScores.clarity * weight + newScores.clarity * newWeight) * 10
            ) / 10,
            structure: Math.round(
                (currentScores.structure * weight + newScores.structure * newWeight) * 10
            ) / 10,
            consistency: Math.round(
                (currentScores.consistency * weight + newScores.consistency * newWeight) * 10
            ) / 10,
            factualAccuracy: Math.round(
                (currentScores.factualAccuracy * weight + newScores.factualAccuracy * newWeight) * 10
            ) / 10,
        };
    }

    /**
     * Calculate trend direction based on score changes
     */
    private calculateTrends(
        previousScores: QualityScores,
        currentScores: QualityScores
    ): ScoreTrends {
        const calculateTrend = (prev: number, curr: number): TrendDirection => {
            const diff = curr - prev;
            if (diff > 0.3) return "improving";
            if (diff < -0.3) return "declining";
            return "stable";
        };

        return {
            formatting: calculateTrend(previousScores.formatting, currentScores.formatting),
            pedagogy: calculateTrend(previousScores.pedagogy, currentScores.pedagogy),
            clarity: calculateTrend(previousScores.clarity, currentScores.clarity),
            structure: calculateTrend(previousScores.structure, currentScores.structure),
            consistency: calculateTrend(previousScores.consistency, currentScores.consistency),
            factualAccuracy: calculateTrend(previousScores.factualAccuracy, currentScores.factualAccuracy),
        };
    }

    /**
     * Merge new issues with existing clusters
     * - Cluster by agent + category
     * - Track frequency
     * - Keep top 20 most frequent/severe
     */
    private mergeIssues(
        existingClusters: IssueCluster[],
        newIssues: QualityIssue[]
    ): IssueCluster[] {
        const clusterMap = new Map<string, IssueCluster>();

        // Add existing clusters to map
        for (const cluster of existingClusters) {
            const key = `${cluster.agent}:${cluster.category}`;
            clusterMap.set(key, cluster);
        }

        // Merge new issues
        for (const issue of newIssues) {
            const key = `${issue.affectedAgent}:${issue.category}`;
            const existing = clusterMap.get(key);

            if (existing) {
                // Update existing cluster
                clusterMap.set(key, {
                    ...existing,
                    frequency: existing.frequency + 1,
                    severity: this.higherSeverity(existing.severity, issue.severity),
                    description: issue.description, // Use latest description
                    suggestedFix: issue.suggestedPromptChange,
                    examples: [...new Set([...existing.examples, ...issue.examples])].slice(0, 5),
                    lastSeen: new Date().toISOString(),
                });
            } else {
                // Create new cluster
                clusterMap.set(key, {
                    agent: issue.affectedAgent,
                    category: issue.category,
                    frequency: 1,
                    severity: issue.severity,
                    description: issue.description,
                    suggestedFix: issue.suggestedPromptChange,
                    examples: issue.examples,
                    lastSeen: new Date().toISOString(),
                });
            }
        }

        // Sort by frequency and severity, keep top 20
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const sorted = Array.from(clusterMap.values()).sort((a, b) => {
            // First by frequency
            if (b.frequency !== a.frequency) return b.frequency - a.frequency;
            // Then by severity
            return (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
                (severityOrder[a.severity as keyof typeof severityOrder] || 0);
        });

        return sorted.slice(0, 20);
    }

    /**
     * Return the higher severity between two
     */
    private higherSeverity(a: string, b: string): string {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        const aVal = order[a as keyof typeof order] || 0;
        const bVal = order[b as keyof typeof order] || 0;
        return aVal >= bVal ? a : b;
    }

    /**
     * Merge strengths, keeping unique ones
     */
    private mergeStrengths(existing: string[], newStrengths: string[]): string[] {
        const all = [...existing, ...newStrengths];
        const unique = [...new Set(all.map((s) => s.toLowerCase().trim()))]
            .map((s) => all.find((orig) => orig.toLowerCase().trim() === s) || s);
        return unique.slice(0, 10);
    }

    /**
     * Archive current feedback to history and clear for fresh accumulation
     * 
     * @param mode - Content mode to clear
     * @param userId - User performing the acknowledgment
     */
    async clearFeedback(mode: string, userId: string): Promise<void> {
        // Fetch current feedback
        const { data: current, error: fetchError } = await this.supabase
            .from("meta_feedback")
            .select("*")
            .eq("mode", mode)
            .single();

        if (fetchError) {
            if (fetchError.code === "PGRST116") {
                // No feedback to clear
                return;
            }
            throw fetchError;
        }

        // Archive to history
        const { error: archiveError } = await this.supabase
            .from("meta_feedback_history")
            .insert({
                mode,
                feedback_content: current.feedback_content,
                acknowledged_by: userId,
            });

        if (archiveError) {
            console.error("[MetaFeedback] Error archiving feedback:", archiveError);
            throw archiveError;
        }

        // Reset the feedback
        const { error: resetError } = await this.supabase
            .from("meta_feedback")
            .update({
                feedback_content: {
                    scores: {
                        formatting: 0,
                        pedagogy: 0,
                        clarity: 0,
                        structure: 0,
                        consistency: 0,
                        factualAccuracy: 0,
                    },
                    scoreTrends: {},
                    issuesClusters: [],
                    strengths: [],
                    overallAssessment: "",
                },
                generation_count: 0,
                last_updated: new Date().toISOString(),
            })
            .eq("mode", mode);

        if (resetError) {
            console.error("[MetaFeedback] Error resetting feedback:", resetError);
            throw resetError;
        }
    }

    /**
     * Get all feedback for admin dashboard
     */
    async getAllFeedback(): Promise<CumulativeFeedback[]> {
        const { data, error } = await this.supabase
            .from("meta_feedback")
            .select("*")
            .order("mode");

        if (error) {
            console.error("[MetaFeedback] Error fetching all feedback:", error);
            throw error;
        }

        return (data || []).map((row) => ({
            id: row.id,
            mode: row.mode,
            feedbackContent: row.feedback_content as FeedbackContent,
            generationCount: row.generation_count,
            lastUpdated: row.last_updated,
            createdAt: row.created_at,
        }));
    }

    /**
     * Get total issues count across all modes
     * Used for sidebar badge
     */
    async getTotalIssuesCount(): Promise<number> {
        const feedback = await this.getAllFeedback();
        return feedback.reduce((total, f) => {
            return total + (f.feedbackContent.issuesClusters?.length || 0);
        }, 0);
    }

    /**
     * Update generation record with meta-analysis status
     */
    async markGenerationAnalyzed(generationId: string): Promise<void> {
        const { error } = await this.supabase
            .from("generations")
            .update({
                meta_analysis_completed: true,
                meta_analysis_timestamp: new Date().toISOString(),
            })
            .eq("id", generationId);

        if (error) {
            console.error("[MetaFeedback] Error marking generation analyzed:", error);
            // Don't throw - this is non-critical
        }
    }
}
