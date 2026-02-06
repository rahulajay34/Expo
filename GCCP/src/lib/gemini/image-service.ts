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
        // User-requested aesthetic: Soft 3D Clay, High-Key Lighting, Minimalist, but now MORE DETAILED
        const baseStyle = `
Style:
Editorial spot illustration isolated on a pure flat white background (#FFFFFF). Stylized 'soft 3D clay' aesthetic with smooth, rounded organic geometry. High-key even studio lighting (no background gradients, no horizon line), minimal soft contact shadows only. High-quality 8k, Octane render, seamless document integration.

CRITICAL REQUIREMENT: DETAILED AND ADDITIVE.
The image must add significant value to the text. Do not produce generic icons. Create a complex, multi-part composition that visually explains the concept in depth.

TEXT HANDLING (CRITICAL - READ CAREFULLY):
TEXT IS FORBIDDEN in this image unless absolutely necessary for comprehension.
- If the concept CAN be conveyed visually, DO NOT use text labels
- Use visual metaphors, icons, colors, and spatial relationships instead of words
- For data/quantities: use abstract shapes, bar heights, or proportional elements—NOT numbers
- For labels: use distinct colors, numbered callouts, or a visual key that can be referenced in a caption

If text is ABSOLUTELY NECESSARY (rare cases only):
- Maximum 3 words per text element
- Large, bold, sans-serif font only (minimum 48pt equivalent)
- HIGH CONTRAST: dark text on light background or vice versa
- No decorative, script, or thin fonts
- Center text in clear, uncluttered areas with ample padding
- No curved, rotated, or perspective-distorted text

STRONGLY PREFER purely visual representations. Garbled or illegible text is worse than no text.
`;

        const specificDirectives: Record<string, string> = {
            diagram: 'Create a HIGHLY DETAILED conceptual diagram. Show intricate relationships, data flows, and sub-components. Use colors and shapes for labeling—NO TEXT LABELS. Distinct visual symbols can be referenced in captions.',
            illustration: 'Create a complex standalone spot illustration. Feature a central subject with surrounding context elements. NO TEXT—let the visuals tell the story.',
            flowchart: 'Create a comprehensive stylized process flow. Use varied node shapes to distinguish step types. Use colors and numbered shapes instead of text labels. Clear directional flow arrows.',
            infographic: 'Create a dense but organized infographic. Use bar heights, pie segments, and proportional shapes to show data—NO NUMBERS OR TEXT. Colors should distinguish categories.',
            timeline: 'Create a detailed linear visual timeline. Mark milestones with distinct icons or mini-scenes—NO DATE LABELS. Use visual progression (size, complexity) to show chronology.',
            mindmap: 'Create an expansive central concept with radiating branches. Each branch ends in a specific visual symbol—NO TEXT. Color-code branches for categories.',
            schematic: 'Create a complex technical breakdown. Show internal components with exploded view. Use color-coding and numbered callouts instead of text labels.',
            metaphor: 'Create a sophisticated visual metaphor. Combine two concepts into a surreal but clear image. The metaphor must be immediately visually apparent—no text explanation.',
            hierarchy: 'Create a multi-level tree structure. Use size, position, and color to show hierarchy—NO TEXT LABELS. Visual weight indicates importance.',
            collage: 'Create a rich, layered composition. Combine elements into a unified visual narrative. Every element should be visually recognizable—no text annotations needed.',
        };

        // If style is a known key, use it. If it's a custom string (e.g. from dynamic logic), use it directly as the directive.
        const typeDirective = specificDirectives[options.style || 'illustration'] || options.style || specificDirectives['illustration'];

        return `${baseStyle}

Task: ${typeDirective}

Subject: ${options.prompt}

Requirements:
- ABSOLUTELY PURE WHITE BACKGROUND (#FFFFFF). No off-white, no gray, no gradient.
- Soft, rounded forms (clay-like) but with HIGH DETAIL in geometry.
- Minimalist color palette: soft pastels or clean primaries, low saturation, but utilize accent colors for emphasis.
- High contrast for readability against white.
- Visually dense: The image should feel "full" and "rich", not empty.
- ZOOM IN / TIGHT FRAMING: The subject must occupy at least 85% of the canvas. MINIMIZE WHITESPACE.
- Aspect ratio: ${options.aspectRatio || '16:9'}`;
    }

    /**
     * Analyze content and identify sections that would benefit from visual aids
     */
    analyzeContentForVisuals(content: string): Array<{
        section: string;
        suggestedType: string;
        prompt: string;
        aspectRatio: '1:1' | '16:9' | '4:3';
    }> {
        const suggestions: Array<{
            section: string;
            suggestedType: string;
            prompt: string;
            aspectRatio: '1:1' | '16:9' | '4:3';
        }> = [];

        // Helper to pick random variation
        const pickVariant = (variants: string[]) => variants[Math.floor(Math.random() * variants.length)];

        // Pattern 1: Process/workflow descriptions (Action-oriented)
        // Matches: "steps to", "workflow for", "process of", "how it works"
        const processPatterns = [
            /(?:steps|workflow|process|procedure|lifecycle|pipeline)[\s\S]{0,5000}?(?:1\.|first|step 1|phase 1)/gi,
            /how (?:to|it works|this works|data flows)[\s\S]{0,5000}/gi
        ];

        for (const pattern of processPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 2).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 5000),
                        suggestedType: pickVariant(['flowchart', 'timeline', 'checklist-visual']),
                        prompt: `Create a detailed visual process breakdown for: ${match.slice(0, 5000)}`,
                        aspectRatio: '16:9' // Processes need width
                    });
                });
            }
        }

        // Pattern 2: Comparisons (Dualities, Pros/Cons)
        const comparisonPatterns = [
            /(?:compare|comparison|versus|vs\.?|difference between|trade-off)[\s\S]{0,5000}/gi,
            /(?:advantages|disadvantages|pros and cons|benefits and drawbacks)[\s\S]{0,5000}/gi
        ];

        for (const pattern of comparisonPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 1).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 5000),
                        suggestedType: pickVariant(['infographic', 'comparison-table-visual', 'split-screen-metaphor']),
                        prompt: `Create a detailed comparison visualization for: ${match.slice(0, 5000)}`,
                        aspectRatio: '16:9' // Comparisons need width
                    });
                });
            }
        }

        // Pattern 3: Architecture/System/Hierarchy (Structural)
        const structurePatterns = [
            /(?:architecture|system design|structure|components|modules|layers|hierarchy|tree)[\s\S]{0,5000}/gi,
            /(?:composed of|consists of|contains|parent|child|relationship)[\s\S]{0,5000}/gi
        ];

        for (const pattern of structurePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 2).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 5000),
                        suggestedType: pickVariant(['diagram', 'schematic', 'hierarchy', 'mindmap']),
                        prompt: `Create a complex structural system diagram for: ${match.slice(0, 5000)}`,
                        aspectRatio: '4:3' // Structures fit better in 4:3
                    });
                });
            }
        }

        // Pattern 4: Timeline/History (Temporal)
        const timePatterns = [
            /(?:history of|evolution of|timeline|chronology|over time|since \d{4})[\s\S]{0,5000}/gi,
            /(?:first|then|finally|subsequently|later)[\s\S]{0,5000}/gi
        ];

        for (const pattern of timePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 1).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 5000),
                        suggestedType: 'timeline',
                        prompt: `Create a detailed historical timeline for: ${match.slice(0, 5000)}`,
                        aspectRatio: '16:9' // Timelines are horizontal
                    });
                });
            }
        }

        // Pattern 5: Abstract Concepts/Principals (Metaphorical)
        // Matches: "The concept of", "Imagine", "Analogy", "Key principle"
        const conceptPatterns = [
            /(?:concept of|principle of|theory of|imagine|analogy|metaphor)[\s\S]{0,5000}/gi,
            /(?:key takeaway|core idea|fundamental|essential)[\s\S]{0,5000}/gi
        ];

        for (const pattern of conceptPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.slice(0, 2).forEach(match => {
                    suggestions.push({
                        section: match.slice(0, 5000),
                        suggestedType: pickVariant(['metaphor', 'illustration', 'collage', 'abstract-art']),
                        prompt: `Create a rich conceptual illustration for: ${match.slice(0, 5000)}`,
                        aspectRatio: '4:3' // Concepts/Illustrations better in 4:3
                    });
                });
            }
        }

        // Limit total suggestions to MAX 2 to prevent excessive usage and focus on high-impact visuals
        return suggestions.slice(0, 2);
    }
}
