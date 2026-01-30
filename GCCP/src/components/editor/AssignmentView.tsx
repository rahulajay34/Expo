'use client';

import { Download, Table, Eye, FileText } from 'lucide-react';
import { useState, useMemo } from 'react';
import { 
    AssignmentItem, 
    LegacyAssignmentQuestion, 
    convertLegacyToAssignmentItem,
    generateCSV 
} from '@/types/assignment';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table';

interface AssignmentViewProps {
    jsonContent: string;
}

/**
 * Normalize questions from either legacy or new format to AssignmentItem[]
 */
function normalizeQuestions(parsed: unknown[]): AssignmentItem[] {
    if (!Array.isArray(parsed) || parsed.length === 0) {
        return [];
    }
    
    // Detect format by checking first item
    const first = parsed[0] as Record<string, unknown>;
    
    // New format has 'questionType', legacy has 'type'
    if (first.questionType) {
        // Already in new format
        return parsed as AssignmentItem[];
    }
    
    // Legacy format - convert
    return (parsed as LegacyAssignmentQuestion[]).map(convertLegacyToAssignmentItem);
}

/**
 * Get display answer based on question type
 */
function getDisplayAnswer(item: AssignmentItem): string {
    switch (item.questionType) {
        case 'mcsc':
            return item.mcscAnswer ? `Option ${item.mcscAnswer}` : 'N/A';
        case 'mcmc':
            return item.mcmcAnswer || 'N/A';
        case 'subjective':
            return item.subjectiveAnswer?.substring(0, 50) + '...' || 'N/A';
        default:
            return 'N/A';
    }
}

/**
 * Get options as array for display
 */
function getOptionsArray(item: AssignmentItem): string[] {
    return [item.options[1], item.options[2], item.options[3], item.options[4]];
}

/**
 * Generate Markdown content from assignment questions
 */
function generateMarkdown(questions: AssignmentItem[]): string {
    let markdown = '# Assignment\n\n';
    
    questions.forEach((q, i) => {
        markdown += `## Question ${i + 1}\n\n`;
        markdown += `**Type:** ${q.questionType.toUpperCase()}\n\n`;
        markdown += `${q.contentBody}\n\n`;
        
        if (q.questionType !== 'subjective') {
            markdown += '### Options\n\n';
            markdown += `1. ${q.options[1] || '(empty)'}\n`;
            markdown += `2. ${q.options[2] || '(empty)'}\n`;
            markdown += `3. ${q.options[3] || '(empty)'}\n`;
            markdown += `4. ${q.options[4] || '(empty)'}\n\n`;
        }
        
        markdown += '### Answer\n\n';
        if (q.questionType === 'mcsc') {
            markdown += `Correct Option: ${q.mcscAnswer}\n\n`;
        } else if (q.questionType === 'mcmc') {
            markdown += `Correct Options: ${q.mcmcAnswer}\n\n`;
        } else if (q.questionType === 'subjective' && q.subjectiveAnswer) {
            markdown += `${q.subjectiveAnswer}\n\n`;
        }
        
        markdown += '### Explanation\n\n';
        markdown += `${q.answerExplanation}\n\n`;
        markdown += '---\n\n';
    });
    
    return markdown;
}

const columnHelper = createColumnHelper<AssignmentItem>();

export function AssignmentView({ jsonContent }: AssignmentViewProps) {
    const [view, setView] = useState<'table' | 'student'>('table');
    const [sorting, setSorting] = useState<SortingState>([]);
    
    // Parse and normalize questions with memoization
    const { questions, parseError } = useMemo(() => {
        try {
            const parsed = JSON.parse(jsonContent);
            return { questions: normalizeQuestions(parsed), parseError: null };
        } catch {
            return { questions: [], parseError: 'Error parsing assignment data.' };
        }
    }, [jsonContent]);
    
    // Define columns for TanStack Table
    const columns = useMemo(() => [
        columnHelper.accessor('questionType', {
            header: 'Type',
            cell: info => (
                <span className="font-mono text-xs text-gray-500 uppercase">
                    {info.getValue()}
                </span>
            ),
            size: 80,
        }),
        columnHelper.accessor('contentBody', {
            header: 'Question',
            cell: info => (
                <div className="prose prose-sm max-w-none">
                    <SafeMarkdown highlight>{info.getValue()}</SafeMarkdown>
                </div>
            ),
            size: 300,
        }),
        columnHelper.accessor(row => row.options[1], {
            id: 'option1',
            header: 'Option 1',
            cell: info => <span className="text-xs text-gray-600">{info.getValue() || '-'}</span>,
            size: 120,
        }),
        columnHelper.accessor(row => row.options[2], {
            id: 'option2',
            header: 'Option 2',
            cell: info => <span className="text-xs text-gray-600">{info.getValue() || '-'}</span>,
            size: 120,
        }),
        columnHelper.accessor(row => row.options[3], {
            id: 'option3',
            header: 'Option 3',
            cell: info => <span className="text-xs text-gray-600">{info.getValue() || '-'}</span>,
            size: 120,
        }),
        columnHelper.accessor(row => row.options[4], {
            id: 'option4',
            header: 'Option 4',
            cell: info => <span className="text-xs text-gray-600">{info.getValue() || '-'}</span>,
            size: 120,
        }),
        columnHelper.accessor(row => getDisplayAnswer(row), {
            id: 'answer',
            header: 'Answer',
            cell: info => (
                <span className="font-medium text-emerald-600 text-xs">
                    {info.getValue()}
                </span>
            ),
            size: 100,
        }),
        columnHelper.accessor('answerExplanation', {
            header: 'Explanation',
            cell: info => (
                <span className="text-gray-500 text-xs" title={info.getValue()}>
                    {info.getValue().substring(0, 80)}...
                </span>
            ),
            size: 200,
        }),
    ], []);

    // Create table instance
    const table = useReactTable({
        data: questions,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        columnResizeMode: 'onChange',
    });
    
    if (parseError) {
        return <div className="text-red-500 p-4">{parseError}</div>;
    }
    
    if (questions.length === 0) {
        return <div className="text-gray-500 p-4">No questions found.</div>;
    }

    const downloadCSV = () => {
        const csvContent = generateCSV(questions);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assignment.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadMarkdown = () => {
        const markdownContent = generateMarkdown(questions);
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assignment.md';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <button 
                    onClick={() => setView('table')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === 'table' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Table size={14} /> Table View
                </button>
                <button 
                    onClick={() => setView('student')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === 'student' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Eye size={14} /> Student View
                </button>
                <div className="ml-auto flex items-center gap-2">
                    <button 
                        onClick={downloadMarkdown}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                        <FileText size={14} /> Download MD
                    </button>
                    <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                        <Download size={14} /> Download CSV
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {view === 'table' ? (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left" style={{ width: table.getCenterTotalSize() }}>
                                <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <th
                                                    key={header.id}
                                                    className="p-3 relative group select-none"
                                                    style={{ width: header.getSize() }}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    <div className="flex items-center gap-1 cursor-pointer">
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        {{
                                                            asc: ' ↑',
                                                            desc: ' ↓',
                                                        }[header.column.getIsSorted() as string] ?? null}
                                                    </div>
                                                    {/* Resize handle */}
                                                    <div
                                                        onMouseDown={header.getResizeHandler()}
                                                        onTouchStart={header.getResizeHandler()}
                                                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none
                                                            ${header.column.getIsResizing() ? 'bg-blue-500' : 'bg-gray-300 opacity-0 group-hover:opacity-100'}
                                                            hover:bg-blue-400 transition-opacity`}
                                                    />
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody className="divide-y">
                                    {table.getRowModel().rows.map(row => (
                                        <tr key={row.id} className="hover:bg-gray-50/50">
                                            {row.getVisibleCells().map(cell => (
                                                <td
                                                    key={cell.id}
                                                    className="p-3 overflow-hidden"
                                                    style={{ width: cell.column.getSize() }}
                                                >
                                                    <div className="truncate">
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-3xl mx-auto">
                        {questions.map((q, i) => {
                            const optionsArr = getOptionsArray(q);
                            return (
                                <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                    <div className="flex justify-between mb-4">
                                        <div className="font-semibold text-gray-900 prose prose-sm max-w-none">
                                            <span className="mr-2">Q{i + 1}.</span>
                                            <SafeMarkdown highlight>{q.contentBody}</SafeMarkdown>
                                        </div>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 h-fit uppercase">
                                            {q.questionType}
                                        </span>
                                    </div>
                                    
                                    {q.questionType !== 'subjective' && (
                                        <div className="space-y-2 mb-4">
                                            {optionsArr.map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-3 p-2 rounded border border-transparent">
                                                    <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                                                        {optIdx + 1}
                                                    </div>
                                                    <span className="text-sm text-gray-700">{opt || '(empty)'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-gray-50 bg-blue-50/30 -mx-6 -mb-6 p-4 rounded-b-xl">
                                        <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Answer Key</div>
                                        <p className="text-sm text-gray-800 font-medium">
                                            Correct: {getDisplayAnswer(q)}
                                        </p>
                                        {q.questionType === 'subjective' && q.subjectiveAnswer && (
                                            <div className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border">
                                                <span className="font-semibold">Model Answer:</span> {q.subjectiveAnswer}
                                            </div>
                                        )}
                                        <p className="text-sm text-gray-600 mt-2 italic">
                                            <span className="font-semibold not-italic">Explanation:</span> {q.answerExplanation}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
