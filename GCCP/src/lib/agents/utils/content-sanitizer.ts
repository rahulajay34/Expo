/**
 * Content Sanitizer - Removes AI-sounding patterns and agent markers from generated content
 * This runs as a post-processing step after all agents complete
 */

/**
 * Agent marker patterns that should never appear in final content
 * These are internal formatting tokens used by agents during generation
 */
const AGENT_MARKER_PATTERNS: RegExp[] = [
    /<<<<<<< SEARCH\n?/g,
    /=======\n?/g,
    />>>>>>>\n?/g,
    /<<<<<<</g,
    />>>>>>>/g,
    /NO_CHANGES_NEEDED\n?/g,
    // Also catch variations with spaces or different casing
    /<{3,}\s*SEARCH/gi,
    />{3,}/g,
];

// Patterns that indicate AI-generated meta-commentary
const FORBIDDEN_PATTERNS: RegExp[] = [
    // References to sources/transcripts
    /according to the (transcript|topic|lecture|material|subtopic|content)/gi,
    /based on (the |what )?(we|I|you) (discussed|covered|provided|mentioned)/gi,
    /as (we |I )?(mentioned|discussed|covered|noted|stated) (earlier|above|before|previously)/gi,
    /in (this|the) (lecture|session|module|pre-?read|transcript)/gi,
    /from the (transcript|lecture|material|content)/gi,

    // AI self-references
    /as an AI( language model| assistant)?/gi,
    /I('ve| have) (created|generated|written|prepared|compiled)/gi,
    /I (can|will|would) (help you|assist you|provide)/gi,
    /if you (want|need|would like) (me to|I can)/gi,
    /let me know if you('d| would) like/gi,
    /feel free to (ask|reach out|contact)/gi,

    // Meta-commentary about the content
    /this (section|module|lesson|content) (covers|explains|discusses)/gi,
    /in this (section|module|lesson), you('ll| will) learn/gi,
    /the following (section|content|material) (will|is going to)/gi,
    /now (let's|we will|we'll) (look at|explore|discuss|examine)/gi,

    // Hedging language
    /it('s| is) important to note that/gi,
    /it('s| is) worth (mentioning|noting) that/gi,
    /please note that/gi,
    /it should be noted that/gi,

    // Filler phrases
    /let's dive (in|into)/gi,
    /let's explore/gi,
    /let's take a (look|closer look)/gi,
    /without further ado/gi,
    /in conclusion,?/gi,
    /to summarize,?/gi,

    // Overused emphasis words (when at start of sentence)
    /^(it is )?(crucial|essential|fundamental|imperative|vital) (to|that)/gim,
];

// Phrases to replace with cleaner alternatives
const REPLACEMENTS: [RegExp, string][] = [
    [/\blet's\b/gi, "we'll"],
    [/\bI'd like to\b/gi, ''],
    [/\bwe've seen that\b/gi, ''],
    [/\bas we can see,?\b/gi, ''],
    [/\bfirstly,?\b/gi, 'First,'],
    [/\bsecondly,?\b/gi, 'Second,'],
    [/\bthirdly,?\b/gi, 'Third,'],
    [/\bin order to\b/gi, 'to'],
    [/\bdue to the fact that\b/gi, 'because'],
    [/\bat the end of the day\b/gi, 'ultimately'],
    [/\bin today's world\b/gi, 'today'],
    [/\bgoing forward\b/gi, ''],
];

/**
 * Remove any leaked agent markers from content
 * This is a safety net to ensure internal formatting never reaches the user
 * @param content The content to clean
 * @returns Content with agent markers removed
 */
export const stripAgentMarkers = (content: string): string => {
    let result = content;
    for (const pattern of AGENT_MARKER_PATTERNS) {
        result = result.replace(pattern, '');
    }
    // Clean up any resulting excessive newlines
    result = result.replace(/\n{3,}/g, '\n\n');
    return result;
};

/**
 * Remove AI-sounding patterns from content
 * @param content The raw content from agents
 * @returns Sanitized content without meta-commentary
 */
export const sanitizeAIPatterns = (content: string): string => {
    let result = content;

    // First, strip any agent markers that might have leaked
    result = stripAgentMarkers(result);

    // Remove forbidden patterns
    FORBIDDEN_PATTERNS.forEach(pattern => {
        result = result.replace(pattern, '');
    });

    // Apply replacements
    REPLACEMENTS.forEach(([pattern, replacement]) => {
        result = result.replace(pattern, replacement);
    });

    // Clean up artifacts from removals
    result = result
        // Multiple spaces to single space
        .replace(/  +/g, ' ')
        // Orphaned punctuation at start of sentences
        .replace(/\.\s*\./g, '.')
        .replace(/,\s*\./g, '.')
        .replace(/^\s*,\s*/gm, '')
        // Empty parentheses
        .replace(/\(\s*\)/g, '')
        // Multiple newlines to double newline
        .replace(/\n{3,}/g, '\n\n')
        // Sentences starting with lowercase after removal (fix capitalization)
        .replace(/\. ([a-z])/g, (_, char) => `. ${char.toUpperCase()}`)
        // Trim lines
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .trim();

    return result;
};

/**
 * Check if content contains AI patterns (for quality reporting)
 * @param content Content to check
 * @returns Array of detected patterns
 */
export const detectAIPatterns = (content: string): string[] => {
    const detected: string[] = [];

    FORBIDDEN_PATTERNS.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            detected.push(...matches);
        }
    });

    return [...new Set(detected)]; // Remove duplicates
};

/**
 * Get a quality score based on AI pattern detection
 * @param content Content to analyze
 * @returns Score 0-10 (10 being clean, 0 being heavily AI-patterned)
 */
export const getAIPatternScore = (content: string): number => {
    const patterns = detectAIPatterns(content);
    const wordCount = content.split(/\s+/).length;
    
    // Penalize based on pattern density
    const patternDensity = patterns.length / (wordCount / 100);
    
    if (patternDensity === 0) return 10;
    if (patternDensity < 0.5) return 9;
    if (patternDensity < 1) return 8;
    if (patternDensity < 2) return 7;
    if (patternDensity < 3) return 6;
    if (patternDensity < 5) return 5;
    return Math.max(0, 5 - Math.floor(patternDensity - 5));
};

/**
 * Fix formatting issues inside HTML tags:
 * 1. Remove escaped backslashes before dollar signs inside HTML tags (e.g., \$500 → $500)
 * 2. Convert markdown bold (**text**) inside HTML tags to <strong>text</strong>
 * 3. Convert markdown italic (*text* or _text_) inside HTML tags to <em>text</em>
 * 
 * This addresses the issue where markdown formatting characters appear literally
 * inside HTML elements instead of being rendered properly.
 * 
 * @param content The content with potential formatting issues
 * @returns Content with HTML-compatible formatting inside HTML tags
 */
export const fixFormattingInsideHtmlTags = (content: string): string => {
    // Match HTML tags with their content - handles nested tags
    // We process the content inside each HTML tag
    
    let result = content;
    
    // Process content inside HTML tags
    // Match opening tag, content, and closing tag
    const htmlTagPattern = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
    
    const processHtmlContent = (htmlContent: string): string => {
        let processed = htmlContent;
        
        // 1. Fix escaped dollar signs: \$ → $ (but preserve \\ as-is)
        // Only unescape \$ that's not part of \\$
        processed = processed.replace(/(?<!\\)\\(\$)/g, '$1');
        
        // 2. Convert markdown bold **text** to <strong>text</strong>
        // Avoid matching already processed or empty bold markers
        processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // 3. Convert markdown italic *text* to <em>text</em>
        // Be careful not to match bold markers or list items
        // Only match single asterisks that are not adjacent to other asterisks
        processed = processed.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
        
        return processed;
    };
    
    // Recursively process HTML content
    const processRecursively = (text: string): string => {
        let processed = text;
        let previousResult = '';
        
        // Keep processing until no more changes (handles nested tags)
        while (processed !== previousResult) {
            previousResult = processed;
            processed = processed.replace(htmlTagPattern, (match, tagName, attributes, innerContent) => {
                // Don't process script, style, or code tags
                if (['script', 'style', 'code', 'pre'].includes(tagName.toLowerCase())) {
                    return match;
                }
                
                // Process the inner content
                const fixedContent = processHtmlContent(innerContent);
                
                // Recursively process nested HTML
                const recursivelyFixed = processRecursively(fixedContent);
                
                return `<${tagName}${attributes}>${recursivelyFixed}</${tagName}>`;
            });
        }
        
        return processed;
    };
    
    result = processRecursively(result);
    
    return result;
};

/**
 * Full content sanitization pipeline
 * Applies all sanitization steps in the correct order
 * 
 * @param content Raw content from agents
 * @returns Fully sanitized content
 */
export const sanitizeContent = (content: string): string => {
    let result = content;
    
    // 1. Fix HTML formatting issues first (before other processing)
    result = fixFormattingInsideHtmlTags(result);
    
    // 2. Remove AI patterns
    result = sanitizeAIPatterns(result);
    
    return result;
};
