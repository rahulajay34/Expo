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

    while ((match = regex.exec(patch)) !== null) {
        const [fullMatch, searchBlock, replaceBlock] = match;

        // Exact match check
        if (result.includes(searchBlock)) {
            result = result.replace(searchBlock, replaceBlock);
        } else {
            // Fallback: Try identifying loose matches (optional, for now we log warning)
            // For strict correctness, we skip if not found to avoid corruption
            console.warn(`[Refiner] Could not find exact match for block: "${searchBlock.substring(0, 50)}..."`);
        }
    }

    // CRITICAL: Strip any remaining agent markers that might have leaked
    // This handles malformed blocks, partial matches, or extra output from the LLM
    result = stripAgentMarkers(result);

    return result;
}
