export async function parseLLMJson<T>(text: string, fallback?: T): Promise<T> {
  if (!text || typeof text !== 'string') {
    if (fallback !== undefined) return fallback;
    throw new Error('Empty or invalid content provided to JSON parser');
  }

  let cleaned = text.trim();

  try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

  cleaned = stripMarkdownFences(cleaned);
  try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

  const extracted = extractJsonFromText(cleaned);
  if (extracted) {
    try { return JSON.parse(extracted) as T; } catch { cleaned = extracted; }
  }

  const repaired = repairCommonIssues(cleaned);
  try { return JSON.parse(repaired) as T; } catch { /* continue */ }

  const completed = tryCompleteTruncatedJson<T>(repaired);
  if (completed !== null) return completed;

  const fromOriginal = extractJsonFromText(text);
  if (fromOriginal && fromOriginal !== cleaned) {
    const repairedOrig = repairCommonIssues(fromOriginal);
    try { return JSON.parse(repairedOrig) as T; } catch {
      const completedOrig = tryCompleteTruncatedJson<T>(repairedOrig);
      if (completedOrig !== null) return completedOrig;
    }
  }

  if (fallback !== undefined) return fallback;
  throw new Error('Failed to parse JSON from LLM response');
}

function stripMarkdownFences(text: string): string {
  let result = text.trim();
  const completeMatch = result.match(/^```(?:json|JSON|javascript|js)?\s*\n([\s\S]*)```\s*$/);
  if (completeMatch) {
    let content = completeMatch[1];
    if (content.endsWith('\n')) content = content.slice(0, -1);
    return content.trim();
  }
  if (result.startsWith('```')) {
    const lastFenceIndex = result.lastIndexOf('```');
    if (lastFenceIndex > 3) {
      const firstNewline = result.indexOf('\n');
      if (firstNewline !== -1 && firstNewline < lastFenceIndex) {
        return result.slice(firstNewline + 1, lastFenceIndex).trim();
      }
    }
  }
  const fenceStart = result.indexOf('```');
  if (fenceStart !== -1) {
    const afterStart = result.indexOf('\n', fenceStart);
    const lastFence = result.lastIndexOf('```');
    if (afterStart !== -1 && lastFence > afterStart) {
      return result.slice(afterStart + 1, lastFence).trim();
    }
  }
  if (result.startsWith('```')) {
    const nl = result.indexOf('\n');
    if (nl !== -1) result = result.slice(nl + 1);
  }
  if (result.endsWith('```')) result = result.slice(0, -3);
  return result.trim();
}

function extractJsonFromText(text: string): string | null {
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIndex = -1;
  let isArray = false;

  if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
  } else if (firstBracket >= 0) {
    startIndex = firstBracket;
    isArray = true;
  }
  if (startIndex < 0) return null;

  const candidate = text.slice(startIndex);
  const balanced = extractBalanced(candidate, isArray ? '[' : '{', isArray ? ']' : '}');
  if (balanced) return balanced;

  const lastClose = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  if (lastClose > 0) return candidate.slice(0, lastClose + 1);
  return candidate;
}

function extractBalanced(input: string, openChar: string, closeChar: string): string | null {
  let depth = 0, inString = false, escapeNext = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\' && inString) { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === openChar || ch === '[' || ch === '{') depth++;
      else if (ch === closeChar || ch === ']' || ch === '}') {
        depth--;
        if (depth === 0) return input.slice(0, i + 1);
      }
    }
  }
  return null;
}

function repairCommonIssues(text: string): string {
  let repaired = repairRawNewlines(text);
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  if (!repaired.includes('"') && repaired.includes("'")) repaired = repaired.replace(/'/g, '"');
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
  repaired = repaired.replace(/^\uFEFF/, '');
  return repaired;
}

function repairRawNewlines(text: string): string {
  try {
    const result: string[] = [];
    let i = 0, inString = false, escapeNext = false;
    while (i < text.length) {
      const ch = text[i];
      if (escapeNext) { result.push(ch); escapeNext = false; i++; continue; }
      if (ch === '\\') { result.push(ch); escapeNext = true; i++; continue; }
      if (ch === '"') { result.push(ch); inString = !inString; i++; continue; }
      if (inString && (ch === '\n' || ch === '\r')) {
        if (ch === '\r' && text[i + 1] === '\n') { result.push('\\n'); i += 2; }
        else { result.push('\\n'); i++; }
        continue;
      }
      if (inString && ch === '\t') { result.push('\\t'); i++; continue; }
      result.push(ch);
      i++;
    }
    return result.join('');
  } catch { return text; }
}

function tryCompleteTruncatedJson<T>(text: string): T | null {
  const jsonStart = text.search(/[[\{]/);
  if (jsonStart === -1) return null;
  let json = text.slice(jsonStart);

  let inString = false, escapeNext = false;
  const lastComma = json.lastIndexOf(',');
  // Check if we're stuck mid-string
  let midString = false;
  for (let i = 0; i < json.length; i++) {
    if (escapeNext) { escapeNext = false; continue; }
    if (json[i] === '\\' && inString) { escapeNext = true; continue; }
    if (json[i] === '"') { inString = !inString; }
  }
  midString = inString;

  if (midString && lastComma > 0) {
    json = json.slice(0, lastComma);
  } else if (midString) {
    json += '"';
  }

  json = json.replace(/,\s*$/, '');

  let openBraces = 0, openBrackets = 0;
  inString = false; escapeNext = false;
  for (let i = 0; i < json.length; i++) {
    if (escapeNext) { escapeNext = false; continue; }
    if (json[i] === '\\' && inString) { escapeNext = true; continue; }
    if (json[i] === '"') { inString = !inString; continue; }
    if (!inString) {
      if (json[i] === '{') openBraces++;
      else if (json[i] === '}') openBraces--;
      else if (json[i] === '[') openBrackets++;
      else if (json[i] === ']') openBrackets--;
    }
  }

  json += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));

  try { return JSON.parse(json) as T; }
  catch { return null; }
}
