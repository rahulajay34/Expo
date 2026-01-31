import { Download, Table, Eye } from 'lucide-react';
import { useState, useMemo } from 'react';
import { 
    AssignmentItem, 
    LegacyAssignmentQuestion, 
    convertLegacyToAssignmentItem,
    generateCSV 
} from '@/types/assignment';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';

interface AssignmentViewProps {
    jsonContent: string;
}

/**
 * Normalize questions from either legacy or new format to AssignmentItem[]
 */
function normalizeQuestions(parsed: any[]): AssignmentItem[] {
    if (!Array.isArray(parsed) || parsed.length === 0) {
        return [];
    }
    
    // Detect format by checking first item
    const first = parsed[0];
    
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

export function AssignmentView({ jsonContent }: AssignmentViewProps) {
    const [view, setView] = useState<'table' | 'student'>('table');
    
    // Parse and normalize questions with memoization
    const { questions, parseError } = useMemo(() => {
        try {
            const parsed = JSON.parse(jsonContent);
            return { questions: normalizeQuestions(parsed), parseError: null };
        } catch (e) {
            return { questions: [], parseError: 'Error parsing assignment data.' };
        }
    }, [jsonContent]);
    
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
                <button 
                    onClick={downloadCSV}
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                    <Download size={14} /> Download CSV
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {view === 'table' ? (
                    <div className="border rounded-lg overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[800px]">
                            <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                                <tr>
                                    <th className="p-3 w-20">Type</th>
                                    <th className="p-3">Question</th>
                                    <th className="p-3 w-32">Option 1</th>
                                    <th className="p-3 w-32">Option 2</th>
                                    <th className="p-3 w-32">Option 3</th>
                                    <th className="p-3 w-32">Option 4</th>
                                    <th className="p-3 w-24">Answer</th>
                                    <th className="p-3">Explanation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {questions.map((q, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className="p-3 font-mono text-xs text-gray-500 uppercase">{q.questionType}</td>
                                        <td className="p-3 max-w-xs">
                                            <div className="prose prose-sm max-w-none">
                                                <SafeMarkdown highlight>{q.contentBody}</SafeMarkdown>
                                            </div>
                                        </td>
                                        <td className="p-3 text-xs text-gray-600">{q.options[1] || '-'}</td>
                                        <td className="p-3 text-xs text-gray-600">{q.options[2] || '-'}</td>
                                        <td className="p-3 text-xs text-gray-600">{q.options[3] || '-'}</td>
                                        <td className="p-3 text-xs text-gray-600">{q.options[4] || '-'}</td>
                                        <td className="p-3 font-medium text-emerald-600 text-xs">
                                            {getDisplayAnswer(q)}
                                        </td>
                                        <td className="p-3 text-gray-500 max-w-xs text-xs" title={q.answerExplanation}>
                                            {q.answerExplanation.substring(0, 80)}...
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
