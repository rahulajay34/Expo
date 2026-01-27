export function applySearchReplace(original: string, patch: string): string {
    // Normalize line endings to avoid mismatches
    original = original.replace(/\r\n/g, '\n');
    patch = patch.replace(/\r\n/g, '\n');

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

    return result;
}
