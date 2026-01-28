/**
 * Robust JSON extraction and parsing for LLM outputs.
 * Handles:
 * - Markdown code fences (```json ... ```) - even incomplete/truncated ones
 * - Raw JSON strings
 * - JSON with text before/after (LLM explanations)
 * - Trailing commas
 * - Truncated JSON (attempts to complete)
 * - Single quotes instead of double quotes
 * - Unquoted keys
 */
export async function parseLLMJson<T>(text: string, fallback?: T): Promise<T> {
    if (!text || typeof text !== 'string') {
        if (fallback !== undefined) return fallback;
        throw new Error("Empty or invalid content provided to JSON parser");
    }

    const originalText = text;
    let cleaned = text.trim();

    // STEP 1: Try direct parse first (ideal case)
    try {
        return JSON.parse(cleaned) as T;
    } catch {
        // Continue with cleanup
    }

    // STEP 2: Strip markdown code fences
    cleaned = stripMarkdownFences(cleaned);

    try {
        return JSON.parse(cleaned) as T;
    } catch {
        // Continue
    }

    // STEP 3: Try to find and extract JSON boundaries
    const extracted = extractJsonFromText(cleaned);
    if (extracted) {
        try {
            return JSON.parse(extracted) as T;
        } catch {
            cleaned = extracted;
        }
    }

    // STEP 4: Try common repairs
    const repaired = repairCommonIssues(cleaned);
    try {
        return JSON.parse(repaired) as T;
    } catch {
        // Continue
    }

    // STEP 5: Try to complete truncated JSON
    const completed = tryCompleteTruncatedJson<T>(repaired);
    if (completed !== null) {
        console.log('[JSON Parser] Recovered truncated JSON');
        return completed;
    }

    // STEP 6: Try extracting from original text (maybe over-cleaned)
    const fromOriginal = extractJsonFromText(originalText);
    if (fromOriginal && fromOriginal !== cleaned) {
        const repairedOriginal = repairCommonIssues(fromOriginal);
        try {
            return JSON.parse(repairedOriginal) as T;
        } catch {
            const completedOriginal = tryCompleteTruncatedJson<T>(repairedOriginal);
            if (completedOriginal !== null) {
                return completedOriginal;
            }
        }
    }

    // STEP 7: Fallback or error
    const preview = originalText.length > 300 
        ? originalText.slice(0, 150) + '\n...[truncated]...\n' + originalText.slice(-100) 
        : originalText;
    
    if (fallback !== undefined) {
        console.warn('[JSON Parser] Parse failed, using fallback. Preview:', preview.slice(0, 200));
        return fallback;
    }
    
    console.error("[JSON Parser] Parse failed. Input preview:", preview);
    throw new Error(`Failed to parse JSON from LLM response`);
}

/**
 * Strip markdown code fences from text
 * IMPORTANT: Uses greedy matching to handle nested code blocks in content
 */
function stripMarkdownFences(text: string): string {
    let result = text.trim();

    // Pattern 1: Complete code block ```json\n...\n``` (GREEDY - to handle nested ```)
    // The closing ``` must be at the END of the string (with optional whitespace)
    // Use greedy (.*) so we match the LAST ``` not the first
    const completeMatch = result.match(/^```(?:json|JSON|javascript|js)?\s*\n([\s\S]*)```\s*$/);
    if (completeMatch) {
        // Verify the match - the content should end with \n``` or just ```
        // Remove any trailing ``` that might be part of nested content
        let content = completeMatch[1];
        // Trim trailing newline before the closing fence
        if (content.endsWith('\n')) {
            content = content.slice(0, -1);
        }
        return content.trim();
    }

    // Pattern 2: Opening fence at start, closing fence at end (handle various formats)
    if (result.startsWith('```')) {
        const lastFenceIndex = result.lastIndexOf('```');
        if (lastFenceIndex > 3) { // There's a closing fence after the opening
            // Find where the opening fence line ends
            const firstNewline = result.indexOf('\n');
            if (firstNewline !== -1 && firstNewline < lastFenceIndex) {
                const content = result.slice(firstNewline + 1, lastFenceIndex);
                return content.trim();
            }
        }
    }

    // Pattern 3: Code block anywhere in text - find outermost fences
    const fenceStart = result.indexOf('```');
    if (fenceStart !== -1) {
        const afterStart = result.indexOf('\n', fenceStart);
        const lastFence = result.lastIndexOf('```');
        if (afterStart !== -1 && lastFence > afterStart) {
            const content = result.slice(afterStart + 1, lastFence);
            return content.trim();
        }
    }

    // Pattern 4: Opening fence without closing (truncated)
    if (result.startsWith('```')) {
        const newlinePos = result.indexOf('\n');
        if (newlinePos !== -1) {
            result = result.slice(newlinePos + 1);
        } else {
            const langMatch = result.match(/^```(?:json|JSON|javascript|js)?\s*/);
            if (langMatch) {
                result = result.slice(langMatch[0].length);
            }
        }
    }

    // Remove trailing ``` if present
    if (result.endsWith('```')) {
        result = result.slice(0, -3);
    }

    return result.trim();
}

/**
 * Extract JSON from text that may contain other content
 */
function extractJsonFromText(text: string): string | null {
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    
    let startIndex = -1;
    let isArray = false;
    
    if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
        startIndex = firstBrace;
        isArray = false;
    } else if (firstBracket >= 0) {
        startIndex = firstBracket;
        isArray = true;
    }

    if (startIndex < 0) return null;

    const candidate = text.slice(startIndex);
    const balanced = extractBalanced(candidate, isArray ? '[' : '{', isArray ? ']' : '}');
    if (balanced) return balanced;

    // Fallback: find last closing bracket
    const lastBrace = candidate.lastIndexOf('}');
    const lastBracket = candidate.lastIndexOf(']');
    const lastClose = Math.max(lastBrace, lastBracket);
    
    if (lastClose > 0) {
        return candidate.slice(0, lastClose + 1);
    }
    return candidate;
}

/**
 * Extract balanced JSON starting from beginning of string
 */
function extractBalanced(input: string, openChar: string, closeChar: string): string | null {
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        
        if (escapeNext) { escapeNext = false; continue; }
        if (char === '\\' && inString) { escapeNext = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        
        if (!inString) {
            if (char === '{' || char === '[') depth++;
            else if (char === '}' || char === ']') {
                depth--;
                if (depth === 0) return input.slice(0, i + 1);
            }
        }
    }
    return null;
}

/**
 * Repair common JSON formatting issues
 */
function repairCommonIssues(text: string): string {
    let repaired = text;
    
    // FIRST: Fix raw newlines inside JSON strings (most common LLM issue)
    repaired = repairRawNewlines(repaired);
    
    // Remove trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    // Single quotes to double (only if no double quotes)
    if (!repaired.includes('"') && repaired.includes("'")) {
        repaired = repaired.replace(/'/g, '"');
    }
    
    // Quote unquoted keys
    repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
    
    // Remove BOM
    repaired = repaired.replace(/^\uFEFF/, '');
    
    // Try to fix unescaped quotes within string values
    repaired = repairUnescapedQuotes(repaired);
    
    return repaired;
}

/**
 * Fix raw newlines inside JSON string values.
 * LLMs often output multi-line strings with actual newlines instead of \n
 */
function repairRawNewlines(text: string): string {
    try {
        const result: string[] = [];
        let i = 0;
        let inString = false;
        let escapeNext = false;
        
        while (i < text.length) {
            const char = text[i];
            
            if (escapeNext) {
                result.push(char);
                escapeNext = false;
                i++;
                continue;
            }
            
            if (char === '\\') {
                result.push(char);
                escapeNext = true;
                i++;
                continue;
            }
            
            if (char === '"') {
                result.push(char);
                inString = !inString;
                i++;
                continue;
            }
            
            // If we're inside a string and hit a newline, escape it
            if (inString && (char === '\n' || char === '\r')) {
                if (char === '\r' && text[i + 1] === '\n') {
                    // CRLF -> \n
                    result.push('\\n');
                    i += 2;
                } else {
                    // LF or CR -> \n
                    result.push('\\n');
                    i++;
                }
                continue;
            }
            
            // If we're inside a string and hit a tab, escape it
            if (inString && char === '\t') {
                result.push('\\t');
                i++;
                continue;
            }
            
            result.push(char);
            i++;
        }
        
        return result.join('');
    } catch {
        return text;
    }
}

/**
 * Attempt to fix unescaped double quotes within JSON string values.
 * This handles cases where LLM outputs: "fix": "change \"X\" to \"Y\""
 * which should be: "fix": "change \\"X\\" to \\"Y\\""
 */
function repairUnescapedQuotes(text: string): string {
    // Strategy: Find patterns like "key": "value with "quoted" text"
    // and convert inner quotes to escaped quotes or single quotes
    
    try {
        // Pattern to match a JSON string value that might have unescaped quotes
        // Look for: "key": "..." patterns where the value contains unescaped quotes
        const result: string[] = [];
        let i = 0;
        
        while (i < text.length) {
            // Look for start of a string value (after : or [ or ,)
            if (text[i] === '"') {
                const keyOrValueStart = i;
                i++;
                
                // Read until we find the closing quote (handling escapes)
                let content = '';
                while (i < text.length) {
                    if (text[i] === '\\' && i + 1 < text.length) {
                        content += text[i] + text[i + 1];
                        i += 2;
                        continue;
                    }
                    if (text[i] === '"') {
                        break;
                    }
                    content += text[i];
                    i++;
                }
                
                // Check what comes after this string
                const afterQuote = text.slice(i + 1).trimStart();
                
                // If this looks like a truncated string (quote followed by more content that isn't JSON syntax)
                if (afterQuote.length > 0 && 
                    afterQuote[0] !== ':' && 
                    afterQuote[0] !== ',' && 
                    afterQuote[0] !== '}' && 
                    afterQuote[0] !== ']' &&
                    afterQuote[0] !== '"') {
                    // This might be an unescaped quote in the middle of a value
                    // Try to find the real end of the string
                    const realEnd = findRealStringEnd(text, keyOrValueStart + 1);
                    if (realEnd > i) {
                        // Extract the full content and escape inner quotes
                        const fullContent = text.slice(keyOrValueStart + 1, realEnd);
                        const escaped = escapeInnerQuotes(fullContent);
                        result.push('"' + escaped + '"');
                        i = realEnd + 1;
                        continue;
                    }
                }
                
                result.push('"' + content + '"');
                i++;
            } else {
                result.push(text[i]);
                i++;
            }
        }
        
        return result.join('');
    } catch {
        // If repair fails, return original
        return text;
    }
}

/**
 * Find the real end of a JSON string by looking for a quote followed by JSON syntax
 */
function findRealStringEnd(text: string, start: number): number {
    let i = start;
    let lastValidEnd = -1;
    
    while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
            i += 2;
            continue;
        }
        if (text[i] === '"') {
            // Check if this quote is followed by valid JSON syntax
            const after = text.slice(i + 1).trimStart();
            if (after.length === 0 || 
                after[0] === ':' || 
                after[0] === ',' || 
                after[0] === '}' || 
                after[0] === ']') {
                lastValidEnd = i;
                // Keep looking in case there's a better match
            }
        }
        i++;
    }
    
    return lastValidEnd;
}

/**
 * Escape double quotes that appear within a string (not at boundaries)
 */
function escapeInnerQuotes(content: string): string {
    // Replace unescaped double quotes with single quotes (safer than escaping)
    // This handles: change "X" to "Y" -> change 'X' to 'Y'
    let result = '';
    let i = 0;
    
    while (i < content.length) {
        if (content[i] === '\\' && i + 1 < content.length) {
            // Already escaped, keep as-is
            result += content[i] + content[i + 1];
            i += 2;
        } else if (content[i] === '"') {
            // Unescaped quote - replace with single quote
            result += "'";
            i++;
        } else {
            result += content[i];
            i++;
        }
    }
    
    return result;
}

/**
 * Attempts to complete truncated JSON by closing open brackets/braces
 * and truncating incomplete strings
 */
function tryCompleteTruncatedJson<T>(text: string): T | null {
    // Find the start of JSON
    const jsonStart = text.search(/[\[{]/);
    if (jsonStart === -1) return null;
    
    let json = text.slice(jsonStart);
    
    // Track open brackets/braces
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;
    let lastValidIndex = 0;
    
    for (let i = 0; i < json.length; i++) {
        const char = json[i];
        
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        
        if (char === '\\' && inString) {
            escapeNext = true;
            continue;
        }
        
        if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
        }
        
        if (!inString) {
            if (char === '{') openBraces++;
            else if (char === '}') openBraces--;
            else if (char === '[') openBrackets++;
            else if (char === ']') openBrackets--;
            
            // Track last position where we could potentially close
            if (char === ',' || char === ':' || char === '{' || char === '[' || char === '}' || char === ']') {
                lastValidIndex = i;
            }
        }
    }
    
    // If we ended inside a string, try to close it
    if (inString) {
        // Find the last complete key-value pair
        const lastComma = json.lastIndexOf(',');
        const lastColon = json.lastIndexOf(':');
        
        if (lastComma > lastColon && lastComma > 0) {
            // Truncate at the last comma (remove incomplete value)
            json = json.slice(0, lastComma);
        } else if (lastColon > 0) {
            // We're in the middle of a value, try to close the string
            json = json + '"';
            inString = false;
        }
    }
    
    // Remove trailing commas
    json = json.replace(/,\s*$/, '');
    
    // Close any open braces/brackets
    // Recount after modifications
    openBraces = 0;
    openBrackets = 0;
    inString = false;
    escapeNext = false;
    
    for (let i = 0; i < json.length; i++) {
        const char = json[i];
        if (escapeNext) { escapeNext = false; continue; }
        if (char === '\\' && inString) { escapeNext = true; continue; }
        if (char === '"' && !escapeNext) { inString = !inString; continue; }
        if (!inString) {
            if (char === '{') openBraces++;
            else if (char === '}') openBraces--;
            else if (char === '[') openBrackets++;
            else if (char === ']') openBrackets--;
        }
    }
    
    // Add closing brackets/braces
    json = json + ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
    
    try {
        const result = JSON.parse(json) as T;
        console.warn('[JSON Parser] Successfully recovered truncated JSON');
        return result;
    } catch (e) {
        return null;
    }
}
