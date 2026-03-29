import { CSVRow } from '../types';

const CSV_HEADERS: (keyof CSVRow)[] = [
  'questionType', 'contentType', 'contentBody', 'intAnswer', 'prepTime(in_seconds)',
  'floatAnswer.max', 'floatAnswer.min', 'fitbAnswer', 'mcscAnswer', 'subjectiveAnswer',
  'option.1', 'option.2', 'option.3', 'option.4', 'mcmcAnswer', 'tagRelationships',
  'difficultyLevel', 'answerExplanationType', 'answerExplanation',
];

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function extractOptions(lines: string[], result: Partial<CSVRow>) {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Matches A), A., **A)**, etc.
    const aMatch = line.match(/^(?:\*\*?)?A[\)\.](?:\*\*?)?\s*(.+)/i);
    const bMatch = line.match(/^(?:\*\*?)?B[\)\.](?:\*\*?)?\s*(.+)/i);
    const cMatch = line.match(/^(?:\*\*?)?C[\)\.](?:\*\*?)?\s*(.+)/i);
    const dMatch = line.match(/^(?:\*\*?)?D[\)\.](?:\*\*?)?\s*(.+)/i);
    if (aMatch) result['option.1'] = aMatch[1].trim();
    if (bMatch) result['option.2'] = bMatch[1].trim();
    if (cMatch) result['option.3'] = cMatch[1].trim();
    if (dMatch) result['option.4'] = dMatch[1].trim();
  }
}

function extractBody(lines: string[]): string {
  const bodyLines: string[] = [];
  let inBody = false;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    if (/Question\s+\d+/i.test(trimmedLine) && !inBody) { 
      inBody = true; 
      // Sometimes the question text is on the same line
      const inlineMatch = trimmedLine.match(/Question\s+\d+[:\-\s]+(.+)/i);
      if (inlineMatch && inlineMatch[1].trim() && !inlineMatch[1].includes('(MCQ)') && !inlineMatch[1].includes('(MSQ)')) {
        bodyLines.push(inlineMatch[1].trim());
      }
      continue; 
    }
    
    if (inBody) {
      if (rawLine.includes('```')) {
        inCodeBlock = !inCodeBlock;
      }

      // Stop extracting body if we hit options or parsing boundaries (outside of code blocks!)
      if (!inCodeBlock) {
        if (/^(?:\*\*?)?[A-D][\)\.]/i.test(trimmedLine)) break;
        if (/^\*?(Correct Answer|Deliverables|Constraints|Requirements|Task|Background|Evaluation|Model Answer)/i.test(trimmedLine)) break;
        if (trimmedLine.includes('---')) continue;
        if (trimmedLine === '') {
          // preserve natural line breaks between paragraphs
          if (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] !== '') {
            bodyLines.push('');
          }
          continue;
        }
      }

      bodyLines.push(rawLine);
    }
  }

  // Remove trailing empty lines
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') {
    bodyLines.pop();
  }
  
  return bodyLines.join('\n');
}

function hasMarkdown(text: string): boolean {
  return text.includes('**') || text.includes('```') || text.includes('* ') || text.includes('`');
}

function parseObjective(text: string, isMSQ: boolean): Partial<CSVRow> | null {
  const qMatch = text.match(/Question\s+(\d+)/i);
  if (!qMatch) return null;

  const lines = text.split('\n');
  const result: Partial<CSVRow> = {
    questionType: isMSQ ? 'mcmc' : 'mcsc', 
    contentType: 'text', 
    difficultyLevel: '0',
    answerExplanationType: 'text', 
    answerExplanation: '',
    'option.1': '', 'option.2': '', 'option.3': '', 'option.4': '',
  };

  result.contentBody = extractBody(lines) || 'Missing Question Text';
  if (hasMarkdown(result.contentBody)) {
    result.contentType = 'markdown';
  }

  extractOptions(lines, result);

  const correctMatch = text.match(/Correct Answers?[\*: \-]*([A-D][A-D,\s]*)/i);
  if (correctMatch) {
    const letters = correctMatch[1].toUpperCase().replace(/[^A-D]/g, '').split('');
    if (isMSQ) {
      result.mcmcAnswer = letters.map(l => String(l.charCodeAt(0) - 64)).join(', ');
    } else {
      result.mcscAnswer = String(letters[0].charCodeAt(0) - 64);
    }
  }

  const diffMatch = text.match(/Difficulty[\*: \-]*(\d+)/i);
  if (diffMatch) result.difficultyLevel = diffMatch[1];

  const expMatch = text.match(/Explanation[\*: \-]*([\s\S]+?)(?=\n[ \t]*\*\*|\n[ \t]*##|\n[ \t]*---|$)/i);
  if (expMatch) {
    result.answerExplanation = expMatch[1].trim();
    if (hasMarkdown(result.answerExplanation)) {
      result.answerExplanationType = 'markdown';
    }
  }

  return result;
}

function parseSubjective(text: string): Partial<CSVRow> | null {
  const qMatch = text.match(/Question\s+(\d+)/i);
  if (!qMatch) return null;

  const lines = text.split('\n');
  const result: Partial<CSVRow> = {
    questionType: 'subjective', contentType: 'text', difficultyLevel: '0',
    answerExplanationType: 'text', answerExplanation: '',
  };

  const extractedBody = extractBody(lines);
  result.contentBody = extractedBody || text.split('\n')[1]?.trim() || 'Missing Scenario';
  if (hasMarkdown(result.contentBody)) {
    result.contentType = 'markdown';
  }

  const modelMatch = text.match(/Model Answer[\*: \-]*([\s\S]+?)(?=\n[ \t]*##|\n[ \t]*\*\*Question|\n[ \t]*---|\s*$)/i);
  if (modelMatch) {
    result.answerExplanation = modelMatch[1].trim();
    if (hasMarkdown(result.answerExplanation)) {
      result.answerExplanationType = 'markdown';
    }
  }

  return result;
}

export function parseAssignmentMarkdown(markdown: string): CSVRow[] {
  // Split robustly by detecting any standard "Question N" header variation
  const questions = markdown.split(/(?=(?:^|\n)\s*(?:\#+\s+|\*\*)?Question\s+\d+)/i).filter(s => /Question\s+\d+/i.test(s));
  const rows: CSVRow[] = [];

  const emptyRow: CSVRow = {
    questionType: '', contentType: 'text', contentBody: '', intAnswer: '',
    'prepTime(in_seconds)': '', 'floatAnswer.max': '', 'floatAnswer.min': '', fitbAnswer: '',
    mcscAnswer: '', subjectiveAnswer: '', 'option.1': '', 'option.2': '', 'option.3': '', 'option.4': '',
    mcmcAnswer: '', tagRelationships: '', difficultyLevel: '', answerExplanationType: 'text', answerExplanation: '',
  };

  for (const q of questions) {
    let row: Partial<CSVRow> | null = null;

    // Detect question type using heuristics rather than expecting strict header tags
    const hasOptions = /^(?:\*\*?)?[A-D][\)\.]/im.test(q);
    const hasModelAnswer = /\*?(Deliverables|Model Answer|Constraints)\*?/i.test(q);
    const correctMatch = q.match(/Correct Answers?[\*: \-]*([A-D][A-D,\s]*)/i);
    
    let isMSQ = false;
    if (correctMatch) {
      const letters = correctMatch[1].toUpperCase().replace(/[^A-D]/g, '').split('');
      if (letters.length > 1) {
        isMSQ = true;
      }
    }

    if (hasModelAnswer && !hasOptions) {
      row = parseSubjective(q);
    } else if (hasOptions) {
      row = parseObjective(q, isMSQ);
    }

    if (row && row.contentBody) {
      // Remove any leftover formatting markers from body if they sneaked in
      row.contentBody = row.contentBody.replace(/^\*\*(Question \d+.*)\*\*/i, '');
      rows.push({ ...emptyRow, ...row } as CSVRow);
    }
  }

  return rows;
}

export function convertToCSV(rows: CSVRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const values = CSV_HEADERS.map(h => escapeCSV(String((row as unknown as Record<string, unknown>)[h as string] ?? '')));
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
