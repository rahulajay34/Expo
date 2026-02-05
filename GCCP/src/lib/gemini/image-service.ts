import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS } from './client';
import { uploadGeneratedImage } from '@/lib/storage/image-storage';

/**
 * Image Generation Service using Gemini's image generation capabilities
 * 
 * Uses gemini-2.0-flash-preview-image-generation for creating educational visuals
 */

export interface ImageGenerationOptions {
    prompt: string;
    style?: string; // Relaxed from strict union to allow dynamic/custom styles
    aspectRatio?: '1:1' | '16:9' | '4:3';
}

export interface GeneratedImage {
    url: string;
    mimeType: string;
    prompt: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

export class GeminiImageService {
    private genAI: GoogleGenerativeAI;
    private model: string = GEMINI_MODELS.image;

    constructor(apiKey?: string) {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
            throw new Error('GEMINI_API_KEY is required for image generation');
        }
        this.genAI = new GoogleGenerativeAI(key);
    }

    /**
     * Generate an image from a text prompt
     */
    async generateImage(options: ImageGenerationOptions): Promise<GeneratedImage | null> {
        try {
            const model = this.genAI.getGenerativeModel({ model: this.model });

            // Build enhanced prompt for educational context
            const enhancedPrompt = this.buildEducationalPrompt(options);

            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: enhancedPrompt }]
                }],
                generationConfig: {
                    // Image generation specific config
                }
            });

            const response = result.response;

            // Extract image data from response
            // Note: Actual implementation depends on Gemini's image generation API response format
            for (const candidate of response.candidates || []) {
                for (const part of candidate.content?.parts || []) {
                    if ('inlineData' in part && part.inlineData) {
                        const base64 = part.inlineData.data || '';
                        const mimeType = part.inlineData.mimeType || 'image/png';

                        if (!base64) {
                            console.warn('[ImageService] Empty base64 data in response');
                            continue;
                        }

                        // Upload to Supabase Storage and get public URL
                        try {
                            const { url } = await uploadGeneratedImage(base64, mimeType);

                            // Calculate tokens (estimate if not provided)
                            const inputTokens = result.response.usageMetadata?.promptTokenCount || enhancedPrompt.length / 4;
                            const outputTokens = result.response.usageMetadata?.candidatesTokenCount || base64.length / 4000; // Rough estimate for image data if not provided

                            return {
                                url,
                                mimeType,
                                prompt: options.prompt,
                                usage: {
                                    inputTokens: Math.ceil(inputTokens),
                                    outputTokens: Math.ceil(outputTokens)
                                }
                            };
                        } catch (uploadError) {
                            console.error('[ImageService] Failed to upload image:', uploadError);
                            return null;
                        }
                    }
                }
            }

            console.warn('[ImageService] No image data in response');
            return null;
        } catch (error) {
            console.error('[ImageService] Image generation failed:', error);
            return null;
        }
    }

    /**
     * Build an enhanced prompt for educational content
     */
    private buildEducationalPrompt(options: ImageGenerationOptions): string {
        // User-requested aesthetic: Soft 3D Clay, High-Key Lighting, Minimalist
        const baseStyle = `
Style:
Editorial spot illustration isolated on a pure flat white background (#FFFFFF). Stylized 'soft 3D clay' aesthetic with smooth, rounded organic geometry. High-key even studio lighting (no background gradients, no horizon line), minimal soft contact shadows only. High-quality 8k, Octane render, minimalist, seamless document integration.
`;

        const specificDirectives: Record<string, string> = {
            diagram: 'Create a clean conceptual diagram. Focus on clear relationships and smooth flow. Avoid clutter.',
            illustration: 'Create a standalone spot illustration representing the concept. Focus on a central metaphorical object.',
            flowchart: 'Create a stylized process flow. Use rounded nodes and soft connecting lines.',
            infographic: 'Create a minimalist data visualization or comparative layout. Use clear spatial organization.',
            // New dynamic types
            timeline: 'Create a linear visual timeline sequence with distinct milestones. Simple and chronological.',
            mindmap: 'Create a central concept with radiating branches. Organic, connected structure.',
            schematic: 'Create a stylized technical breakdown or blueprint-like view. Organized and structural.',
            metaphor: 'Create a clever visual metaphor or abstract representation of the concept. Dream-like and symbolic.',
            hierarchy: 'Create a tree-like structure showing levels and parent-child relationships.',
            collage: 'Create a cohesive composition of related elements arranged artistically.',
        };

        // If style is a known key, use it. If it's a custom string (e.g. from dynamic logic), use it directly as the directive.
        const typeDirective = specificDirectives[options.style || 'illustration'] || options.style || specificDirectives['illustration'];

        return `${baseStyle}

Task: ${typeDirective}

Subject: ${options.prompt}

Requirements:
- ABSOLUTELY PURE WHITE BACKGROUND (#FFFFFF). No off-white, no gray, no gradient.
- Soft, rounded forms (clay-like).
- Minimalist color palette: soft pastels or clean primaries, low saturation.
- High contrast for readability against white.
- Low TEXT: Use icons, shapes, and visual metaphors only. Minimize text labels.
- Aspect ratio: ${options.aspectRatio || '16:9'}`;
    }

    /**
     * Analyze content and identify sections that would benefit from visual aids
     */
    analyzeContentForVisuals(content: string): Array<{
        section: string;
        suggestedType: string; // Relaxed type
        prompt: string;
    }> {
        const suggestions: Array<{
            section: string;
            suggestedType: string;
            prompt: string;
        }> = [];

        // Helper to pick random variation
        const pickVariant = (variants: string[]) => variants[Math.floor(Math.random() * variants.length)];

        // Pattern 1: Process/workflow descriptions (Action-oriented)
        // Matches: "steps to", "workflow for", "process of", "how it works"
        const processPatterns = [
            /(?:steps|workflow|process|procedure|lifecycle|pipeline)[\s\S]{0,500}?(?:1\.|first|step 1|phase 1)/gi,
            /how (?:to|it works|this works|data flows)[\s\S]{0,500}/gi
        ];

        for (const pattern of processPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 2).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 500),
                        suggestedType: pickVariant(['flowchart', 'timeline', 'checklist-visual']),
                        prompt: `Create a visual for this process: ${match.slice(0, 500)}`
                    });
                });
            }
        }

        // Pattern 2: Comparisons (Dualities, Pros/Cons)
        const comparisonPatterns = [
            /(?:compare|comparison|versus|vs\.?|difference between|trade-off)[\s\S]{0,500}/gi,
            /(?:advantages|disadvantages|pros and cons|benefits and drawbacks)[\s\S]{0,500}/gi
        ];

        for (const pattern of comparisonPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 1).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 500),
                        suggestedType: pickVariant(['infographic', 'comparison-table-visual', 'split-screen-metaphor']),
                        prompt: `Create a comparison visual: ${match.slice(0, 500)}`
                    });
                });
            }
        }

        // Pattern 3: Architecture/System/Hierarchy (Structural)
        const structurePatterns = [
            /(?:architecture|system design|structure|components|modules|layers|hierarchy|tree)[\s\S]{0,500}/gi,
            /(?:composed of|consists of|contains|parent|child|relationship)[\s\S]{0,500}/gi
        ];

        for (const pattern of structurePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 2).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 500),
                        suggestedType: pickVariant(['diagram', 'schematic', 'hierarchy', 'mindmap']),
                        prompt: `Create a structural diagram for: ${match.slice(0, 500)}`
                    });
                });
            }
        }

        // Pattern 4: Timeline/History (Temporal)
        const timePatterns = [
            /(?:history of|evolution of|timeline|chronology|over time|since \d{4})[\s\S]{0,500}/gi,
            /(?:first|then|finally|subsequently|later)[\s\S]{0,500}/gi
        ];

        for (const pattern of timePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 1).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 500),
                        suggestedType: 'timeline',
                        prompt: `Create a timeline visualization for: ${match.slice(0, 500)}`
                    });
                });
            }
        }

        // Pattern 5: Abstract Concepts/Principals (Metaphorical)
        // Matches: "The concept of", "Imagine", "Analogy", "Key principle"
        const conceptPatterns = [
            /(?:concept of|principle of|theory of|imagine|analogy|metaphor)[\s\S]{0,500}/gi,
            /(?:key takeaway|core idea|fundamental|essential)[\s\S]{0,500}/gi
        ];

        for (const pattern of conceptPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 2).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 500),
                        suggestedType: pickVariant(['metaphor', 'illustration', 'collage', 'abstract-art']),
                        prompt: `Create a conceptual illustration for: ${match.slice(0, 500)}`
                    });
                });
            }
        }

        // Limit total suggestions to prevent excessive image generation (Max 3)
        // Shuffle first to ensure variety if many matches found, but here we just slice top 3 for simplicity as they are found in order of appearance
        return suggestions.slice(0, 3);
    }
}
