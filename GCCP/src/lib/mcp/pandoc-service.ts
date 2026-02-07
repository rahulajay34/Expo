/**
 * mcp-pandoc Service Client
 * 
 * Wrapper for the mcp-pandoc MCP server that provides document format conversion.
 * Supports: Markdown, HTML, PDF, DOCX, LaTeX, RTF, EPUB, ODT
 * 
 * Usage:
 *   const result = await convertDocument(markdown, 'docx', 'output.docx');
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export type ExportFormat = 'pdf' | 'docx' | 'html' | 'latex' | 'rtf' | 'epub' | 'odt' | 'markdown';

export interface ConversionOptions {
    title?: string;
    author?: string;
    date?: string;
    toc?: boolean;          // Table of contents
    tocDepth?: number;      // TOC depth (1-6)
    standalone?: boolean;   // Complete document with headers
    highlight?: boolean;    // Syntax highlighting for code
    mathMethod?: 'katex' | 'mathjax' | 'webtex';
    template?: string;      // Custom template path
    css?: string;           // Custom CSS for HTML output
    pageSize?: 'a4' | 'letter';
    margin?: string;        // e.g., '1in', '2.5cm'
}

export interface ConversionResult {
    success: boolean;
    outputPath?: string;
    outputBuffer?: Buffer;
    format: ExportFormat;
    error?: string;
    metadata?: {
        inputSize: number;
        outputSize: number;
        conversionTime: number;
    };
}

/**
 * Check if Pandoc is installed on the system
 */
export function isPandocInstalled(): boolean {
    try {
        execSync('pandoc --version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Get Pandoc version
 */
export function getPandocVersion(): string | null {
    try {
        const output = execSync('pandoc --version', { encoding: 'utf-8' });
        const match = output.match(/pandoc\s+(\d+\.\d+(?:\.\d+)?)/i);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * Convert markdown content to the specified format
 */
export async function convertDocument(
    content: string,
    targetFormat: ExportFormat,
    options: ConversionOptions = {}
): Promise<ConversionResult> {
    const startTime = performance.now();

    // Check Pandoc installation
    if (!isPandocInstalled()) {
        return {
            success: false,
            format: targetFormat,
            error: 'Pandoc is not installed. Please install Pandoc to use document conversion features.'
        };
    }

    // Create temp directory for processing
    const tempDir = join(tmpdir(), 'gccp-export-' + randomUUID());
    const inputPath = join(tempDir, 'input.md');
    const outputFilename = `output.${targetFormat === 'latex' ? 'tex' : targetFormat}`;
    const outputPath = join(tempDir, outputFilename);

    try {
        // Ensure temp directory exists
        if (!existsSync(tempDir)) {
            mkdirSync(tempDir, { recursive: true });
        }

        // Write input content
        writeFileSync(inputPath, content, 'utf-8');

        // Build Pandoc command
        const args: string[] = [
            inputPath,
            '-o', outputPath,
            '-f', 'markdown+tex_math_dollars+pipe_tables+strikeout+yaml_metadata_block',
        ];

        // Add format-specific options
        if (options.standalone !== false) {
            args.push('-s'); // Standalone document
        }

        if (options.toc) {
            args.push('--toc');
            if (options.tocDepth) {
                args.push('--toc-depth=' + options.tocDepth);
            }
        }

        // Metadata
        if (options.title) {
            args.push('--metadata', `title=${options.title}`);
        }
        if (options.author) {
            args.push('--metadata', `author=${options.author}`);
        }
        if (options.date) {
            args.push('--metadata', `date=${options.date}`);
        }

        // Format-specific handling
        switch (targetFormat) {
            case 'pdf':
                // PDF requires a PDF engine
                args.push('--pdf-engine=xelatex');
                if (options.pageSize) {
                    args.push(`-V`, `papersize=${options.pageSize}`);
                }
                if (options.margin) {
                    args.push(`-V`, `geometry:margin=${options.margin}`);
                }
                // Math rendering
                args.push('--katex');
                break;

            case 'html':
                args.push('--embed-resources');
                args.push('--standalone');
                if (options.mathMethod === 'mathjax') {
                    args.push('--mathjax');
                } else {
                    args.push('--katex');
                }
                if (options.highlight !== false) {
                    args.push('--highlight-style=pygments');
                }
                if (options.css) {
                    args.push('--css', options.css);
                }
                break;

            case 'docx':
                // DOCX usually just works, but we can add a reference doc for styling
                if (options.template) {
                    args.push('--reference-doc', options.template);
                }
                break;

            case 'latex':
                args.push('--standalone');
                if (options.template) {
                    args.push('--template', options.template);
                }
                break;

            case 'epub':
                args.push('--epub-embed-font');
                break;
        }

        // Execute Pandoc
        const command = `pandoc ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;
        console.log('[PandocService] Executing:', command);

        execSync(command, {
            stdio: 'pipe',
            timeout: 60000, // 60 second timeout
            env: {
                ...process.env,
                // Ensure XeLaTeX can find fonts
                HOME: process.env.HOME,
                // Add MacTeX path for xelatex (needed when server starts before PATH is updated)
                PATH: `${process.env.PATH || ''}:/Library/TeX/texbin:/usr/local/bin:/opt/homebrew/bin`,
            }
        });

        // Read output
        if (!existsSync(outputPath)) {
            throw new Error('Pandoc did not generate output file');
        }

        const outputBuffer = readFileSync(outputPath);
        const conversionTime = Math.round(performance.now() - startTime);

        // Cleanup
        try {
            unlinkSync(inputPath);
            unlinkSync(outputPath);
        } catch {
            // Ignore cleanup errors
        }

        return {
            success: true,
            format: targetFormat,
            outputPath,
            outputBuffer,
            metadata: {
                inputSize: Buffer.byteLength(content, 'utf-8'),
                outputSize: outputBuffer.length,
                conversionTime
            }
        };

    } catch (error: any) {
        // Cleanup on error
        try {
            if (existsSync(inputPath)) unlinkSync(inputPath);
            if (existsSync(outputPath)) unlinkSync(outputPath);
        } catch {
            // Ignore cleanup errors
        }

        console.error('[PandocService] Conversion failed:', error);

        let errorMessage = 'Document conversion failed';
        if (error.message?.includes('xelatex')) {
            errorMessage = 'PDF generation requires XeLaTeX. Please install TeX Live or MacTeX.';
        } else if (error.message?.includes('ENOENT')) {
            errorMessage = 'Pandoc not found in PATH. Please ensure Pandoc is installed.';
        } else if (error.stderr) {
            errorMessage = error.stderr.toString().slice(0, 500);
        }

        return {
            success: false,
            format: targetFormat,
            error: errorMessage
        };
    }
}

/**
 * Convert assignment questions to a formatted document
 */
export async function convertAssignment(
    questions: Array<{
        type: 'mcsc' | 'mcmc' | 'subjective';
        question: string;
        options?: string[];
        answer: string | string[];
        explanation?: string;
    }>,
    options: ConversionOptions & { showAnswers?: boolean } = {}
): Promise<ConversionResult> {
    // Build markdown from questions
    const lines: string[] = [];

    if (options.title) {
        lines.push(`# ${options.title}`);
        lines.push('');
    }

    let questionNum = 1;

    // Group by type
    const mcscQuestions = questions.filter(q => q.type === 'mcsc');
    const mcmcQuestions = questions.filter(q => q.type === 'mcmc');
    const subjectiveQuestions = questions.filter(q => q.type === 'subjective');

    if (mcscQuestions.length > 0) {
        lines.push('## Multiple Choice (Single Correct)');
        lines.push('');
        for (const q of mcscQuestions) {
            lines.push(`**${questionNum}.** ${q.question}`);
            lines.push('');
            if (q.options) {
                q.options.forEach((opt, i) => {
                    const letter = String.fromCharCode(65 + i); // A, B, C, D...
                    lines.push(`   ${letter}. ${opt}`);
                });
            }
            lines.push('');
            if (options.showAnswers) {
                lines.push(`> **Answer:** ${q.answer}`);
                if (q.explanation) {
                    lines.push(`> **Explanation:** ${q.explanation}`);
                }
                lines.push('');
            }
            questionNum++;
        }
    }

    if (mcmcQuestions.length > 0) {
        lines.push('## Multiple Choice (Multiple Correct)');
        lines.push('');
        for (const q of mcmcQuestions) {
            lines.push(`**${questionNum}.** ${q.question}`);
            lines.push('');
            if (q.options) {
                q.options.forEach((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    lines.push(`   ${letter}. ${opt}`);
                });
            }
            lines.push('');
            if (options.showAnswers) {
                const answers = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
                lines.push(`> **Answers:** ${answers}`);
                if (q.explanation) {
                    lines.push(`> **Explanation:** ${q.explanation}`);
                }
                lines.push('');
            }
            questionNum++;
        }
    }

    if (subjectiveQuestions.length > 0) {
        lines.push('## Subjective Questions');
        lines.push('');
        for (const q of subjectiveQuestions) {
            lines.push(`**${questionNum}.** ${q.question}`);
            lines.push('');
            if (options.showAnswers) {
                lines.push('**Expected Answer:**');
                lines.push('');
                lines.push(q.answer as string);
                lines.push('');
            }
            questionNum++;
        }
    }

    const markdown = lines.join('\n');

    return convertDocument(markdown, options.showAnswers ? 'pdf' : 'docx', options);
}

/**
 * Get supported export formats with descriptions
 */
export function getSupportedFormats(): { format: ExportFormat; name: string; description: string; requiresLatex?: boolean }[] {
    return [
        { format: 'pdf', name: 'PDF', description: 'Portable Document Format - best for printing', requiresLatex: true },
        { format: 'docx', name: 'Word', description: 'Microsoft Word document - editable' },
        { format: 'html', name: 'HTML', description: 'Web page format - viewable in browser' },
        { format: 'latex', name: 'LaTeX', description: 'LaTeX source - for academic publishing' },
        { format: 'epub', name: 'EPUB', description: 'E-book format - for e-readers' },
        { format: 'odt', name: 'ODT', description: 'LibreOffice document - open format' },
        { format: 'rtf', name: 'RTF', description: 'Rich Text Format - widely compatible' }
    ];
}
