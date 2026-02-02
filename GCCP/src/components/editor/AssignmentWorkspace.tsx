'use client';
import { useState, useEffect } from 'react';
import { Download, Table, Eye, Plus, Trash } from 'lucide-react';
import { AssignmentItem, generateCSV } from '@/types/assignment';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';

export function AssignmentWorkspace({ jsonContent, onUpdate }: { jsonContent: string, onUpdate: (s: string) => void }) {
    const [view, setView] = useState<'table' | 'reference'>('table');
    const [questions, setQuestions] = useState<AssignmentItem[]>([]);

    useEffect(() => {
        try {
            if (jsonContent) {
                const parsed = JSON.parse(jsonContent);
                // The Formatter now returns AssignmentItem[] directly
                if (Array.isArray(parsed)) {
                    setQuestions(parsed);
                }
            }
        } catch (e) {
            // Ignore parse errors while streaming
        }
    }, [jsonContent]);

    const handleDownloadCSV = () => {
        const csv = generateCSV(questions);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assignment.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const updateQuestion = (index: number, field: keyof AssignmentItem | string, value: any) => {
        const newQuestions = [...questions];
        const question = { ...newQuestions[index] };

        // Handle nested options update
        if (field.startsWith('option.')) {
            const optionKey = parseInt(field.split('.')[1]) as 1 | 2 | 3 | 4;
            question.options = { ...question.options, [optionKey]: value };
        } else {
            (question as any)[field] = value;
        }

        newQuestions[index] = question;
        setQuestions(newQuestions);
        // Debounce this eventually, but for now update on every change
        onUpdate(JSON.stringify(newQuestions));
    };

    return (
        <div className="flex flex-col h-full font-sans bg-white transition-all duration-150">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex bg-gray-200/50 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('table')} 
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 transform-gpu active:scale-95 flex items-center gap-1 ${view === 'table' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Table size={14} /> Table Editor
                    </button>
                    <button 
                        onClick={() => setView('reference')} 
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 transform-gpu active:scale-95 flex items-center gap-1 ${view === 'reference' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Eye size={14} /> Reference View
                    </button>
                </div>
                <button 
                    onClick={handleDownloadCSV} 
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all duration-150 transform-gpu active:scale-95"
                >
                    <Download size={14} /> Export CSV
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white">
                {view === 'table' ? (
                    <div className="h-full overflow-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="sticky top-0 z-10 bg-gray-50 backdrop-blur-sm border-b border-gray-200">
                                <tr>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase w-24">Type</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase w-64">Question (Markdown)</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase w-32">Option 1</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase w-32">Option 2</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase w-32">Option 3</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase w-32">Option 4</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase w-24">Correct</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase w-48">Explanation (Markdown)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {questions.map((q, i) => (
                                    <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="p-2 align-top">
                                            <select 
                                                value={q.questionType} 
                                                onChange={(e) => updateQuestion(i, 'questionType', e.target.value)}
                                                className="w-full text-xs p-1.5 border border-gray-200 rounded bg-white text-gray-900 outline-none focus:border-blue-500"
                                            >
                                                <option value="mcsc">MCSC</option>
                                                <option value="mcmc">MCMC</option>
                                                <option value="subjective">Subj.</option>
                                            </select>
                                        </td>
                                        <td className="p-2 align-top">
                                            <textarea 
                                                value={q.contentBody}
                                                onChange={(e) => updateQuestion(i, 'contentBody', e.target.value)}
                                                className="w-full h-20 text-xs p-2 border border-gray-200 rounded bg-white text-gray-900 resize-none outline-none focus:border-blue-500 font-mono"
                                                placeholder="Question text..."
                                            />
                                        </td>
                                        
                                        {/* Options 1-4 */}
                                        {[1, 2, 3, 4].map(optKey => (
                                            <td key={optKey} className="p-2 align-top">
                                                {q.questionType !== 'subjective' ? (
                                                    <textarea 
                                                        value={q.options[optKey as 1|2|3|4]}
                                                        onChange={(e) => updateQuestion(i, `option.${optKey}`, e.target.value)}
                                                        className="w-full h-20 text-xs p-2 border border-gray-200 rounded bg-gray-50 text-gray-700 resize-none outline-none focus:border-blue-500 focus:bg-white"
                                                        placeholder={`Option ${optKey}`}
                                                    />
                                                ) : (
                                                    <div className="h-20 flex items-center justify-center text-[10px] text-gray-300 border border-transparent border-dashed rounded bg-gray-50/50">
                                                        N/A
                                                    </div>
                                                )}
                                            </td>
                                        ))}

                                        <td className="p-2 align-top">
                                            {q.questionType === 'mcsc' ? (
                                                <input 
                                                    type="number" min="1" max="4"
                                                    value={q.mcscAnswer || ''}
                                                    onChange={(e) => updateQuestion(i, 'mcscAnswer', parseInt(e.target.value) || undefined)}
                                                    className="w-full text-xs p-1.5 border border-emerald-200 rounded bg-emerald-50 text-emerald-800 font-bold text-center outline-none focus:border-emerald-500"
                                                    placeholder="1-4"
                                                />
                                            ) : q.questionType === 'mcmc' ? (
                                                <input 
                                                    value={q.mcmcAnswer || ''}
                                                    onChange={(e) => updateQuestion(i, 'mcmcAnswer', e.target.value)}
                                                    className="w-full text-xs p-1.5 border border-emerald-200 rounded bg-emerald-50 text-emerald-800 font-bold text-center outline-none focus:border-emerald-500"
                                                    placeholder="e.g. 1,3"
                                                />
                                            ) : (
                                                 <div className="text-[10px] text-gray-400 text-center italic mt-2">See Model Ans</div>
                                            )}
                                        </td>

                                        <td className="p-2 align-top">
                                            <textarea
                                                value={q.answerExplanation}
                                                onChange={(e) => updateQuestion(i, 'answerExplanation', e.target.value)}
                                                className="w-full h-20 text-xs p-2 border border-gray-200 rounded bg-white text-gray-600 resize-none outline-none focus:border-blue-500"
                                                placeholder="Explanation..."
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {questions.length === 0 && (
                            <div className="text-center py-20 text-gray-400">
                                No questions generated yet.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-8 bg-white">
                        <div className="max-w-4xl mx-auto space-y-12">
                            {questions.map((q, i) => (
                                <div key={i} className="space-y-4 pb-8 border-b border-gray-100 last:border-0">
                                    <div className="flex gap-4">
                                        <span className="font-bold text-gray-400 text-lg select-none">{i+1}.</span>
                                        <div className="flex-1 space-y-4">
                                            {/* Question Body */}
                                            <div className="prose max-w-none text-gray-900">
                                                <SafeMarkdown highlight>
                                                    {q.contentBody}
                                                </SafeMarkdown>
                                            </div>
                                            
                                            {/* Options */}
                                            {(q.questionType === 'mcsc' || q.questionType === 'mcmc') && (
                                                <div className="grid grid-cols-1 gap-2 pl-4">
                                                    {[1, 2, 3, 4].map((optNum) => {
                                                        const optionText = q.options[optNum as 1|2|3|4];
                                                        const isCorrect = 
                                                            (q.questionType === 'mcsc' && q.mcscAnswer === optNum) ||
                                                            (q.questionType === 'mcmc' && q.mcmcAnswer?.includes(String(optNum)));
                                                        
                                                        return (
                                                            <div key={optNum} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
                                                                <div className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-medium ${isCorrect ? 'border-emerald-500 text-emerald-700 bg-emerald-100' : 'border-gray-300 text-gray-500'}`}>
                                                                    {String.fromCharCode(64 + optNum)}
                                                                </div>
                                                                <span className={`text-sm ${isCorrect ? 'text-emerald-900' : 'text-gray-700'}`}>
                                                                    {optionText}
                                                                </span>
                                                                {isCorrect && <span className="ml-auto text-xs font-medium text-emerald-600 uppercase tracking-wider">Correct</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            
                                            {/* Subjective Note */}
                                            {q.questionType === 'subjective' && (
                                                 <div className="pl-4 p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-500 italic">
                                                    Subjective question - answer in your own words.
                                                 </div>
                                            )}

                                            {/* Explanation & Answer (Always Visible) */}
                                            <div className="mt-6 space-y-4 pl-4 border-l-2 border-blue-100">
                                                <div className="space-y-2">
                                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Explanation</span>
                                                    <div className="prose max-w-none text-sm text-gray-600 bg-blue-50/50 p-4 rounded-lg">
                                                        <SafeMarkdown highlight>
                                                            {q.answerExplanation}
                                                        </SafeMarkdown>
                                                    </div>
                                                </div>

                                                {q.subjectiveAnswer && (
                                                    <div className="space-y-2">
                                                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Model Answer</span>
                                                        <div className="prose max-w-none text-sm text-gray-600 bg-emerald-50/50 p-4 rounded-lg">
                                                            <SafeMarkdown highlight>
                                                                {q.subjectiveAnswer}
                                                            </SafeMarkdown>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
