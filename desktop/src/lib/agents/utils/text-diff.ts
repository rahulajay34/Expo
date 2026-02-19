import { stripAgentMarkers } from './content-sanitizer';

export function applySearchReplace(original: string, patch: string): string {
  let normalizedOrig = original.replace(/\r\n/g, '\n');
  const normalizedPatch = patch.replace(/\r\n/g, '\n');

  if (normalizedPatch.trim() === 'NO_CHANGES_NEEDED' || normalizedPatch.includes('NO_CHANGES_NEEDED')) {
    return normalizedOrig;
  }

  let result = normalizedOrig;
  const regex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>/g;
  let match;
  let appliedCount = 0;

  while ((match = regex.exec(normalizedPatch)) !== null) {
    const searchBlock = match[1];
    const replaceBlock = match[2];

    if (result.includes(searchBlock)) {
      result = result.replace(searchBlock, replaceBlock);
      appliedCount++;
    } else {
      const trimmedSearch = searchBlock.trim();
      if (result.includes(trimmedSearch)) {
        const idx = result.indexOf(trimmedSearch);
        result = result.slice(0, idx) + replaceBlock.trim() + result.slice(idx + trimmedSearch.length);
        appliedCount++;
      }
    }
  }

  result = stripAgentMarkers(result);

  if (result.length > normalizedOrig.length * 1.5 && appliedCount > 0) {
    console.warn('[Refiner] Result significantly longer than original');
  }

  return result;
}
