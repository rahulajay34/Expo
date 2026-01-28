/**
 * Assignment Data Model - Aligned with CSV export format
 * Matches headers from temp - template.csv
 */

export type QuestionType = 'mcsc' | 'mcmc' | 'subjective';
export type DifficultyLevel = 0 | 0.5 | 1;

/**
 * Primary interface for assignment questions - matches CSV export structure
 */
export interface AssignmentItem {
    questionType: QuestionType;
    contentType: 'markdown';
    contentBody: string;

    // Optional numeric fields (unused for current question types)
    intAnswer?: number;
    prepTime?: number;
    floatAnswerMax?: number;
    floatAnswerMin?: number;
    fitbAnswer?: string;

    // Answer fields based on question type
    mcscAnswer?: number;        // Index 1-4 for single correct (mcsc only)
    subjectiveAnswer?: string;  // Model answer (subjective only)

    // Options as object with keys 1-4
    options: {
        1: string;
        2: string;
        3: string;
        4: string;
    };

    mcmcAnswer?: string;        // Comma-separated indices, e.g., "1, 4" (mcmc only)
    tagRelationships?: string;  // Optional tags
    difficultyLevel: DifficultyLevel;
    answerExplanation: string;
}

/**
 * CSV headers matching temp - template.csv
 */
export const CSV_HEADERS = [
    'questionType',
    'contentType',
    'contentBody',
    'intAnswer',
    'prepTime(in_seconds)',
    'floatAnswer.max',
    'floatAnswer.min',
    'fitbAnswer',
    'mcscAnswer',
    'subjectiveAnswer',
    'option.1',
    'option.2',
    'option.3',
    'option.4',
    'mcmcAnswer',
    'tagRelationships',
    'difficultyLevel',
    'answerExplanation',
] as const;

/**
 * Convert AssignmentItem to CSV row
 */
export function assignmentItemToCSVRow(item: AssignmentItem): string[] {
    return [
        item.questionType,
        item.contentType,
        item.contentBody,
        item.intAnswer?.toString() || '',
        item.prepTime?.toString() || '',
        item.floatAnswerMax?.toString() || '',
        item.floatAnswerMin?.toString() || '',
        item.fitbAnswer || '',
        item.mcscAnswer?.toString() || '',
        item.subjectiveAnswer || '',
        item.options[1],
        item.options[2],
        item.options[3],
        item.options[4],
        item.mcmcAnswer || '',
        item.tagRelationships || '',
        item.difficultyLevel?.toString() || '',
        item.answerExplanation,
    ];
}

/**
 * Escape a value for CSV (handle quotes and newlines)
 */
export function escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Generate full CSV content from array of AssignmentItems
 */
export function generateCSV(items: AssignmentItem[]): string {
    const headerRow = CSV_HEADERS.join(',');
    const dataRows = items.map(item => {
        return assignmentItemToCSVRow(item)
            .map(escapeCSVValue)
            .join(',');
    });
    return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Legacy support
 */
export interface LegacyAssignmentQuestion {
    type: string;
    question: string;
    options?: string[];
    answer?: string | number;
    explanation?: string;
    // Add other legacy fields as needed
}

export function convertLegacyToAssignmentItem(legacy: LegacyAssignmentQuestion): AssignmentItem {
    const isMcq = legacy.type === 'mcq' || legacy.type === 'mcsc';

    return {
        questionType: isMcq ? 'mcsc' : 'subjective',
        contentType: 'markdown',
        contentBody: legacy.question || '',
        options: {
            1: legacy.options?.[0] || '',
            2: legacy.options?.[1] || '',
            3: legacy.options?.[2] || '',
            4: legacy.options?.[3] || '',
        },
        mcscAnswer: typeof legacy.answer === 'number' ? legacy.answer : undefined,
        subjectiveAnswer: typeof legacy.answer === 'string' ? legacy.answer : undefined,
        difficultyLevel: 0.5,
        answerExplanation: legacy.explanation || '',
    };
}
