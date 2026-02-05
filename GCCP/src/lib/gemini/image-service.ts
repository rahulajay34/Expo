import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS } from './client';

/**
 * Image Generation Service using Gemini's image generation capabilities
 * 
 * Uses gemini-2.0-flash-preview-image-generation for creating educational visuals
 */

export interface ImageGenerationOptions {
    prompt: string;
    style?: 'diagram' | 'illustration' | 'flowchart' | 'infographic';
    aspectRatio?: '1:1' | '16:9' | '4:3';
}

export interface GeneratedImage {
    base64: string;
    mimeType: string;
    prompt: string;
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
                        return {
                            base64: part.inlineData.data || '',
                            mimeType: part.inlineData.mimeType || 'image/png',
                            prompt: options.prompt
                        };
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
        const styleGuide = {
            diagram: 'Clean, professional technical diagram with clear labels and minimal colors. Educational style.',
            illustration: 'Clear, simple illustration suitable for educational materials. Professional and approachable.',
            flowchart: 'Professional flowchart with clear boxes, arrows, and labels. Easy to follow steps.',
            infographic: 'Clean infographic with clear sections, icons, and readable text. Educational focus.'
        };

        const style = options.style || 'illustration';

        return `Create an educational visual: ${options.prompt}

Style requirements:
- ${styleGuide[style]}
- Use professional, muted colors (avoid overly bright or distracting colors)
- Ensure all text is readable and clearly labeled
- Keep the design clean and focused on the educational concept
- No decorative elements that don't serve the learning purpose
- Aspect ratio: ${options.aspectRatio || '16:9'}`;
    }

    /**
     * Analyze content and identify sections that would benefit from visual aids
     */
    analyzeContentForVisuals(content: string): Array<{
        section: string;
        suggestedType: 'diagram' | 'illustration' | 'flowchart' | 'infographic';
        prompt: string;
    }> {
        const suggestions: Array<{
            section: string;
            suggestedType: 'diagram' | 'illustration' | 'flowchart' | 'infographic';
            prompt: string;
        }> = [];

        // Pattern 1: Process/workflow descriptions
        const processPatterns = [
            /(?:steps|workflow|process|procedure|flow)[\s\S]{0,100}?(?:1\.|first|step 1)/gi,
            /how (?:to|it works|this works)[\s\S]{0,200}/gi
        ];

        for (const pattern of processPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches.slice(0, 2)) { // Limit to 2 per pattern
                    suggestions.push({
                        section: match.slice(0, 100),
                        suggestedType: 'flowchart',
                        prompt: `Create a flowchart showing: ${match.slice(0, 200)}`
                    });
                }
            }
        }

        // Pattern 2: Comparisons
        const comparisonPatterns = [
            /(?:compare|comparison|versus|vs\.?|difference between)[\s\S]{0,200}/gi,
            /(?:advantages|disadvantages|pros and cons)[\s\S]{0,200}/gi
        ];

        for (const pattern of comparisonPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches.slice(0, 1)) {
                    suggestions.push({
                        section: match.slice(0, 100),
                        suggestedType: 'infographic',
                        prompt: `Create a comparison visual: ${match.slice(0, 200)}`
                    });
                }
            }
        }

        // Pattern 3: Architecture/System descriptions
        const architecturePatterns = [
            /(?:architecture|system|structure|components|layers)[\s\S]{0,200}/gi
        ];

        for (const pattern of architecturePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches.slice(0, 1)) {
                    suggestions.push({
                        section: match.slice(0, 100),
                        suggestedType: 'diagram',
                        prompt: `Create an architecture diagram: ${match.slice(0, 200)}`
                    });
                }
            }
        }

        // Limit total suggestions to prevent excessive image generation
        return suggestions.slice(0, 3);
    }
}
