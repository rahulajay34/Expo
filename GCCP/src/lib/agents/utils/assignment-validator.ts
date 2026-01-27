/**
 * Assignment Validator - Validates structured assignment JSON output
 * Ensures all required fields are present and correctly formatted
 */

export interface AssignmentQuestion {
    type: 'MCSC' | 'MCMC' | 'Subjective';
    question_text: string;
    options?: string[];
    correct_option?: string;
    explanation: string;
    model_answer?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    fixedContent?: AssignmentQuestion[];
}

export interface ValidationError {
    index: number;
    field: string;
    message: string;
}

export interface ValidationWarning {
    index: number;
    field: string;
    message: string;
}

/**
 * Validate an array of assignment questions
 */
export function validateAssignment(questions: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fixedContent: AssignmentQuestion[] = [];

    if (!Array.isArray(questions)) {
        return {
            isValid: false,
            errors: [{ index: -1, field: 'root', message: 'Content must be an array of questions' }],
            warnings: [],
        };
    }

    questions.forEach((q, idx) => {
        const fixed = { ...q } as AssignmentQuestion;

        // Validate type field
        if (!q.type) {
            errors.push({ index: idx, field: 'type', message: 'Missing question type' });
        } else if (!['MCSC', 'MCMC', 'Subjective'].includes(q.type)) {
            errors.push({ index: idx, field: 'type', message: `Invalid type: ${q.type}` });
        }

        // Validate question_text
        if (!q.question_text || typeof q.question_text !== 'string') {
            errors.push({ index: idx, field: 'question_text', message: 'Missing or invalid question text' });
        } else if (q.question_text.trim().length < 10) {
            warnings.push({ index: idx, field: 'question_text', message: 'Question text seems too short' });
        }

        // Validate options for MC questions
        if (q.type === 'MCSC' || q.type === 'MCMC') {
            if (!Array.isArray(q.options) || q.options.length < 2) {
                errors.push({ index: idx, field: 'options', message: 'MC questions need at least 2 options' });
            } else if (q.options.length < 4) {
                warnings.push({ index: idx, field: 'options', message: 'Consider adding more options (4 recommended)' });
            }

            // Validate correct_option
            if (!q.correct_option) {
                errors.push({ index: idx, field: 'correct_option', message: 'Missing correct option' });
            } else {
                // Validate MCSC has single answer
                if (q.type === 'MCSC' && q.correct_option.includes(',')) {
                    errors.push({ index: idx, field: 'correct_option', message: 'MCSC should have single answer, not multiple' });
                }

                // Validate MCMC has at least 2 answers
                if (q.type === 'MCMC') {
                    const answers = q.correct_option.split(',').map((a: string) => a.trim());
                    if (answers.length < 2) {
                        warnings.push({ index: idx, field: 'correct_option', message: 'MCMC typically has multiple correct answers' });
                    }
                }

                // Validate answer indices are valid
                const validOptions = ['A', 'B', 'C', 'D', 'E', 'F'];
                const answers = q.correct_option.split(',').map((a: string) => a.trim().toUpperCase());
                for (const ans of answers) {
                    if (!validOptions.includes(ans)) {
                        errors.push({ index: idx, field: 'correct_option', message: `Invalid option: ${ans}` });
                    }
                }
            }
        }

        // Validate model_answer for subjective
        if (q.type === 'Subjective') {
            if (!q.model_answer || typeof q.model_answer !== 'string') {
                errors.push({ index: idx, field: 'model_answer', message: 'Subjective questions need model_answer' });
            } else if (q.model_answer.trim().length < 20) {
                warnings.push({ index: idx, field: 'model_answer', message: 'Model answer seems too short' });
            }
        }

        // Validate explanation
        if (!q.explanation || typeof q.explanation !== 'string') {
            warnings.push({ index: idx, field: 'explanation', message: 'Missing explanation' });
            fixed.explanation = 'Explanation pending.';
        }

        fixedContent.push(fixed);
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixedContent: errors.length === 0 ? fixedContent : undefined,
    };
}

/**
 * Validate question counts match expected
 */
export function validateQuestionCounts(
    questions: AssignmentQuestion[],
    expected: { mcsc: number; mcmc: number; subjective: number }
): { matches: boolean; actual: { mcsc: number; mcmc: number; subjective: number }; message?: string } {
    const actual = {
        mcsc: questions.filter(q => q.type === 'MCSC').length,
        mcmc: questions.filter(q => q.type === 'MCMC').length,
        subjective: questions.filter(q => q.type === 'Subjective').length,
    };

    const matches =
        actual.mcsc === expected.mcsc &&
        actual.mcmc === expected.mcmc &&
        actual.subjective === expected.subjective;

    if (!matches) {
        const parts: string[] = [];
        if (actual.mcsc !== expected.mcsc) parts.push(`MCSC: got ${actual.mcsc}, expected ${expected.mcsc}`);
        if (actual.mcmc !== expected.mcmc) parts.push(`MCMC: got ${actual.mcmc}, expected ${expected.mcmc}`);
        if (actual.subjective !== expected.subjective) parts.push(`Subjective: got ${actual.subjective}, expected ${expected.subjective}`);

        return { matches, actual, message: parts.join('; ') };
    }

    return { matches, actual };
}
