import { CSVRow } from '../types';

const CSV_HEADERS: (keyof CSVRow)[] = [
  'questionType', 'contentType', 'contentBody', 'intAnswer', 'prepTime(in_seconds)',
  'floatAnswer.max', 'floatAnswer.min', 'fitbAnswer', 'mcscAnswer', 'subjectiveAnswer',
  'option.1', 'option.2', 'option.3', 'option.4', 'mcmcAnswer', 'tagRelationships',
  'difficultyLevel', 'answerExplanationType', 'answerExplanation',
];

const EMPTY_ROW: CSVRow = {
  questionType: '', contentType: 'text', contentBody: '', intAnswer: '',
  'prepTime(in_seconds)': '', 'floatAnswer.max': '', 'floatAnswer.min': '', fitbAnswer: '',
  mcscAnswer: '', subjectiveAnswer: '', 'option.1': '', 'option.2': '', 'option.3': '', 'option.4': '',
  mcmcAnswer: '', tagRelationships: '', difficultyLevel: '', answerExplanationType: 'text', answerExplanation: '',
};

// --- Utility helpers ---

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Strip bold, italic, and inline code markers from text */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

/** Check if text contains markdown worth preserving (bold, code, lists, headings) */
function hasMarkdown(text: string): boolean {
  return /\*\*[^*]+\*\*|```|`[^`]+`|^#{1,6}\s|^\s*[-*]\s\S|^\s*\d+\.\s/m.test(text);
}

/** Map AI difficulty (0-3) to template scale (0, 0.5, 1) */
function mapDifficulty(raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n) || n <= 0) return '0';
  if (n === 1) return '0.5';
  return '1';
}

/**
 * Ensure proper double-newlines between logical sections so markdown renders
 * with visible paragraph/section breaks. Handles:
 *  - blank line before bold section headers (**Label:**)
 *  - blank line after bold section headers
 *  - blank line at list↔prose transitions
 * Collapses triple+ newlines to double.
 */
function ensureMarkdownSpacing(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i]);

    if (i >= lines.length - 1) continue;

    const cur = lines[i].trim();
    const nxt = lines[i + 1].trim();

    // Already spaced or one side is empty
    if (cur === '' || nxt === '') continue;

    const curIsList = /^[-*]\s|^\d+\.\s/.test(cur);
    const nxtIsList = /^[-*]\s|^\d+\.\s/.test(nxt);

    // Both are list items — keep tight
    if (curIsList && nxtIsList) continue;

    // Transition between list and non-list
    if (curIsList !== nxtIsList) { result.push(''); continue; }

    // Before a bold section header (e.g. **Deliverables:**)
    if (/^\*\*[A-Za-z]/.test(nxt)) { result.push(''); continue; }

    // After a bold section header ending with :**
    if (/\*\*:?\s*$/.test(cur)) { result.push(''); continue; }

    // Before a markdown heading
    if (/^#{1,6}\s/.test(nxt)) { result.push(''); continue; }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// --- Question-type detection ---

/** Try to detect type from the header line (e.g. "Question 1 (MCQ)") */
function detectTypeFromHeader(header: string): 'mcsc' | 'mcmc' | 'subjective' | null {
  const h = header.toLowerCase();
  if (/\(mcq\)|multiple\s*choice\s*question/i.test(h)) return 'mcsc';
  if (/\(msq\)|multiple\s*select/i.test(h)) return 'mcmc';
  if (/\(subjective\)/.test(h)) return 'subjective';
  return null;
}

/** Fallback: detect type from content heuristics */
function detectTypeFromContent(chunk: string): 'mcsc' | 'mcmc' | 'subjective' | null {
  const hasOptions = /^(?:\*\*?)?\s*\(?\s*[A-D]\s*[).]/im.test(chunk);
  const hasSubjectiveMarkers = /\*?\*?(?:Model\s+Answer|Editorial\s+Solution|Deliverables)\*?\*?/i.test(chunk);

  if (hasSubjectiveMarkers && !hasOptions) return 'subjective';

  if (hasOptions) {
    const correctMatch = chunk.match(/Correct\s+Answers?\s*[\*:]*\s*\*?\*?\s*([A-D][A-D,\s&]*)/i);
    if (correctMatch) {
      const letters = correctMatch[1].toUpperCase().replace(/[^A-D]/g, '');
      return letters.length > 1 ? 'mcmc' : 'mcsc';
    }
    return 'mcsc'; // default if options present but can't determine
  }

  return null;
}

// --- Extraction helpers ---

/** Is this line a question header? */
const isQuestionHeader = (line: string) =>
  /^\s*(?:#{1,4}\s+|\*\*)?Question\s+\d+/i.test(line);

/**
 * Extract inline text that may follow the question header on the same line.
 * e.g. "**Question 1 (MCQ):** Some question text" → "Some question text"
 */
function extractInlineText(headerLine: string): string {
  const m = headerLine.match(
    /Question\s+\d+\s*(?:\([^)]*\))?\s*\**:?\s*\**\s*(.+)/i
  );
  if (!m) return '';
  // Strip stray asterisks left over from bold wrappers (e.g. "**Question 1 (MCQ)**" → captured "*")
  const text = m[1].replace(/^\*+|\*+$/g, '').trim();
  // Filter out if empty or just a type label leftover
  if (!text || /^\(?(MCQ|MSQ|Subjective)\)?$/i.test(text)) return '';
  return text;
}

/**
 * Extract question stem for MCQ / MSQ.
 * Collects lines from after the header until the first option line (A/B/C/D),
 * or until answer/metadata markers. Respects code blocks.
 */
function extractObjectiveBody(lines: string[]): string {
  const bodyLines: string[] = [];
  let started = false;
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Find the header to start collecting
    if (!started) {
      if (isQuestionHeader(trimmed)) {
        started = true;
        const inline = extractInlineText(trimmed);
        if (inline) bodyLines.push(inline);
      }
      continue;
    }

    // Track code fences
    if (trimmed.startsWith('```')) inCodeBlock = !inCodeBlock;

    if (!inCodeBlock) {
      // Stop at option lines
      if (/^(?:\*\*?)?\s*\(?\s*[A-D]\s*[).]/i.test(trimmed)) break;
      // Stop at answer / metadata markers
      if (/^\*?\*?Correct\s+Answers?/i.test(trimmed)) break;
      if (/^\*?\*?Difficulty/i.test(trimmed)) break;
      if (/^\*?\*?Explanation/i.test(trimmed)) break;
      // Skip horizontal rules
      if (/^---+$/.test(trimmed)) continue;
    }

    // Skip leading blank lines
    if (bodyLines.length === 0 && trimmed === '') continue;

    bodyLines.push(rawLine);
  }

  // Trim trailing blank lines
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();

  return bodyLines.join('\n').trim();
}

/**
 * Extract the full question body for Subjective questions.
 * Includes scenario, deliverables, constraints, and evaluation criteria —
 * everything up to (but not including) the Model Answer / Editorial Solution.
 */
function extractSubjectiveBody(lines: string[]): string {
  const bodyLines: string[] = [];
  let started = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!started) {
      if (isQuestionHeader(trimmed)) {
        started = true;
        const inline = extractInlineText(trimmed);
        if (inline) bodyLines.push(inline);
      }
      continue;
    }

    // Stop at Model Answer / Editorial Solution (handles both bold and heading syntax)
    if (/^(?:#{1,6}\s+)?\*?\*?(?:Model\s+Answer|Editorial\s+Solution)\*?\*?\s*:?/i.test(trimmed)) break;

    // Skip horizontal rules
    if (/^---+$/.test(trimmed)) continue;

    // Skip leading blank lines
    if (bodyLines.length === 0 && trimmed === '') continue;

    bodyLines.push(rawLine);
  }

  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();

  return ensureMarkdownSpacing(bodyLines.join('\n'));
}

/** Extract option text for A–D, stripping markdown formatting */
function extractOptions(lines: string[]): Record<string, string> {
  const opts: Record<string, string> = {
    'option.1': '', 'option.2': '', 'option.3': '', 'option.4': '',
  };
  const map: Record<string, keyof typeof opts> = { A: 'option.1', B: 'option.2', C: 'option.3', D: 'option.4' };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Flexible match: **A)**, A), A., (A), etc.
    const m = line.match(/^(?:\*\*?)?\s*\(?\s*([A-D])\s*[).]\s*\)?\s*(?:\*\*?)?\s*(.+)/i);
    if (m) {
      const key = map[m[1].toUpperCase()];
      if (key) opts[key] = stripInlineMarkdown(m[2]);
    }
  }

  return opts;
}

/** Extract correct answer letter(s) */
function extractCorrectAnswers(text: string): string[] {
  const m = text.match(/\*?\*?Correct\s+Answers?\*?\*?\s*[\*:]*\s*\*?\*?\s*([A-D][A-D,\s&and]*)/i);
  if (!m) return [];
  return m[1].toUpperCase().replace(/[^A-D]/g, '').split('');
}

/** Extract difficulty value and map to template scale */
function extractDifficulty(text: string): string {
  const m = text.match(/\*?\*?Difficulty\*?\*?\s*[\*:]*\s*\*?\*?\s*(\d+)/i);
  if (!m) return '0';
  return mapDifficulty(m[1]);
}

/** Extract explanation text (for MCQ / MSQ) */
function extractExplanation(text: string): string {
  const start = text.match(/\*?\*?Explanation\*?\*?\s*[\*:]*\s*\*?\*?\s*/i);
  if (!start || start.index === undefined) return '';

  let content = text.slice(start.index + start[0].length);

  // Trim at next question, heading, or horizontal rule
  const ends = [
    content.search(/\n\s*\*?\*?Question\s+\d+/i),
    content.search(/\n\s*---/),
    content.search(/\n\s*#{1,4}\s/),
  ].filter(i => i !== -1);

  if (ends.length > 0) content = content.slice(0, Math.min(...ends));

  return content.trim();
}

/**
 * Extract Model Answer / Editorial Solution for Subjective questions.
 * Takes everything from the marker to the end of the chunk.
 */
function extractModelAnswer(text: string): string {
  const start = text.match(/\*?\*?(?:Model\s+Answer|Editorial\s+Solution)\*?\*?\s*[\*:]*\s*\*?\*?\s*/i);
  if (!start || start.index === undefined) return '';

  let content = text.slice(start.index + start[0].length);

  // Trim at next question header if present (shouldn't be, but safety)
  const next = content.search(/\n\s*\*?\*?Question\s+\d+/i);
  if (next !== -1) content = content.slice(0, next);

  // Remove trailing horizontal rules
  content = content.replace(/\n---\s*$/g, '');

  return ensureMarkdownSpacing(content.trim());
}

// --- Parsers ---

function parseObjective(text: string, questionType: 'mcsc' | 'mcmc'): Partial<CSVRow> | null {
  if (!/Question\s+\d+/i.test(text)) return null;

  const lines = text.split('\n');

  const result: Partial<CSVRow> = {
    questionType,
    contentType: 'text',
    difficultyLevel: '0',
    answerExplanationType: 'text',
    answerExplanation: '',
    'option.1': '', 'option.2': '', 'option.3': '', 'option.4': '',
  };

  // --- Body (question stem only) ---
  const body = extractObjectiveBody(lines);
  result.contentBody = body || 'Missing Question Text';
  if (hasMarkdown(result.contentBody)) {
    result.contentType = 'markdown';
    result.contentBody = ensureMarkdownSpacing(result.contentBody);
  }

  // --- Options (stripped of markdown) ---
  Object.assign(result, extractOptions(lines));

  // --- Correct answer(s) → numeric ---
  const letters = extractCorrectAnswers(text);
  if (letters.length > 0) {
    if (questionType === 'mcmc') {
      result.mcmcAnswer = letters.map(l => String(l.charCodeAt(0) - 64)).join(', ');
    } else {
      result.mcscAnswer = String(letters[0].charCodeAt(0) - 64);
    }
  }

  // --- Difficulty (mapped to 0 / 0.5 / 1) ---
  result.difficultyLevel = extractDifficulty(text);

  // --- Explanation ---
  const explanation = extractExplanation(text);
  if (explanation) {
    result.answerExplanation = explanation;
    if (hasMarkdown(explanation)) {
      result.answerExplanationType = 'markdown';
    }
  }

  return result;
}

function parseSubjective(text: string): Partial<CSVRow> | null {
  if (!/Question\s+\d+/i.test(text)) return null;

  const lines = text.split('\n');

  const result: Partial<CSVRow> = {
    questionType: 'subjective',
    contentType: 'markdown',          // always markdown
    difficultyLevel: '1',             // always hard
    answerExplanationType: 'text',
    answerExplanation: '',
    subjectiveAnswer: '',             // always empty per template
  };

  // --- Body: scenario + deliverables + constraints + evaluation criteria ---
  const body = extractSubjectiveBody(lines);
  result.contentBody = body || 'Missing Question Text';

  // --- Model Answer → answerExplanation ---
  const modelAnswer = extractModelAnswer(text);
  if (modelAnswer) {
    result.answerExplanation = modelAnswer;
    result.answerExplanationType = hasMarkdown(modelAnswer) ? 'markdown' : 'text';
  }

  return result;
}

// --- Public API ---

export function parseAssignmentMarkdown(markdown: string): CSVRow[] {
  // Split at every "Question N" header boundary
  const chunks = markdown
    .split(/(?=(?:^|\n)\s*(?:#{1,4}\s+|\*\*)?Question\s+\d+)/i)
    .filter(s => /Question\s+\d+/i.test(s));

  const rows: CSVRow[] = [];

  for (const chunk of chunks) {
    // 1) Try explicit type from header  (MCQ) / (MSQ) / (Subjective)
    const headerMatch = chunk.match(/Question\s+\d+[^)\n]*\)?/i);
    let qType = headerMatch ? detectTypeFromHeader(headerMatch[0]) : null;

    // 2) Fallback: heuristic detection
    if (!qType) qType = detectTypeFromContent(chunk);

    if (!qType) continue; // unrecognisable block — skip

    const row =
      qType === 'subjective'
        ? parseSubjective(chunk)
        : parseObjective(chunk, qType);

    if (row && row.contentBody) {
      // Final cleanup: strip any leftover question-header text from body start
      row.contentBody = row.contentBody
        .replace(/^\*?\*?Question\s+\d+[^*\n]*\*?\*?\s*/i, '')
        .trim();

      rows.push({ ...EMPTY_ROW, ...row });
    }
  }

  return rows;
}

export function convertToCSV(rows: CSVRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const values = CSV_HEADERS.map(h =>
      escapeCSV(String((row as unknown as Record<string, unknown>)[h as string] ?? ''))
    );
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

export function downloadCSV(rows: CSVRow[], filename: string): void {
  const csv = convertToCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  try {
    document.body.appendChild(a);
    a.click();
  } finally {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
