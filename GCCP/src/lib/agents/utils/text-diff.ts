/**
 * Agent marker patterns that should never appear in final content
 * These are internal formatting tokens used by the Refiner agent
 */
const AGENT_MARKERS = [
    /<<<<<<< SEARCH\n?/g,
    /=======\n?/g,
    />>>>>>>\n?/g,
    /<<<<<<</g,
    />>>>>>>/g,
    /NO_CHANGES_NEEDED\n?/g,
];

/**
 * Remove any leaked agent markers from content
 * This is a safety net to ensure internal formatting never reaches the user
 */
export function stripAgentMarkers(content: string): string {
    let result = content;
    for (const pattern of AGENT_MARKERS) {
        result = result.replace(pattern, '');
    }
    // Clean up any resulting double newlines
    result = result.replace(/\n{3,}/g, '\n\n');
    return result;
}

/**
 * Check if searchText uniquely identifies a single location in content.
 * Returns the count of occurrences.
 */
function countOccurrences(content: string, searchText: string): number {
    let count = 0;
    let pos = 0;
    while ((pos = content.indexOf(searchText, pos)) !== -1) {
        count++;
        pos += 1; // Move past current match to find overlapping matches
    }
    return count;
}

/**
 * Apply search/replace patches from Refiner agent output to original content.
 * 
 * CRITICAL: This function performs STRICT REPLACE operations.
 * - Each search block is replaced ONCE with the replacement
 * - The search text must be unique enough to avoid multiple replacements
 * - If search text appears multiple times, only the FIRST occurrence is replaced
 * - The replacement REPLACES the original, it does NOT append to it
 */
export function applySearchReplace(original: string, patch: string): string {
    // Normalize line endings to avoid mismatches
    original = original.replace(/\r\n/g, '\n');
    patch = patch.replace(/\r\n/g, '\n');

    // Handle "NO_CHANGES_NEEDED" response from refiner
    if (patch.trim() === 'NO_CHANGES_NEEDED' || patch.includes('NO_CHANGES_NEEDED')) {
        return original;
    }

    let result = original;
    const regex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>/g;
    let match;
    let appliedCount = 0;
    let failedCount = 0;

    while ((match = regex.exec(patch)) !== null) {
        const [fullMatch, searchBlock, replaceBlock] = match;

        // Count occurrences to warn about ambiguous replacements
        const occurrences = countOccurrences(result, searchBlock);
        
        if (occurrences === 0) {
            // Try fuzzy matching: trim whitespace from search block
            const trimmedSearch = searchBlock.trim();
            if (result.includes(trimmedSearch)) {
                // Find the actual text with surrounding whitespace
                const searchIndex = result.indexOf(trimmedSearch);
                const beforeText = result.slice(0, searchIndex);
                const afterText = result.slice(searchIndex + trimmedSearch.length);
                
                // STRICT REPLACE: Replace the search text with replacement, don't append
                result = beforeText + replaceBlock.trim() + afterText;
                appliedCount++;
                console.log(`[Refiner] Applied fuzzy match for block: "${trimmedSearch.substring(0, 50)}..."`);
            } else {
                console.warn(`[Refiner] Could not find exact match for block: "${searchBlock.substring(0, 50)}..."`);
                failedCount++;
            }
        } else if (occurrences === 1) {
            // Exact single match - safe to replace
            // STRICT REPLACE: Use replace() which replaces the first occurrence only
            result = result.replace(searchBlock, replaceBlock);
            appliedCount++;
        } else {
            // Multiple occurrences - replace only the FIRST one to avoid unintended changes
            console.warn(`[Refiner] Search text appears ${occurrences} times. Replacing only first occurrence.`);
            const searchIndex = result.indexOf(searchBlock);
            const beforeText = result.slice(0, searchIndex);
            const afterText = result.slice(searchIndex + searchBlock.length);
            
            // STRICT REPLACE: beforeText + replacement + afterText (NOT beforeText + searchBlock + replacement + afterText)
            result = beforeText + replaceBlock + afterText;
            appliedCount++;
        }
    }

    if (appliedCount > 0 || failedCount > 0) {
        console.log(`[Refiner] Applied ${appliedCount} patches, ${failedCount} failed`);
    }

    // CRITICAL: Strip any remaining agent markers that might have leaked
    // This handles malformed blocks, partial matches, or extra output from the LLM
    result = stripAgentMarkers(result);

    // Sanity check: If result is significantly longer than original (>150%), 
    // something may have gone wrong (appending instead of replacing)
    if (result.length > original.length * 1.5 && appliedCount > 0) {
        console.warn(`[Refiner] Warning: Result is ${Math.round(result.length / original.length * 100)}% of original length. Possible append instead of replace.`);
    }

    return result;
}
